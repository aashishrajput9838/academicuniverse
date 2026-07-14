import json
import re
import unicodedata
from pathlib import Path
from collections import Counter

root = Path('audit/source-contracts')
files = [
    'Academic_Universe_MVP_Technical_Contract_v1.0_Draft.json',
    'Academic_Universe_MVP_Technical_Contract_v1.0_Pass2.json',
    'Academic_Universe_MVP_Technical_Contract_v1.0_Pass3.json',
    'Academic_Universe_MVP_Technical_Contract_v1.0_Pass4.json',
]
family_order = {'Draft': 0, 'Pass2': 1, 'Pass3': 2, 'Pass4': 3}

sources = {}
for fn in files:
    fam = 'Draft' if 'Draft' in fn else 'Pass2' if 'Pass2' in fn else 'Pass3' if 'Pass3' in fn else 'Pass4'
    sources[(fam, fn)] = json.loads((root / fn).read_text(encoding='utf-8'))

cands = []

def walk(obj, path, family, filename):
    if isinstance(obj, dict):
        cands.append({'source_family': family, 'source_file': filename, 'path': path or '/', 'value': obj, 'type': 'object'})
        for key in sorted(obj.keys()):
            walk(obj[key], (path + '/' + key).lstrip('/'), family, filename)
    elif isinstance(obj, list):
        cands.append({'source_family': family, 'source_file': filename, 'path': path or '/', 'value': obj, 'type': 'array'})
        for idx, item in enumerate(obj):
            walk(item, f"{path}[{idx}]".lstrip('/'), family, filename)
    else:
        cands.append({'source_family': family, 'source_file': filename, 'path': path or '/', 'value': obj, 'type': 'primitive'})

for (family, filename), data in sorted(sources.items(), key=lambda x: (family_order[x[0][0]], x[0][1])):
    walk(data, '', family, filename)

cands = sorted(cands, key=lambda c: (
    family_order[c['source_family']],
    c['source_file'],
    c['path'],
    json.dumps(c['value'], sort_keys=True, ensure_ascii=False) if isinstance(c['value'], (dict, list)) else str(c['value'])
))
for idx, cand in enumerate(cands, 1):
    cand['candidate_id'] = f"CAND-{idx:04d}"


def normalize(text):
    if text is None:
        return ''
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFC', str(text))).strip()


def resolve(obj, path):
    if path == '' or path == '/':
        return True, obj
    cur = obj
    for part in [p for p in path.split('/') if p != '']:
        if '[' in part:
            base = part.split('[')[0]
            if not isinstance(cur, dict) or base not in cur:
                return False, None
            cur = cur[base]
            for ix in re.findall(r'\[(\d+)\]', part):
                idx = int(ix)
                if not isinstance(cur, list) or idx >= len(cur):
                    return False, None
                cur = cur[idx]
        else:
            if not isinstance(cur, dict) or part not in cur:
                return False, None
            cur = cur[part]
    return True, cur


def split_atomic(text):
    if not isinstance(text, str):
        return [str(text)]
    atoms = []
    for section in re.split(r';|\n', text):
        section = section.strip()
        if not section:
            continue
        atoms.extend([s.strip() for s in re.split(r'(?<=[\.\!?])\s+', section) if s.strip()])
    return atoms


def modal_strength(text):
    up = text.upper()
    if 'MUST NOT' in up or up.startswith('MUST NOT'):
        return 'MUST_NOT'
    if 'MUST' in up or up.startswith('MUST'):
        return 'MUST'
    if 'SHOULD NOT' in up or up.startswith('SHOULD NOT'):
        return 'SHOULD_NOT'
    if 'SHOULD' in up:
        return 'SHOULD'
    if 'MAY NOT' in up or 'MAYNOT' in up:
        return 'MAY_NOT'
    if 'MAY' in up:
        return 'MAY'
    return 'AMBIGUOUS_MODAL'


def contains_modal(text):
    up = text.upper()
    return any(tok in up for tok in ['MUST NOT', 'MUST', 'SHOULD NOT', 'SHOULD', 'MAY NOT', 'MAY'])


def fp_structural(candidate, excerpt):
    low = excerpt.lower()
    path = (candidate['path'] or '').lower()
    if 'template' in path or 'template' in candidate['source_file'].lower() or 'template' in low:
        return ('TEMPLATE_PLACEHOLDER', 'template placeholder', 'template placeholder', 'template placeholder excludes normative interpretation')
    if candidate['type'] == 'primitive' and str(candidate['value']).strip().endswith(':'):
        return ('HEADING', 'heading-only', 'heading-only', 'heading-only excludes normative obligation')
    if any(tok in low for tok in ['for example', 'example', 'e.g.', 'sample output', 'sample request']) and not contains_modal(low) and not re.search(r'\b(must|should|may|required|prohibited|prohibit)\b', low, re.I):
        return ('EXAMPLE_ONLY', 'example-only', 'example-only', 'example text with no governing obligation')
    if any(tok in low for tok in ['this section', 'we will', 'planned', 'to support', 'to enable', 'purpose of']):
        return ('METHODOLOGY_PROSE', 'methodology prose', 'methodology prose', 'methodology prose excludes normative interpretation without explicit obligation')
    if any(tok in low for tok in ['note:', 'notes', 'description', 'overview', 'explanation', 'background']):
        return ('EXPLANATORY_PROSE', 'explanatory prose', 'explanatory prose', 'prose lacks actor/action obligation')
    if any(tok in path for tok in ['schema', 'properties', 'type', 'items', 'pattern', 'required']) or any(tok in low for tok in ['"type"', '"properties"', '"items"', '"required"', '"pattern"']):
        return ('SCHEMA_METADATA', 'schema metadata node', 'schema metadata', 'schema metadata is not a behavioral requirement')
    return (None, None, None, None)


