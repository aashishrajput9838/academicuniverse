import json, os, re, csv
root = 'audit/source-contracts'
files = sorted([f for f in os.listdir(root) if f.endswith('.json')])
modal = re.compile(r'\b(MUST|SHOULD|MAY|MUST_NOT|SHOULD_NOT|REQUIRED|FORBID|FORBIDDEN|REQUIRE|MUST NOT|SHOULD NOT)\b', re.I)
sections = ['non_negotiable_invariants','minimum_api_contracts','mentor_retrieval_contract','release_gate','organization_ownership_rules','transaction_boundaries','index_rules','schemas','academic_schemas','fact_identity_contract','authorization_negative_tests','ai_grounding_bundle','deletion_retention_contract','new_hard_invariants','endpoint_catalog','idempotency_contract','transactional_outbox','sprint_acceptance_tests','freeze_blockers','existing_codebase_audit_template']

def is_norm(p,o):
    if not isinstance(o,str) or not o.strip():
        return False
    if any(p==sec or p.startswith(sec + '.') or p.startswith(sec + '[') for sec in sections):
        return True
    return modal.search(o) is not None

cands=[]
for fn in files:
    with open(os.path.join(root,fn),'r',encoding='utf-8') as f:
        data=json.load(f)
    def walk(o,p=''):
        if isinstance(o, dict):
            for k,v in o.items():
                wp=f'{p}.{k}' if p else k
                walk(v, wp)
        elif isinstance(o, list):
            for i,v in enumerate(o):
                wp=f'{p}[{i}]'
                walk(v, wp)
        else:
            if is_norm(p,o):
                cands.append((fn,p,o.strip()))
    walk(data)
print('CANDIDATE_COUNT', len(cands))
from collections import Counter
cnt=Counter(fn for fn,p,o in cands)
print('BY_FILE', dict(cnt))
# read current ledger
ledger='audit/sprint-1-planning/20_NORMATIVE_CLAUSE_LEDGER.csv'
rows=[]
with open(ledger,newline='',encoding='utf-8') as f:
    reader=csv.DictReader(f)
    for row in reader:
        rows.append(row)
print('LEDGER_ROWS', len(rows))
print('FIRST_MODAL_VALUES', sorted({r['modal_strength'] for r in rows if r.get('modal_strength')}))
print('SOURCE_FAMILIES', sorted({r['source_family'] for r in rows if r.get('source_family')}))
print('MISSING_SOURCE_FAMILY', sum(1 for r in rows if not r.get('source_family')))
print('MISSING_SOURCE_PATH', sum(1 for r in rows if not r.get('source_section_or_json_path')))
print('NOTE_ROWS', [r for r in rows if not r.get('nc_id') or r['nc_id'].startswith('#')][:5])
# compare candidate paths to current ledger
ledger_paths=set((r['source_family'], r['source_file'], r['source_section_or_json_path']) for r in rows)
missing=[]
for fn,p,o in cands:
    src = (fn.replace('Academic_Universe_MVP_Technical_Contract_v1.0_','').replace('.json',''), fn, p)
    # map by filename and path only, not proposition text
    if (src[0], fn, p) not in ledger_paths:
        missing.append((src[0], fn, p, o))
print('MISSING_PATHS', len(missing))
for i in range(min(20, len(missing))):
    print(missing[i])
