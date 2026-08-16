import shutil, os, json

run_dir = r'C:\github\academicuniverse.com\academicuniverse\backend\benchmark_reports\run_1786126246709'
root_dir = r'C:\github\academicuniverse.com\academicuniverse'
res_dir = r'C:\github\academicuniverse.com\academicuniverse\research\statistics\results'
docs_dir = r'C:\github\academicuniverse.com\academicuniverse\docs\investigation'

os.makedirs(res_dir, exist_ok=True)
os.makedirs(docs_dir, exist_ok=True)

# Copy run artifacts to research/statistics/results and root
for f in ['metrics.json', 'comparisons.json', 'predictions.json']:
    sp = os.path.join(run_dir, f)
    if os.path.exists(sp):
        shutil.copy2(sp, os.path.join(root_dir, f))
        shutil.copy2(sp, os.path.join(res_dir, f))
        print('Copied', f, 'to root and research/statistics/results/')

# Generate paired_field_observations.csv
csv_lines = ['sample_id,document_type,quality_profile,field_name,expected_value,predicted_value,matched,cer,wer,error_category']
with open(os.path.join(run_dir, 'comparisons.json'), encoding='utf-8') as f:
    comparisons = json.load(f)

for c in comparisons:
    for d in c.get('discrepancies', []):
        exp_str = str(d.get('expected') or '').replace('"', '""')
        act_str = str(d.get('actual') or '').replace('"', '""')
        sid = c.get('sampleId', '')
        dt = c.get('documentType', '')
        qp = c.get('qualityProfile', '')
        fn = d.get('field', '')
        mt = 1 if d.get('matched') else 0
        cer = d.get('cer', 0)
        wer = d.get('wer', 0)
        ec = d.get('errorCategory', 'NONE')
        csv_lines.append(f'"{sid}","{dt}","{qp}","{fn}","{exp_str}","{act_str}",{mt},{cer},{wer},"{ec}"')

csv_content = '\n'.join(csv_lines)

for p in [os.path.join(root_dir, 'paired_field_observations.csv'), os.path.join(res_dir, 'paired_field_observations.csv')]:
    with open(p, 'w', encoding='utf-8') as f:
        f.write(csv_content)
    print('Wrote paired_field_observations.csv to', p)

# Generate statistical_results.json
with open(os.path.join(run_dir, 'metrics.json'), encoding='utf-8') as f:
    metrics = json.load(f)

stat_res = {
    'runId': metrics.get('runId'),
    'totalSamples': metrics.get('totalSamples'),
    'overallCategoryAccuracy': metrics.get('overallCategoryAccuracy'),
    'overallMeanPrecision': metrics.get('overallMeanPrecision'),
    'overallMeanRecall': metrics.get('overallMeanRecall'),
    'overallMeanF1': metrics.get('overallMeanF1'),
    'overallMeanCer': metrics.get('overallMeanCer'),
    'overallMeanWer': metrics.get('overallMeanWer'),
    'overallExactMatchRate': metrics.get('overallExactMatchRate'),
    'confidenceMetrics': metrics.get('confidenceMetrics'),
    'errorTaxonomySummary': metrics.get('errorTaxonomySummary'),
    'profileBreakdown': metrics.get('profileBreakdown'),
    'categoryBreakdown': metrics.get('categoryBreakdown'),
    'robustnessAnalysis': metrics.get('robustnessAnalysis'),
    'generatedAt': metrics.get('generatedAt'),
}

for p in [os.path.join(root_dir, 'statistical_results.json'), os.path.join(res_dir, 'statistical_results.json')]:
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(stat_res, f, indent=2)
    print('Wrote statistical_results.json to', p)

# Copy markdown deliverables to root
for md in ['IMPLEMENTATION_CHANGELOG.md', 'BENCHMARK_EXECUTION_REPORT.md', 'MANUAL_VALIDATION_10_SAMPLES.md']:
    sp = os.path.join(docs_dir, md)
    if os.path.exists(sp):
        shutil.copy2(sp, os.path.join(root_dir, md))
        print('Copied', md, 'to root')