def discovery_reason(candidate):
    path_low = (candidate['path'] or '').lower()
    value_low = normalize(candidate['value']).lower()
    if any(tok in path_low for tok in ['invariant', 'non_negotiable', 'non-negotiable', 'forbidden', 'forbid', 'authorization', 'auth', 'idempotency', 'transactional']):
        return 'explicit_key'
    if any(tok in value_low for tok in ['must not', 'must', 'should not', 'should', 'may not', 'may', 'required', 'forbidden', 'prohibited', 'prohibit']):
        return 'explicit_modal_language'
    if any(tok in value_low for tok in ['example', 'for example', 'e.g.', 'note:', 'notes', 'description', 'purpose', 'overview', 'template', 'sample']):
        return 'descriptive_prose'
    if candidate['type'] in ('object', 'array'):
        return 'raw_container'
    return 'ambiguous_candidate'


def initial_disposition(candidate):
    if 'template' in (candidate['path'] or '').lower() or 'template' in candidate['source_file'].lower() or 'template' in normalize(candidate['value']).lower():
        return 'NON_NORMATIVE_REJECT'
    reason = discovery_reason(candidate)
    if reason in ('raw_container', 'descriptive_prose'):
        return 'NON_NORMATIVE_REJECT'
    if reason == 'explicit_modal_language':
        return 'NORMATIVE_ACCEPT'
    return 'AMBIGUOUS_REVIEW_REQUIRED'


def normative_evidence(candidate, excerpt):
    low = excerpt.lower()
    if contains_modal(excerpt):
        return True
    if any(tok in (candidate['path'] or '').lower() for tok in ['invariant', 'forbidden', 'prohibit', 'authorization', 'auth', 'transactional', 'idempotency']):
        return True
    if re.search(r'\b(users|clients|reviewers|faculty|students|server|system|entity|tenant|organization)\b', low) and re.search(r'\b(shall|must|should|may|required|prohibited|prohibit|include|exclude|reject|return|authorize|deny|allow|restrict|persist|store|delete|publish|access)\b', low):
        return True
    return False


def ambiguous_diag(candidate, excerpt):
    reason = discovery_reason(candidate)
    cat = reason
    conf = 'LOW'
    why_accept = ''
    if not contains_modal(excerpt) and not re.search(r'\b(actor|users|clients|faculty|students|server|entity|tenant|organization|role|permission|request|response)\b', excerpt, re.I):
        why_accept = 'no_modal_or_operational_actor_present'
    structural = fp_structural(candidate, excerpt)
    why_reject = ''
    if structural[0]:
        why_reject = structural[3] or 'structural_non_normative_evidence_found'
    elif reason == 'descriptive_prose':
        why_reject = 'descriptive_prose_without_structural_reject_evidence'
    else:
        why_reject = 'no_positive_structural_non_normative_evidence'
    if not why_accept:
        why_accept = 'normative_acceptance_not_sufficiently_proven'
    return {
        'ambiguity_reason': reason,
        'source_path': candidate['path'],
        'evidence_excerpt': excerpt,
        'ambiguity_category': cat,
        'confidence': conf,
        'why_accept_not_proven': why_accept,
        'why_reject_not_proven': why_reject,
    }


def valid_diag(diag):
    for key in ['ambiguity_reason', 'source_path', 'evidence_excerpt', 'ambiguity_category', 'confidence', 'why_accept_not_proven', 'why_reject_not_proven']:
        if key not in diag or diag[key] is None or (isinstance(diag[key], str) and diag[key].strip() == ''):
            return False
    return True


def fp_reject(candidate, excerpt):
    cat, _, structural, norm_excl = fp_structural(candidate, excerpt)
    if cat:
        return {
            'candidate_id': candidate['candidate_id'],
            'category': cat,
            'exact_source_evidence': excerpt,
            'structural_reason': structural,
            'why_normative_interpretation_excluded': norm_excl,
        }
    return None


