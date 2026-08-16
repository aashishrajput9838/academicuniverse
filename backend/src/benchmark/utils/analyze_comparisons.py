import json, collections, sys, os

BASE = r'C:\github\academicuniverse.com\academicuniverse\backend\benchmark_reports\run_1785959173886'

# --- Load comparisons ---
cmp_path = os.path.join(BASE, 'comparisons.json')
with open(cmp_path, encoding='utf-8') as f:
    data = json.load(f)

samples = data if isinstance(data, list) else data.get('comparisons', data.get('results', []))
print(f'Total samples: {len(samples)}')
print(f'Keys in first sample: {list(samples[0].keys())}')

# --- Per-field analysis ---
field_stats = collections.defaultdict(lambda: {'total': 0, 'matched': 0, 'missing': 0, 'cer_sum': 0.0, 'wer_sum': 0.0, 'error_cats': collections.Counter()})

for s in samples:
    for d in s.get('discrepancies', []):
        field = d.get('field', 'unknown')
        matched = d.get('matched', False)
        expected = d.get('expected')
        actual = d.get('actual')
        cer = d.get('cer', 0.0) or 0.0
        wer = d.get('wer', 0.0) or 0.0
        err_cat = d.get('errorCategory', 'NONE')

        field_stats[field]['total'] += 1
        field_stats[field]['cer_sum'] += cer
        field_stats[field]['wer_sum'] += wer
        field_stats[field]['error_cats'][err_cat] += 1

        if matched:
            field_stats[field]['matched'] += 1
        elif (expected is not None and expected != '') and (actual is None or actual == ''):
            field_stats[field]['missing'] += 1

print('\n=== PER-FIELD ANALYSIS (sorted by F1 desc) ===')
rows = []
for field, st in field_stats.items():
    total = st['total']
    matched = st['matched']
    missing = st['missing']
    f1 = matched / total if total > 0 else 0.0
    mean_cer = st['cer_sum'] / total if total > 0 else 0.0
    miss_rate = missing / total if total > 0 else 0.0
    top_err = st['error_cats'].most_common(1)[0][0] if st['error_cats'] else 'N/A'
    rows.append((field, total, matched, f1, mean_cer, miss_rate, top_err))

rows.sort(key=lambda x: -x[3])
print(f'{"FIELD":<30} {"TOTAL":>6} {"MATCH":>6} {"F1":>6} {"CER":>6} {"MISS%":>6} TOP_ERR')
for r in rows:
    print(f'{r[0]:<30} {r[1]:>6} {r[2]:>6} {r[3]:>6.2%} {r[4]:>6.2%} {r[5]:>6.2%} {r[6]}')

# --- Count matched vs FIELD_MISSING breakdown ---
print('\n=== OVERALL ERROR TAXONOMY ===')
all_errors = collections.Counter()
for s in samples:
    for d in s.get('discrepancies', []):
        if not d.get('matched', False):
            all_errors[d.get('errorCategory', 'NONE')] += 1
for k, v in all_errors.most_common():
    print(f'  {k}: {v}')

# --- Sample a failed prediction to see what the model actually returned ---
print('\n=== SAMPLE FAILED PREDICTION (first sample with mismatches) ===')
for s in samples[:20]:
    misses = [d for d in s.get('discrepancies', []) if not d.get('matched', False)]
    if misses:
        print(f"SampleId: {s.get('sampleId')}")
        print(f"DocType: {s.get('documentType')}, Profile: {s.get('qualityProfile')}")
        print(f"CategoryMatch: {s.get('categoryMatch')}")
        print(f"Metrics: {s.get('metrics')}")
        print('--- Mismatched fields (first 8) ---')
        for d in misses[:8]:
            print(f"  {d['field']}: expected={repr(str(d.get('expected',''))[:50])} | actual={repr(str(d.get('actual',''))[:50])} | err={d.get('errorCategory')}")
        break
