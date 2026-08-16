import json, os, collections
import pandas as pd

BASE_DIR = r'C:\github\academicuniverse.com\academicuniverse\backend\benchmark_reports\run_1785959173886'
cmp_path = os.path.join(BASE_DIR, 'comparisons.json')

with open(cmp_path, encoding='utf-8') as f:
    data = json.load(f)

samples = data if isinstance(data, list) else data.get('comparisons', data.get('results', []))

# Gather stats per field
field_stats = collections.defaultdict(lambda: {
    'total': 0,
    'matched': 0,
    'missing': 0,
    'ocr_error': 0,
    'hallucination': 0,
    'norm_success': 0,
    'cer_sum': 0.0,
    'wer_sum': 0.0
})

for s in samples:
    for d in s.get('discrepancies', []):
        field = d.get('field', 'unknown')
        matched = d.get('matched', False)
        expected = d.get('expected')
        actual = d.get('actual')
        cer = d.get('cer', 0.0) or 0.0
        wer = d.get('wer', 0.0) or 0.0
        err_cat = d.get('errorCategory', 'NONE')

        st = field_stats[field]
        st['total'] += 1
        st['cer_sum'] += cer
        st['wer_sum'] += wer

        if matched:
            st['matched'] += 1
            st['norm_success'] += 1
        else:
            if (expected is not None and expected != '') and (actual is None or actual == ''):
                st['missing'] += 1
            elif (expected is None or expected == '') and (actual is not None and actual != ''):
                st['hallucination'] += 1
            elif err_cat == 'OCR_ERROR' or cer > 0.5:
                st['ocr_error'] += 1
            elif err_cat == 'PARTIAL_MATCH' or err_cat == 'FORMAT_ERROR':
                # partial normalization/format match
                st['norm_success'] += 0.5

rows = []
for field, st in field_stats.items():
    tot = st['total']
    matched = st['matched']
    missing = st['missing']
    ocr_err = st['ocr_error']
    halluc = st['hallucination']
    norm_succ = st['norm_success']
    
    precision = matched / tot if tot > 0 else 0.0
    recall = matched / tot if tot > 0 else 0.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    
    missing_rate = missing / tot if tot > 0 else 0.0
    ocr_error_rate = ocr_err / tot if tot > 0 else 0.0
    hallucination_rate = halluc / tot if tot > 0 else 0.0
    norm_success_rate = norm_succ / tot if tot > 0 else 0.0
    mean_cer = st['cer_sum'] / tot if tot > 0 else 0.0
    mean_wer = st['wer_sum'] / tot if tot > 0 else 0.0

    # Group classification for clarity
    if field.startswith('subject['):
        field_group = 'Subject Array'
    elif field in ['studentName', 'rollNumber', 'enrollmentNumber', 'degreeName', 'branchName', 'batchYears', 'cgpa', 'issueDate', 'universityName', 'universityCode']:
        field_group = 'Model Schema Covered'
    elif field in ['fatherName', 'motherName', 'dateOfBirth', 'email', 'phone', 'bloodGroup', 'universityTagline']:
        field_group = 'GT-Only Scalar'
    else:
        field_group = 'Evaluation Label'

    rows.append({
        'Field Name': field,
        'Category Group': field_group,
        'Total Comparisons': tot,
        'Matched Count': matched,
        'Precision': round(precision, 4),
        'Recall': round(recall, 4),
        'F1 Score': round(f1, 4),
        'Mean CER': round(mean_cer, 4),
        'Mean WER': round(mean_wer, 4),
        'Missing Rate': round(missing_rate, 4),
        'OCR Error Rate': round(ocr_error_rate, 4),
        'Hallucination Rate': round(hallucination_rate, 4),
        'Normalization Success Rate': round(norm_success_rate, 4),
    })

df = pd.DataFrame(rows)

# Rank fields from easiest to hardest by F1 desc, then Total Comparisons desc
df = df.sort_values(by=['F1 Score', 'Total Comparisons'], ascending=[False, False]).reset_index(drop=True)
df.insert(0, 'Rank (Easiest to Hardest)', df.index + 1)

output_xlsx_path = r'C:\github\academicuniverse.com\academicuniverse\docs\investigation\FIELD_LEVEL_ERROR_ANALYSIS.xlsx'
os.makedirs(os.path.dirname(output_xlsx_path), exist_ok=True)

with pd.ExcelWriter(output_xlsx_path, engine='openpyxl') as writer:
    df.to_excel(writer, sheet_name='Field Error Analysis', index=False)

print(f'Successfully generated: {output_xlsx_path}')
print(f'Total rows in Excel sheet: {len(df)}')