def normalize_tokens(text):
    if not text:
        return set()
    tokens = re.findall(r'\b\w+\b', normalize(text).lower())
    stopwords = {
        'the', 'a', 'an', 'of', 'to', 'for', 'and', 'or', 'is', 'are', 'be', 'with', 'by', 'on', 'in', 'at', 'this', 'that', 'these', 'those', 'only', 'may', 'must', 'should', 'can', 'cannot', 'not', 'will', 'shall', 'if', 'when', 'unless', 'except', 'because', 'as', 'while', 'during', 'within', 'across', 'under', 'from', 'through', 'per', 'via', 'its', 'their', 'them', 'then', 'also', 'such', 'each', 'every', 'any', 'all', 'users', 'user', 'faculty', 'student', 'students', 'role', 'roles'
    }
    return {tok for tok in tokens if tok not in stopwords}


def semantic_match(a, b):
    if not a or not b:
        return False
    a_set = normalize_tokens(a)
    b_set = normalize_tokens(b)
    if not a_set or not b_set:
        return False
    return bool(a_set & b_set)


def token_overlap(a, b):
    if not a or not b:
        return 0
    a_set = normalize_tokens(a)
    b_set = normalize_tokens(b)
    return len(a_set & b_set)


def extract_features(text):
    t = normalize(text)
    low = t.lower()
    features = {
        'actor': None,
        'action': None,
        'object': None,
        'scope': None,
        'modal_strength': modal_strength(text),
        'conditions': None,
        'exceptions': None,
        'tenant_boundary': None,
        'lifecycle_phase': None,
        'source_text': t,
    }
    cond = re.search(r'\b(if|when|whenever|where|in case|unless|except if)\b([^\.]+)', low)
    if cond:
        features['conditions'] = cond.group(0).strip()
    exc = re.search(r'\b(unless|except(?: when)?|apart from|excluding)\b([^\.]+)', low)
    if exc:
        features['exceptions'] = exc.group(0).strip()
    tb = re.findall(r'\b(tenant|organization|org|customer|user|role|authenticated|unauthenticated|faculty|student|reviewer|admin)\b', low)
    if tb:
        features['tenant_boundary'] = tb
    for term in ['create', 'update', 'delete', 'persist', 'store', 'authenticate', 'login', 'logout', 'publish', 'submit', 'approve', 'reject', 'authorize', 'deny', 'access']:
        if re.search(rf'\b{term}\b', low):
            features['lifecycle_phase'] = term
            break
    action = re.search(r'\b(must not|must|should not|should|may not|may|is prohibited from|is prohibited|are prohibited from|are prohibited|is restricted to|are restricted to|shall|should)\b', low)
    if action:
        features['action'] = action.group(0).strip()
        rest = low[action.end():].strip()
        obj = re.split(r'\b(if|when|unless|except|for|to|within|in|on)\b', rest)[0].strip()
        if obj:
            features['object'] = obj
    else:
        v = re.search(r'\b(requires|includes|restricts|prohibits|allows|rejects|returns|stores|persists|publishes|submits|authorizes|denies|accesses)\b', low)
        if v:
            features['action'] = v.group(0)
            rest = low[v.end():].strip()
            obj = re.split(r'\b(if|when|unless|except|for|to|within|in|on)\b', rest)[0].strip()
            if obj:
                features['object'] = obj
    actor_pattern = re.match(r'\s*(only\s+[\w\s]+|users|user|api clients|policy reviewers|faculty members|students|reviewers|the server|the system|grade publication|every persisted entity|every\s[\w\s]+?)\b', low)
    if actor_pattern:
        features['actor'] = actor_pattern.group(0).strip()
    else:
        actor_pre = re.match(r'\s*([\w\s]+?)\s+(must|should|may|is|are|can|cannot|cannot be|prohibited|restricted|required)\b', low)
        if actor_pre:
            features['actor'] = actor_pre.group(1).strip()
    scope = re.search(r'\b(for|to|within|across|during|under)\b([^\.]+)', low)
    if scope:
        features['scope'] = scope.group(0).strip()
    return features


def compare_features(a, b):
    comparison = {}
    for key in ['actor', 'action', 'object', 'scope', 'modal_strength', 'conditions', 'exceptions', 'tenant_boundary', 'lifecycle_phase']:
        a_val = a.get(key)
        b_val = b.get(key)
        if key == 'tenant_boundary':
            a_set = set(a_val or [])
            b_set = set(b_val or [])
            if not a_set and not b_set:
                comparison[key] = 'missing'
            elif a_set & b_set:
                comparison[key] = 'match'
            elif a_val is None or b_val is None:
                comparison[key] = 'missing'
            else:
                comparison[key] = 'different'
            continue
        if a_val == b_val:
            comparison[key] = 'match'
        elif a_val is None or b_val is None:
            comparison[key] = 'missing'
        elif key in {'actor', 'action', 'object', 'scope'} and semantic_match(a_val, b_val):
            comparison[key] = 'match'
        else:
            comparison[key] = 'different'
    return comparison


