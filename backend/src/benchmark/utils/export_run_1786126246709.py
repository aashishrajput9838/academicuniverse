import os, json, shutil

run_dir = r'C:\github\academicuniverse.com\academicuniverse\backend\benchmark_reports\run_1786126246709'
root_dir = r'C:\github\academicuniverse.com\academicuniverse'
res_dir = r'C:\github\academicuniverse.com\academicuniverse\research\statistics\results'

cmp_file = os.path.join(run_dir, 'comparisons.json')
metrics_file = os.path.join(run_dir, 'metrics.json')

with open(cmp_file, encoding='utf-8') as f:
    comparisons = json.load(f)

with open(metrics_file, encoding='utf-8') as f:
    metrics = json.load(f)

# 1. Copy core 3 JSON files
for file_name in ['metrics.json', 'comparisons.json', 'predictions.json']:
    src_p = os.path.join(run_dir, file_name)
    if os.path.exists(src_p):
        shutil.copy2(src_p, os.path.join(root_dir, file_name))
        shutil.copy2(src_p, os.path.join(res_dir, file_name))
        print(f"Copied {file_name} from run_1786126246709 to root and research/statistics/results/")

# 2. Generate paired_field_observations.csv from run_1786126246709 comparisons.json
csv_lines = ['sample_id,document_type,quality_profile,field_name,expected_value,predicted_value,matched,cer,wer,error_category']
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

for target_dir in [run_dir, root_dir, res_dir]:
    p = os.path.join(target_dir, 'paired_field_observations.csv')
    with open(p, 'w', encoding='utf-8') as f:
        f.write(csv_content)
    print(f'Wrote paired_field_observations.csv to {p}')

# 3. Generate statistical_results.json from run_1786126246709 metrics.json
stat_results = {
    'benchmarkRunId': metrics.get('runId', 'run_1786126246709'),
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
    'generatedAt': metrics.get('generatedAt', '2026-08-07T18:10:47Z'),
}

for target_dir in [run_dir, root_dir, res_dir]:
    p = os.path.join(target_dir, 'statistical_results.json')
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(stat_results, f, indent=2)
    print(f'Wrote statistical_results.json to {p}')
