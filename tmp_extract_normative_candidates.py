import json
import os
import re
root = 'audit/source-contracts'
files = sorted([fn for fn in os.listdir(root) if fn.endswith('.json')])
modal = re.compile(r'\b(MUST|SHOULD|MAY|MUST_NOT|SHOULD_NOT|REQUIRED|FORBID|FORBIDDEN|REQUIRE|MUST NOT|SHOULD NOT)\b', re.I)
sections = ['non_negotiable_invariants','minimum_api_contracts','mentor_retrieval_contract','release_gate','organization_ownership_rules','transaction_boundaries','index_rules','schemas','academic_schemas','fact_identity_contract','authorization_negative_tests','ai_grounding_bundle','deletion_retention_contract','new_hard_invariants','endpoint_catalog','idempotency_contract','transactional_outbox','sprint_acceptance_tests','freeze_blockers','existing_codebase_audit_template']

def is_norm(p,o):
    if isinstance(o, str) and o.strip():
        if any(p == sec or p.startswith(sec + '.') or p.startswith(sec + '[') for sec in sections):
            return True
        return modal.search(o) is not None
    return False

for fn in files:
    with open(os.path.join(root,fn), 'r', encoding='utf-8') as f:
        data = json.load(f)
    cands = []
    def walk(o, p=''):
        if isinstance(o, dict):
            for k,v in o.items():
                wp = f'{p}.{k}' if p else k
                walk(v, wp)
        elif isinstance(o, list):
            for i,v in enumerate(o):
                wp = f'{p}[{i}]'
                walk(v, wp)
        else:
            if is_norm(p, o):
                cands.append((p, o.strip()))
    walk(data)
    print('FILE', fn, 'CANDIDATES', len(cands))
    for p,o in cands:
        print(p, '::', o)
    print('---')