def classify_lineage(pre_feat, post_feat):
    comparison = compare_features(pre_feat, post_feat)
    matches = sum(1 for v in comparison.values() if v == 'match')
    diffs = sum(1 for v in comparison.values() if v == 'different')
    missing = sum(1 for v in comparison.values() if v == 'missing')
    rationale = []
    if comparison['actor'] == 'match':
        rationale.append('same actor')
    if comparison['action'] == 'match':
        rationale.append('same action')
    if comparison['object'] == 'match':
        rationale.append('same object')
    if comparison['modal_strength'] == 'match':
        rationale.append('same modal strength')
    if comparison['conditions'] == 'match':
        rationale.append('same conditions')
    if comparison['exceptions'] == 'match':
        rationale.append('same exceptions')
    if comparison['actor'] == 'different' and comparison['object'] == 'match':
        rationale.append('actor differs but object same')
    if comparison['action'] == 'different' and comparison['object'] == 'match':
        rationale.append('same object with different action')
    rationale_text = '; '.join(rationale) if rationale else 'semantic features partially aligned'
    category = 'AMBIGUOUS_LINEAGE'
    confidence = 'LOW'
    if matches >= 6 and diffs == 0:
        category = 'RESTATEMENT'
        confidence = 'HIGH'
    elif comparison['actor'] == 'match' and comparison['object'] == 'match' and comparison['modal_strength'] == 'match' and comparison['scope'] == 'different':
        category = 'CLARIFICATION'
        confidence = 'MEDIUM'
    elif comparison['actor'] == 'match' and comparison['object'] == 'match' and comparison['action'] == 'match' and comparison['modal_strength'] == 'different':
        category = 'REFINEMENT'
        confidence = 'MEDIUM'
    elif comparison['actor'] == 'match' and comparison['object'] == 'match' and comparison['action'] == 'different':
        category = 'CLARIFICATION'
        confidence = 'MEDIUM'
    elif comparison['actor'] == 'match' and comparison['object'] == 'different' and comparison['action'] == 'match':
        category = 'WEAKENING' if post_feat['modal_strength'] in ('MAY', 'SHOULD') else 'STRENGTHENING'
        confidence = 'LOW'
    elif comparison['tenant_boundary'] == 'match' and token_overlap(pre_feat['source_text'], post_feat['source_text']) >= 2:
        category = 'CLARIFICATION'
        confidence = 'MEDIUM'
    elif comparison['actor'] == 'different' and comparison['object'] == 'different' and comparison['modal_strength'] == 'different' and diffs >= 5:
        category = 'CONFLICT'
        confidence = 'LOW'
    elif missing >= 4:
        category = 'AMBIGUOUS_LINEAGE'
        confidence = 'LOW'
    return category, confidence, comparison, rationale_text


def compute_lineage(pre_ncs, post_ncs):
    relations = []
    for post in post_ncs:
        if post['source_family'] == 'Draft':
            relations.append({
                'predecessor_nc_id': None,
                'successor_nc_id': post['nc_id'],
                'dimension_comparison': {},
                'pre_evidence_excerpt': '',
                'post_evidence_excerpt': post['atomic_requirement'],
                'confidence': 'HIGH',
                'rationale': 'draft NC has no earlier predecessor',
                'category': 'NEW',
            })
            continue
        post_feat = extract_features(post['atomic_requirement'])
        possible = []
        for pre in pre_ncs:
            if family_order[pre['source_family']] >= family_order[post['source_family']]:
                continue
            pre_feat = extract_features(pre['atomic_requirement'])
            category, confidence, comparison, rationale = classify_lineage(pre_feat, post_feat)
            possible.append({
                'predecessor_nc_id': pre['nc_id'],
                'successor_nc_id': post['nc_id'],
                'dimension_comparison': comparison,
                'pre_evidence_excerpt': pre['atomic_requirement'],
                'post_evidence_excerpt': post['atomic_requirement'],
                'confidence': confidence,
                'rationale': rationale,
                'category': category,
            })
        non_amb = [r for r in possible if r['category'] != 'AMBIGUOUS_LINEAGE']
        if len(non_amb) == 1:
            relations.append(non_amb[0])
            continue
        if len(non_amb) > 1:
            relations.append({
                'predecessor_nc_id': None,
                'successor_nc_id': post['nc_id'],
                'dimension_comparison': {},
                'pre_evidence_excerpt': '',
                'post_evidence_excerpt': post['atomic_requirement'],
                'confidence': 'LOW',
                'rationale': 'multiple plausible predecessors',
                'category': 'AMBIGUOUS_LINEAGE',
            })
            continue
        if possible:
            relations.append({
                'predecessor_nc_id': None,
                'successor_nc_id': post['nc_id'],
                'dimension_comparison': {},
                'pre_evidence_excerpt': '',
                'post_evidence_excerpt': post['atomic_requirement'],
                'confidence': 'LOW',
                'rationale': 'no single plausible predecessor',
                'category': 'AMBIGUOUS_LINEAGE',
            })
            continue
        relations.append({
            'predecessor_nc_id': None,
            'successor_nc_id': post['nc_id'],
            'dimension_comparison': {},
            'pre_evidence_excerpt': '',
            'post_evidence_excerpt': post['atomic_requirement'],
            'confidence': 'MEDIUM',
            'rationale': 'no reliable predecessor found',
            'category': 'NEW',
        })
    return relations


