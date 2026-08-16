import json, os, collections

RUN_DIR = r'C:\github\academicuniverse.com\academicuniverse\backend\benchmark_reports\run_1786089185995'
cmp_file = os.path.join(RUN_DIR, 'comparisons.json')
pred_file = os.path.join(RUN_DIR, 'predictions.json')

with open(cmp_file, encoding='utf-8') as f:
    comparisons = json.load(f)
with open(pred_file, encoding='utf-8') as f:
    predictions = json.load(f)

print(f'Total comparisons in run_1786089185995: {len(comparisons)}')
print(f'Total predictions in run_1786089185995: {len(predictions)}')

# Audit subject comparisons
subject_total = 0
subject_matched = 0
subject_missing = 0

for c in comparisons:
    for d in c.get('discrepancies', []):
        field = d.get('field', '')
        if field.startswith('subject['):
            subject_total += 1
            if d.get('matched', False):
                subject_matched += 1
            elif d.get('actual') is None or d.get('actual') == '':
                subject_missing += 1

print(f'\n--- CURRENT STORED SUBJECT COMPARISONS ---')
print(f'Total subject field comparisons: {subject_total}')
print(f'Matched: {subject_matched} ({subject_matched/max(1,subject_total):.2%})')
print(f'Missing (actual is None/empty): {subject_missing} ({subject_missing/max(1,subject_total):.2%})')

# Now simulate passing candidateFields.subjects to actualSubjects!
sim_subject_total = 0
sim_subject_matched = 0

pred_by_sample = {p['sampleId']: p for p in predictions}

for c in comparisons:
    sid = c.get('sampleId')
    p = pred_by_sample.get(sid)
    if not p:
        continue
    
    cand = p.get('candidateFields', {})
    act_subjects = cand.get('subjects', []) if isinstance(cand.get('subjects'), list) else []

    # Get expected subjects from discrepancies (or reconstruct)
    exp_subjects_by_idx = collections.defaultdict(dict)
    for d in c.get('discrepancies', []):
        field = d.get('field', '')
        if field.startswith('subject['):
            # field format: subject[idx].attr
            idx_str = field.split('[')[1].split(']')[0]
            attr = field.split('.')[1]
            exp_subjects_by_idx[int(idx_str)][attr] = d.get('expected')

    for idx, exp_obj in exp_subjects_by_idx.items():
        act_obj = act_subjects[idx] if idx < len(act_subjects) else {}
        
        # Check code, grade, credits
        for attr in ['code', 'grade', 'credits']:
            exp_val = str(exp_obj.get(attr) or '').strip().lower()
            act_val = str(act_obj.get(attr) if isinstance(act_obj, dict) else '').strip().lower()
            sim_subject_total += 1
            if exp_val and exp_val == act_val:
                sim_subject_matched += 1

print(f'\n--- SIMULATED SUBJECT COMPARISONS (If candidateFields.subjects passed to evaluator) ---')
print(f'Simulated total subject comparisons: {sim_subject_total}')
print(f'Simulated matched: {sim_subject_matched} ({sim_subject_matched/max(1,sim_subject_total):.2%})')
