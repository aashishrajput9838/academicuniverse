import json, os, collections

def generate_5_sample_trace(run_dir):
    cmp_file = os.path.join(run_dir, 'comparisons.json')
    pred_file = os.path.join(run_dir, 'predictions.json')

    if not os.path.exists(cmp_file) or not os.path.exists(pred_file):
        print(f"Run dir {run_dir} missing files.")
        return

    with open(cmp_file, encoding='utf-8') as f:
        comparisons = json.load(f)
    with open(pred_file, encoding='utf-8') as f:
        predictions = json.load(f)

    pred_map = {p['sampleId']: p for p in predictions}

    marksheet_samples = [c for c in comparisons if 'marksheet' in c.get('documentType', '').lower() or any(d.get('field', '').startswith('subject[') for d in c.get('discrepancies', []))]
    
    selected = marksheet_samples[:5] if len(marksheet_samples) >= 5 else comparisons[:5]

    print("\n==================================================================================")
    print(" 5 RANDOM SAMPLE TRACE: PREDICTION -> SUBJECT ARRAY -> EVALUATOR OUTPUT")
    print("==================================================================================")

    for idx, sample in enumerate(selected, 1):
        sid = sample.get('sampleId')
        p = pred_map.get(sid, {})
        model_name = p.get('modelName', 'UNKNOWN')
        is_mock = p.get('isMock', True)

        print(f"\n--- SAMPLE {idx}: {sid} (Model: {model_name}, isMock: {is_mock}) ---")

        # Extract subject array from prediction
        extracted_entities = p.get('extractedEntities', {})
        candidate_fields = p.get('candidateFields', {})
        pred_subjects = extracted_entities.get('subjects') or candidate_fields.get('subjects') or []

        print(f"Prediction Extracted Subject Array Length: {len(pred_subjects)} items")
        if pred_subjects:
            print("First 2 Extracted Subjects in Prediction:")
            for s in pred_subjects[:2]:
                print(f"  - Code: {s.get('code')}, Name: {s.get('name')}, Credits: {s.get('credits')}, Grade: {s.get('grade')}")

        print("\nEvaluator Output Discrepancies & Matching Results (First 6 Fields):")
        subj_disc = [d for d in sample.get('discrepancies', []) if d.get('field', '').startswith('subject[')]
        for d in subj_disc[:6]:
            field = d.get('field')
            gt_val = d.get('expected')
            pred_val = d.get('actual')
            matched = d.get('matched')
            status = "[MATCHED]" if matched else "[NOT MATCHED]"
            print(f"  {field:<20} | GT: {str(gt_val):<15} | Pred: {str(pred_val):<15} | Evaluator: {status}")

if __name__ == '__main__':
    generate_5_sample_trace(r'C:\github\academicuniverse.com\academicuniverse\backend\benchmark_reports\run_1786126246709')