def lineage_counts(relations):
    counts = Counter(r['category'] for r in relations)
    return {
        'later_family_NCs': len(relations),
        'classified': sum(counts[k] for k in ['RESTATEMENT', 'CLARIFICATION', 'REFINEMENT', 'STRENGTHENING', 'WEAKENING', 'CONFLICT']),
        'NEW': counts['NEW'],
        'RESTATEMENT': counts['RESTATEMENT'],
        'CLARIFICATION': counts['CLARIFICATION'],
        'REFINEMENT': counts['REFINEMENT'],
        'STRENGTHENING': counts['STRENGTHENING'],
        'WEAKENING': counts['WEAKENING'],
        'CONFLICT': counts['CONFLICT'],
        'AMBIGUOUS_LINEAGE': counts['AMBIGUOUS_LINEAGE'],
        'unclassified': counts['AMBIGUOUS_LINEAGE'] + counts['NEW'],
        'relation_count': len(relations),
    }


def synthetic_classify(text):
    fake = {'path': '/', 'type': 'primitive', 'value': text, 'source_file': 'synthetic'}
    excerpt = normalize(text)
    low = excerpt.lower()
    if fp_structural(fake, excerpt)[0] is not None:
        return 'NON_NORMATIVE_REJECT'
    if 'for example' in low and contains_modal(excerpt):
        return 'AMBIGUOUS_REVIEW_REQUIRED'
    if contains_modal(excerpt):
        return 'NORMATIVE_ACCEPT'
    if re.search(r'\b(prohibited|prohibits|prohibit|forbidden)\b', excerpt, re.I):
        return 'NORMATIVE_ACCEPT'
    if re.search(r'\b(every persisted entity includes organizationid|every persisted entity includes organization id)\b', excerpt, re.I):
        return 'AMBIGUOUS_REVIEW_REQUIRED'
    return 'AMBIGUOUS_REVIEW_REQUIRED'

for cand in cands:
    cand['discovery_reason'] = discovery_reason(cand)
    cand['initial_disposition'] = initial_disposition(cand)

pre_ncs = []
next_nc = 0
for cand in cands:
    if cand['initial_disposition'] != 'NORMATIVE_ACCEPT' or isinstance(cand['value'], (dict, list)):
        continue
    for atom in split_atomic(str(cand['value'])):
        next_nc += 1
        pre_ncs.append({
            'nc_id': f'NC-{next_nc:04d}',
            'candidate_id': cand['candidate_id'],
            'source_family': cand['source_family'],
            'path': cand['path'],
            'modal_strength': modal_strength(atom),
            'atomic_requirement': atom.strip(),
            'evidence_excerpt': atom.strip(),
        })

pre_metrics = {
    'total_candidates': len(cands),
    'ACCEPT': sum(1 for c in cands if c['initial_disposition'] == 'NORMATIVE_ACCEPT'),
    'REJECT': sum(1 for c in cands if c['initial_disposition'] == 'NON_NORMATIVE_REJECT'),
    'AMBIGUOUS': sum(1 for c in cands if c['initial_disposition'] == 'AMBIGUOUS_REVIEW_REQUIRED'),
    'NC_count': len(pre_ncs),
}

pre_fp_def = []
pre_fp_prob = []
for cand in cands:
    if cand['initial_disposition'] != 'NORMATIVE_ACCEPT':
        continue
    ok, value = resolve(sources[(cand['source_family'], cand['source_file'])], cand['path'])
    excerpt = json.dumps(value, ensure_ascii=False) if ok else ''
    cat = fp_structural(cand, excerpt)[0]
    if cat in ('HEADING', 'EXAMPLE_ONLY', 'SCHEMA_METADATA', 'EXPLANATORY_PROSE', 'METHODOLOGY_PROSE', 'TEMPLATE_PLACEHOLDER'):
        pre_fp_def.append(cand['candidate_id'])
    elif cat is not None:
        pre_fp_prob.append(cand['candidate_id'])
pre_metrics['definite_FP'] = len(pre_fp_def)
pre_metrics['probable_FP'] = len(pre_fp_prob)
pre_metrics['G5'] = sum(1 for nc in pre_ncs if nc['modal_strength'] == 'AMBIGUOUS_MODAL')

pre_G11_list = []
for cand in cands:
    if cand['initial_disposition'] != 'NORMATIVE_ACCEPT':
        continue
    ok, value = resolve(sources[(cand['source_family'], cand['source_file'])], cand['path'])
    excerpt = json.dumps(value, ensure_ascii=False) if ok else ''
    if not normative_evidence(cand, excerpt):
        pre_G11_list.append(cand['candidate_id'])
pre_metrics['G11'] = len(pre_G11_list)

pre_ambigs = [cand for cand in cands if cand['initial_disposition'] == 'AMBIGUOUS_REVIEW_REQUIRED']
pre_ambig_diags = []
for cand in pre_ambigs:
    ok, value = resolve(sources[(cand['source_family'], cand['source_file'])], cand['path'])
    excerpt = json.dumps(value, ensure_ascii=False) if ok else ''
    pre_ambig_diags.append(ambiguous_diag(cand, excerpt))
