import json, os, collections

BASE = r'C:\github\academicuniverse.com\academicuniverse\backend\benchmark_reports\run_1785959173886'

with open(os.path.join(BASE, 'comparisons.json'), encoding='utf-8') as f:
    data = json.load(f)
samples = data if isinstance(data, list) else data.get('comparisons', data.get('results', []))

# Count total GT fields vs matched per sample
scalar_total = 0
scalar_matched = 0
subject_total = 0

by_field = collections.defaultdict(lambda: {'total':0,'matched':0,'missing':0,'corrupted':0,'cer_sum':0.0})

for s in samples:
    for d in s.get('discrepancies', []):
        field = d.get('field','')
        is_subject = field.startswith('subject[')
        matched = d.get('matched', False)
        expected = d.get('expected')
        actual = d.get('actual')
        cer = d.get('cer', 0.0) or 0.0

        if is_subject:
            subject_total += 1
        else:
            scalar_total += 1
            by_field[field]['total'] += 1
            by_field[field]['cer_sum'] += cer
            if matched:
                scalar_matched += 1
                by_field[field]['matched'] += 1
            elif expected not in (None,'') and actual in (None,''):
                by_field[field]['missing'] += 1
            elif expected not in (None,'') and actual not in (None,''):
                # Has actual value but doesn't match - check if corrupted object
                if '[object' in str(actual).lower() or "{'value'" in str(actual):
                    by_field[field]['corrupted'] += 1
                else:
                    pass  # genuine normalization / CER failure

# Count candidateFields corruption
corrupted_total = sum(v['corrupted'] for v in by_field.values())

print(f'=== FIELD COUNT BREAKDOWN ===')
print(f'Total scalar GT field comparisons: {scalar_total}')
print(f'Total subject GT field comparisons: {subject_total}')
print(f'Total all GT field comparisons: {scalar_total + subject_total}')
print(f'Scalar matched: {scalar_matched} ({scalar_matched/scalar_total:.1%})')
print(f'Subject matched: 0 (0.00%)')
print(f'CandidateFields object corruption events: {corrupted_total}')
print(f'\n=== SCALAR FIELD BREAKDOWN ===')
print(f'{"FIELD":<30} {"TOTAL":>6} {"MATCH":>6} {"MISS":>6} {"CORRUPT":>8} {"CER":>6} {"F1":>6}')
for field, v in sorted(by_field.items(), key=lambda x: -x[1]['matched']/max(1,x[1]['total'])):
    f1 = v['matched']/v['total'] if v['total'] > 0 else 0
    cer = v['cer_sum']/v['total'] if v['total'] > 0 else 0
    print(f'{field:<30} {v["total"]:>6} {v["matched"]:>6} {v["missing"]:>6} {v["corrupted"]:>8} {cer:>6.1%} {f1:>6.1%}')

# What would F1 be if subject fields excluded?
print(f'\n=== IF SUBJECTS EXCLUDED FROM EVALUATION ===')
eff_f1 = scalar_matched / scalar_total
print(f'Scalar-only F1 = {eff_f1:.4f} ({eff_f1:.2%})')

# What would F1 be if also GT-only fields excluded (father, mother, DOB, email, phone, blood, tagline, documentType)?
gt_only = ['fatherName','motherName','dateOfBirth','email','phone','bloodGroup','universityTagline','documentType']
restricted_total = sum(v['total'] for f,v in by_field.items() if f not in gt_only)
restricted_matched = sum(v['matched'] for f,v in by_field.items() if f not in gt_only)
print(f'Model-schema-only F1 (10 fields, excl 8 GT-only) = {restricted_matched/restricted_total:.2%}')

# Per doc-type breakdown
print(f'\n=== GT FIELD COUNTS PER DOC TYPE ===')
per_type = collections.defaultdict(lambda: {'scalar_total':0,'scalar_match':0,'subj_total':0})
for s in samples:
    dt = s.get('documentType','?')
    for d in s.get('discrepancies',[]):
        field = d.get('field','')
        matched = d.get('matched',False)
        if field.startswith('subject['):
            per_type[dt]['subj_total'] += 1
        else:
            per_type[dt]['scalar_total'] += 1
            if matched:
                per_type[dt]['scalar_match'] += 1

for dt, v in per_type.items():
    tot = v['scalar_total'] + v['subj_total']
    mat = v['scalar_match']
    f1 = mat / tot if tot > 0 else 0
    print(f'  {dt:<15}: scalar={v["scalar_total"]} subj={v["subj_total"]} total={tot} matched={mat} F1={f1:.2%}')
