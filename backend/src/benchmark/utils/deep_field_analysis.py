import json, collections, os

BASE = r'C:\github\academicuniverse.com\academicuniverse\backend\benchmark_reports\run_1785959173886'

# --- Load comparisons ---
with open(os.path.join(BASE, 'comparisons.json'), encoding='utf-8') as f:
    data = json.load(f)
samples = data if isinstance(data, list) else data.get('comparisons', data.get('results', []))

# --- Top fields only (non-subject) ---
field_stats = collections.defaultdict(lambda: {'total': 0, 'matched': 0, 'missing': 0, 'cer_sum': 0.0})
for s in samples:
    for d in s.get('discrepancies', []):
        field = d.get('field', 'unknown')
        if field.startswith('subject['):
            continue
        matched = d.get('matched', False)
        expected = d.get('expected')
        actual = d.get('actual')
        cer = d.get('cer', 0.0) or 0.0
        field_stats[field]['total'] += 1
        field_stats[field]['cer_sum'] += cer
        if matched:
            field_stats[field]['matched'] += 1
        elif (expected is not None and expected != '') and (actual is None or actual == ''):
            field_stats[field]['missing'] += 1

print('=== SCALAR FIELD ANALYSIS (sorted by F1 desc) ===')
rows = []
for field, st in field_stats.items():
    total = st['total']
    matched = st['matched']
    missing = st['missing']
    f1 = matched / total if total > 0 else 0.0
    mean_cer = st['cer_sum'] / total if total > 0 else 0.0
    miss_rate = missing / total if total > 0 else 0.0
    rows.append((field, total, matched, f1, mean_cer, miss_rate))

rows.sort(key=lambda x: -x[3])
print(f'{"FIELD":<30} {"TOTAL":>6} {"MATCH":>6} {"F1":>6} {"CER":>6} {"MISS%":>6}')
for r in rows:
    print(f'{r[0]:<30} {r[1]:>6} {r[2]:>6} {r[3]:>6.2%} {r[4]:>6.2%} {r[5]:>6.2%}')

# --- Category breakdown ---
print('\n=== CATEGORY BREAKDOWN (field-level F1) ===')
cat_fields = collections.defaultdict(lambda: collections.defaultdict(lambda: {'total': 0, 'matched': 0}))
for s in samples:
    doc_type = s.get('documentType', 'unknown')
    for d in s.get('discrepancies', []):
        field = d.get('field', 'unknown')
        if field.startswith('subject['):
            continue
        cat_fields[doc_type][field]['total'] += 1
        if d.get('matched', False):
            cat_fields[doc_type][field]['matched'] += 1

for cat, fields in cat_fields.items():
    total_t = sum(v['total'] for v in fields.values())
    total_m = sum(v['matched'] for v in fields.values())
    print(f'\n  {cat.upper()}: overall F1={total_m/total_t:.2%} ({total_m}/{total_t})')
    for field, v in sorted(fields.items(), key=lambda x: -(x[1]['matched']/max(1,x[1]['total']))):
        f1 = v['matched'] / v['total'] if v['total'] > 0 else 0.0
        print(f'    {field:<30} F1={f1:>6.2%} ({v["matched"]}/{v["total"]})')

# --- Actual vs expected inspection ---
print('\n=== ACTUAL VS EXPECTED SAMPLES (non-missing mismatches) ===')
count = 0
for s in samples:
    for d in s.get('discrepancies', []):
        field = d.get('field', 'unknown')
        if field.startswith('subject['):
            continue
        if d.get('matched', False):
            continue
        actual = d.get('actual', '')
        expected = d.get('expected', '')
        if actual and actual != '' and actual != 'None':
            print(f'  [{s.get("documentType")}] {field}: expected={repr(str(expected)[:40])} | actual={repr(str(actual)[:60])}')
            count += 1
            if count >= 30:
                break
    if count >= 30:
        break