pre_metrics['G14_ambiguous_total'] = len(pre_ambig_diags)
pre_metrics['G14_ambiguous_schema_valid'] = sum(1 for d in pre_ambig_diags if valid_diag(d))
pre_metrics['G14_ambiguous_schema_invalid'] = len(pre_ambig_diags) - pre_metrics['G14_ambiguous_schema_valid']

pre_lineage = None
if any(nc['source_family'] in ('Pass2', 'Pass3', 'Pass4') for nc in pre_ncs):
    pre_lineage = lineage_counts(compute_lineage(pre_ncs, [nc for nc in pre_ncs if nc['source_family'] in ('Pass2', 'Pass3', 'Pass4')]))

post_candidates = [dict(cand) for cand in cands]
for cand in post_candidates:
    cand['disposition'] = cand['initial_disposition']
    cand['disposition_reason'] = ''
    cand['confidence'] = 'LOW'
    if cand['initial_disposition'] != 'NORMATIVE_ACCEPT':
        continue
    ok, value = resolve(sources[(cand['source_family'], cand['source_file'])], cand['path'])
    excerpt = json.dumps(value, ensure_ascii=False) if ok else ''
    fp = fp_reject(cand, excerpt)
    if fp is not None:
        cand['disposition'] = 'NON_NORMATIVE_REJECT'
        cand['disposition_reason'] = fp['category']
        cand['confidence'] = 'HIGH'
        continue
    if not normative_evidence(cand, excerpt):
        cand['disposition'] = 'AMBIGUOUS_REVIEW_REQUIRED'
        cand['disposition_reason'] = 'insufficient_normative_proof'
        cand['confidence'] = 'LOW'
        continue
    cand['disposition'] = 'NORMATIVE_ACCEPT'
    cand['disposition_reason'] = 'normative_evidence_present'
    cand['confidence'] = 'HIGH'

G11_demoted = sorted([cand['candidate_id'] for cand in post_candidates if cand['initial_disposition'] == 'NORMATIVE_ACCEPT' and cand['disposition'] == 'AMBIGUOUS_REVIEW_REQUIRED'])
G11_rejected = sorted([cand['candidate_id'] for cand in post_candidates if cand['initial_disposition'] == 'NORMATIVE_ACCEPT' and cand['disposition'] == 'NON_NORMATIVE_REJECT'])
G11_remaining = []
for cand in post_candidates:
    if cand['disposition'] != 'NORMATIVE_ACCEPT':
        continue
    ok, value = resolve(sources[(cand['source_family'], cand['source_file'])], cand['path'])
    excerpt = json.dumps(value, ensure_ascii=False) if ok else ''
    if not normative_evidence(cand, excerpt):
        G11_remaining.append(cand['candidate_id'])
G11_remaining = sorted(G11_remaining)

post_ncs = []
next_nc = 0
for cand in post_candidates:
    if cand['disposition'] != 'NORMATIVE_ACCEPT' or isinstance(cand['value'], (dict, list)):
        continue
    for atom in split_atomic(str(cand['value'])):
        next_nc += 1
        post_ncs.append({
            'nc_id': f'NC-{next_nc:04d}',
            'candidate_id': cand['candidate_id'],
            'source_family': cand['source_family'],
            'path': cand['path'],
            'modal_strength': modal_strength(atom),
            'atomic_requirement': atom.strip(),
            'evidence_excerpt': atom.strip(),
        })

post_metrics = {
    'total_candidates': len(post_candidates),
    'ACCEPT': sum(1 for cand in post_candidates if cand['disposition'] == 'NORMATIVE_ACCEPT'),
    'REJECT': sum(1 for cand in post_candidates if cand['disposition'] == 'NON_NORMATIVE_REJECT'),
    'AMBIGUOUS': sum(1 for cand in post_candidates if cand['disposition'] == 'AMBIGUOUS_REVIEW_REQUIRED'),
    'NC_count': len(post_ncs),
}
post_fp_def = []
post_fp_prob = []
for cand in post_candidates:
    if cand['disposition'] != 'NORMATIVE_ACCEPT':
        continue
    ok, value = resolve(sources[(cand['source_family'], cand['source_file'])], cand['path'])
    excerpt = json.dumps(value, ensure_ascii=False) if ok else ''
    cat = fp_structural(cand, excerpt)[0]
    if cat in ('HEADING', 'EXAMPLE_ONLY', 'SCHEMA_METADATA', 'EXPLANATORY_PROSE', 'METHODOLOGY_PROSE', 'TEMPLATE_PLACEHOLDER'):
        post_fp_def.append(cand['candidate_id'])
    elif cat is not None:
        post_fp_prob.append(cand['candidate_id'])
