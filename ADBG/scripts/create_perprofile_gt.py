#!/usr/bin/env python3
"""
create_perprofile_gt.py — Repository-Native Per-Profile Ground Truth Generator

Scans ADBG/AU_DIC_Benchmark_v1.0/groundtruth/<profile>/<category>/
and creates flat per-profile ground truth JSON files:
  ADBG/AU_DIC_Benchmark_v1.0/groundtruth/DOC-<HASH>_<profile>.json

Ensures 100% repository-relative path independence.
"""

import json
import os
from pathlib import Path

def create_perprofile_gt():
    root = Path(__file__).resolve().parents[2]
    adbg_dir = root / "ADBG" / "AU_DIC_Benchmark_v1.0"
    gt_dir = adbg_dir / "groundtruth"

    if not gt_dir.exists():
        print(f"[create_perprofile_gt] Error: {gt_dir} does not exist. Run generate_au_dic_benchmark_v1.py first.")
        return 1

    quality_profiles = ["clean", "scanner_copy", "mobile_camera", "rotated_90"]
    count = 0

    for prof in quality_profiles:
        prof_dir = gt_dir / prof
        if not prof_dir.exists():
            continue
        
        for cat_dir in prof_dir.iterdir():
            if not cat_dir.is_dir():
                continue
            
            for json_file in cat_dir.glob("*.json"):
                # Read base GT JSON
                try:
                    with open(json_file, 'r', encoding='utf-8') as f:
                        gt_data = json.load(f)
                    
                    # Target filename: DOC-XXXXXXXX_<profile>.json
                    base_name = json_file.stem  # e.g., DOC-00DFAED9 or DOC-00DFAED9_clean
                    for p in quality_profiles:
                        if base_name.endswith(f"_{p}"):
                            base_name = base_name[:-len(p)-1]
                            break
                    
                    target_name = f"{base_name}_{prof}.json"
                    target_path = gt_dir / target_name

                    # Inject qualityProfile if missing
                    gt_data["qualityProfile"] = prof
                    gt_data["sampleId"] = f"{base_name}_{prof}"

                    with open(target_path, 'w', encoding='utf-8') as f:
                        json.dump(gt_data, f, indent=2)
                    
                    count += 1
                except Exception as e:
                    print(f"[create_perprofile_gt] Warning: Failed to process {json_file}: {e}")

    print(f"[SUCCESS] [create_perprofile_gt] Generated {count} per-profile GT JSON files in {gt_dir}")
    return 0

if __name__ == "__main__":
    exit(create_perprofile_gt())
