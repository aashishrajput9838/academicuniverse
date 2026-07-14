import json, os, re
from collections import Counter

root = 'audit/source-contracts'
files = sorted([f for f in os.listdir(root) if f.endswith('.json')])
modal = re.compile(r'\b(MUST|SHOULD|MAY|MUST_NOT|SHOULD_NOT|REQUIRED|FORBID|FORBIDDEN|REQUIRE|MUST NOT|SHOULD NOT)\b', re.I)

# Normative paths or keywords to include
norm_paths = [
    'non_negotiable_invariants',
    'minimum_api_contracts',
    'mentor_retrieval_contract',
    'release_gate',
    'organization_ownership_rules',
    'transaction_boundaries',
    'index_rules',
    'schemas',
    'academic_schemas',
    'fact_identity_contract',
    'authorization_negative_tests',
    'ai_grounding_bundle',
    'deletion_retention_contract',
    'new_hard_invariants',
    'endpoint_catalog',
    'idempotency_contract',
    'transactional_outbox',
    'sprint_acceptance_tests',
    'freeze_blockers',
    'existing_codebase_audit_template'
]

# Exclusion heuristics

def exclusion_reason(path, text):
    if path.endswith('.method') or path.endswith('.path') or path.endswith('.auth') or path.endswith('.fields') or '.fields[' in path:
        return 'PURELY_DESCRIPTIVE'
    if '.examples[' in path or path.endswith('.examples'):
        return 'EXAMPLE_ONLY'
    if path.endswith('.status') or path.endswith('.version') or 'scope_note' in path or path.endswith('.purpose') and not re.search(r'\b(MUST|SHOULD|MAY|MUST_NOT|SHOULD_NOT)\b', text, re.I):
        return 'CONTEXT_ONLY'
    if 'existing_codebase_audit_template.columns' in path or 'existing_codebase_audit_template.allowed_decisions' in path:
        return 'PURELY_DESCRIPTIVE'
    if 'schemas.' in path and (path.endswith('.fields') or '.fields[' in path or path.endswith('.ownership') or path.endswith('.indexes')):
        return 'PURELY_DESCRIPTIVE'
    if 'academic_schemas.' in path and (path.endswith('.fields') or '.fields[' in path or path.endswith('.indexes')):
        return 'PURELY_DESCRIPTIVE'
    if 'fact_identity_contract.examples' in path:
        return 'EXAMPLE_ONLY'
    if 'ai_grounding_bundle.fields' in path or 'ai_grounding_bundle.fact_item' in path:
        return 'PURELY_DESCRIPTIVE'
    if 'endpoint_catalog' in path and (path.endswith('.method') or path.endswith('.path')):
        return 'PURELY_DESCRIPTIVE'
    if path.endswith('.purpose') and re.search(r'\b(MUST|SHOULD|MAY|MUST_NOT|SHOULD_NOT)\b', text, re.I):
        return None
    if path.startswith('minimum_api_contracts') and path.endswith('.purpose'):
        return None
    if any(path == p or path.startswith(p + '.') or path.startswith(p + '[') for p in norm_paths):
        return None
    if modal.search(text):
        return None
    return 'PURELY_DESCRIPTIVE'

candidates = []
excluded = []
for fn in files:
    with open(os.path.join(root, fn), 'r', encoding='utf-8') as f:
        data = json.load(f)
    def walk(o, path=''):
        if isinstance(o, dict):
            for k, v in o.items():
                wp = f'{path}.{k}' if path else k
                walk(v, wp)
        elif isinstance(o, list):
            for i, v in enumerate(o):
                wp = f'{path}[{i}]'
                walk(v, wp)
        else:
            if isinstance(o, str) and o.strip():
                reason = exclusion_reason(path, o)
                item = (fn, path, o.strip())
                if reason is None:
                    candidates.append(item)
                else:
                    excluded.append((fn, path, o.strip(), reason))
    walk(data)
print('TOTAL_CANDIDATE_PROPOSITIONS', len(candidates))
print('TOTAL_EXCLUDED', len(excluded))
print('EXCLUSION_COUNTS', Counter(r for _, _, _, r in excluded))
print('COUNTS_BY_FILE', Counter(fn for fn, _, _ in candidates))
print('\nSAMPLE_INCLUDED')
for item in candidates[:40]:
    print(item)
print('\nSAMPLE_EXCLUDED')
for item in excluded[:40]:
    print(item)