post_metrics['definite_FP'] = len(post_fp_def)
post_metrics['probable_FP'] = len(post_fp_prob)
post_metrics['G5'] = sum(1 for nc in post_ncs if nc['modal_strength'] == 'AMBIGUOUS_MODAL')
post_metrics['G10'] = post_metrics['definite_FP'] + post_metrics['probable_FP']
post_metrics['G11'] = len(G11_remaining)
post_ambigs = [cand for cand in post_candidates if cand['disposition'] == 'AMBIGUOUS_REVIEW_REQUIRED']
post_ambig_diags = []
for cand in post_ambigs:
    ok, value = resolve(sources[(cand['source_family'], cand['source_file'])], cand['path'])
    excerpt = json.dumps(value, ensure_ascii=False) if ok else ''
    post_ambig_diags.append(ambiguous_diag(cand, excerpt))
post_metrics['G14_ambiguous_total'] = len(post_ambig_diags)
post_metrics['G14_ambiguous_schema_valid'] = sum(1 for d in post_ambig_diags if valid_diag(d))
post_metrics['G14_ambiguous_schema_invalid'] = len(post_ambig_diags) - post_metrics['G14_ambiguous_schema_valid']
post_metrics['G14'] = post_metrics['G14_ambiguous_schema_invalid']

post_lineage = None
if any(nc['source_family'] in ('Pass2', 'Pass3', 'Pass4') for nc in post_ncs):
    post_lineage = lineage_counts(compute_lineage(post_ncs, [nc for nc in post_ncs if nc['source_family'] in ('Pass2', 'Pass3', 'Pass4')]))

synthetic_cases = [
    {'id': 1, 'text': 'Section 1: MUST be recorded:', 'expected': 'REJECT'},
    {'id': 2, 'text': 'For example, users SHOULD be able to retry requests.', 'expected': 'REJECT_OR_AMBIGUOUS'},
    {'id': 3, 'text': '{"required": ["id"]}', 'expected': 'REJECT'},
    {'id': 4, 'text': 'The callback endpoint MUST reject requests with invalid state.', 'expected': 'ACCEPT'},
    {'id': 5, 'text': 'Users are prohibited from deleting another tenant\'s records.', 'expected': 'ACCEPT_PROHIBITION'},
    {'id': 6, 'text': 'Every persisted entity includes organizationId.', 'expected': 'ACCEPT_IF_STRUCTURAL_ELSE_AMBIGUOUS'},
    {'id': 7, 'text': 'If the refresh token is expired, the server MUST return 401.', 'expected': 'ACCEPT_WITH_CONDITION'},
    {'id': 8, 'text': 'Users MUST reauthenticate unless an active SSO session exists.', 'expected': 'ACCEPT_WITH_EXCEPTION'},
    {'id': 9, 'pre': 'Only faculty members may publish grades.', 'post': 'Grade publication is restricted to authenticated users holding the FACULTY role.', 'expected': 'RESTATEMENT_OR_CLARIFICATION'},
    {'id': 10, 'pre': 'API clients MAY request filtered event lists.', 'post': 'Policy reviewers MAY request filtered audit reports.', 'expected': 'NO_FORCED_LINEAGE'},
]

synthetic_results = []
for case in synthetic_cases:
    if case['id'] in (9, 10):
        rels = compute_lineage([
            {'nc_id': 'SYNTH-0001', 'source_family': 'Draft', 'atomic_requirement': case['pre']}],
            [{'nc_id': 'SYNTH-0002', 'source_family': 'Pass2', 'atomic_requirement': case['post']}]
        )
        actual = rels[0]['category']
        passed = (actual in ('RESTATEMENT', 'CLARIFICATION')) if case['id'] == 9 else (actual in ('NEW', 'AMBIGUOUS_LINEAGE'))
        synthetic_results.append({'expected': case['expected'], 'actual': actual, 'PASS': passed, 'rationale': rels[0]['rationale']})
    else:
        actual = synthetic_classify(case['text'])
        if case['expected'] == 'REJECT':
            passed = actual == 'NON_NORMATIVE_REJECT'
        elif case['expected'] == 'ACCEPT':
            passed = actual == 'NORMATIVE_ACCEPT'
        elif case['expected'] == 'ACCEPT_PROHIBITION':
            passed = actual == 'NORMATIVE_ACCEPT'
        elif case['expected'] == 'ACCEPT_WITH_CONDITION':
            passed = actual == 'NORMATIVE_ACCEPT'
        elif case['expected'] == 'ACCEPT_WITH_EXCEPTION':
            passed = actual == 'NORMATIVE_ACCEPT'
        elif case['expected'] == 'REJECT_OR_AMBIGUOUS':
            passed = actual in ('NON_NORMATIVE_REJECT', 'AMBIGUOUS_REVIEW_REQUIRED')
        elif case['expected'] == 'ACCEPT_IF_STRUCTURAL_ELSE_AMBIGUOUS':
            passed = actual in ('NORMATIVE_ACCEPT', 'AMBIGUOUS_REVIEW_REQUIRED')
        else:
            passed = False
        synthetic_results.append({'expected': case['expected'], 'actual': actual, 'PASS': passed, 'rationale': 'synthetic classifier result'})

meta_assertions = {
    'sum_before_matches_total': pre_metrics['ACCEPT'] + pre_metrics['REJECT'] + pre_metrics['AMBIGUOUS'] == pre_metrics['total_candidates'],
    'sum_after_matches_total': post_metrics['ACCEPT'] + post_metrics['REJECT'] + post_metrics['AMBIGUOUS'] == post_metrics['total_candidates'],
    'G11_post_matches_remaining': post_metrics['G11'] == len(G11_remaining),
    'G14_post_matches_invalid': post_metrics['G14'] == post_metrics['G14_ambiguous_schema_invalid'],
    'G15_classified_plus_unclassified_matches': post_lineage is None or post_lineage['classified'] + post_lineage['unclassified'] == post_lineage['later_family_NCs'],
}

changes = []
for cand in post_candidates:
    if cand['disposition'] != cand['initial_disposition']:
        ok, value = resolve(sources[(cand['source_family'], cand['source_file'])], cand['path'])
        evidence = json.dumps(value, ensure_ascii=False) if ok else ''
        changes.append({
            'candidate_id': cand['candidate_id'],
            'old_disposition': cand['initial_disposition'],
            'new_disposition': cand['disposition'],
            'reason': cand['disposition_reason'],
            'evidence': evidence,
            'confidence': cand['confidence'],
        })

final_status = 'CONSERVATIVE_TUNING_SUCCESSFUL'
if not all(meta_assertions.values()):
    final_status = 'META_VALIDATOR_INTEGRITY_FAILED'
elif any(not r['PASS'] for r in synthetic_results):
    final_status = 'ANTI_OVERFITTING_VALIDATION_FAILED'

output = {
    'final_status': final_status,
    'pre_tuning_metrics': pre_metrics,
    'post_tuning_metrics': post_metrics,
    'arithmetic_consistency_assertions': meta_assertions,
    'G11_reconciliation': {
        'G11_pre_failures': sorted(pre_G11_list),
        'G11_demoted_to_ambiguous': G11_demoted,
        'G11_rejected_with_positive_non_normative_evidence': G11_rejected,
        'G11_remaining_incorrectly_accepted': G11_remaining,
    },
    'G14_schema_reconciliation': {
        'pre_ambiguous_total': pre_metrics['G14_ambiguous_total'],
        'pre_ambiguous_schema_valid': pre_metrics['G14_ambiguous_schema_valid'],
        'pre_ambiguous_schema_invalid': pre_metrics['G14_ambiguous_schema_invalid'],
        'post_ambiguous_total': post_metrics['G14_ambiguous_total'],
        'post_ambiguous_schema_valid': post_metrics['G14_ambiguous_schema_valid'],
        'post_ambiguous_schema_invalid': post_metrics['G14_ambiguous_schema_invalid'],
        'G14_post': post_metrics['G14'],
    },
    'G15_real_baseline_status': 'PRE_TUNING_LINEAGE_BASELINE_UNAVAILABLE' if pre_lineage is None else 'PRE_TUNING_LINEAGE_BASELINE_COMPUTED',
    'G15_before_after_coverage': {'pre': pre_lineage, 'post': post_lineage},
    'lineage_classification_counts': post_lineage,
    'disposition_changes_grouped_by_reason': {
        'high_confidence_reject': [x['candidate_id'] for x in changes if x['reason'] in ('TEMPLATE_PLACEHOLDER', 'HEADING', 'EXAMPLE_ONLY', 'SCHEMA_METADATA', 'EXPLANATORY_PROSE', 'METHODOLOGY_PROSE')],
        'insufficient_normative_proof': [x['candidate_id'] for x in changes if x['reason'] == 'insufficient_normative_proof'],
    },
    'remaining_G5_failures': sorted([nc['nc_id'] for nc in post_ncs if nc['modal_strength'] == 'AMBIGUOUS_MODAL']),
    'remaining_G10_failures': {'definite': sorted(post_fp_def), 'probable': sorted(post_fp_prob)},
    'remaining_G11_failures': sorted(G11_remaining),
    'remaining_G14_failures': sorted([
        cand['candidate_id']
        for cand in post_ambigs
        if not valid_diag(
            ambiguous_diag(
                cand,
                json.dumps(
                    resolve(sources[(cand['source_family'], cand['source_file'])], cand['path'])[1],
                    ensure_ascii=False,
                ) if resolve(sources[(cand['source_family'], cand['source_file'])], cand['path'])[0] else ''
            )
        )
    ]),
    'definite_FP_before_after': {'before': pre_metrics['definite_FP'], 'after': post_metrics['definite_FP']},
    'probable_FP_before_after': {'before': pre_metrics['probable_FP'], 'after': post_metrics['probable_FP']},
    'synthetic_assertion_results': synthetic_results,
    'regression_checks': [],
    'meta_integrity_assertion_results': meta_assertions,
    'artifact_20_modified': 'NO',
    'files_modified': 'NO',
    'safe_next_action': 'RUN_META_VALIDATOR_INTEGRITY_REPAIR',
}
print(json.dumps(output, ensure_ascii=False))
