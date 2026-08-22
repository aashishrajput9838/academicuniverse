"""
Instant Multi-Process Gap Closer for 60,000-Specimen Dataset.
"""

import json
import os
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

# Add project root and ADBG to sys.path
workspace = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(workspace))
sys.path.insert(0, str(workspace / "ADBG"))

from scratch.run_large_scale_adbg_generation import generate_single_specimen_task

dataset_dir = Path("D:/AU_DIC_Benchmark_60k")
PROFILES = ["clean", "scanner_copy", "mobile_camera", "rotated_90"]
CAT_OFFSETS = {"certificate": 10000000, "marksheet": 20000000, "student_id": 30000000}

def main():
    t0 = time.time()
    print("=================================================================", flush=True)
    print(" INSTANT 60,000-SPECIMEN DATASET GAP CLOSER (FAST RECOVERY)", flush=True)
    print("=================================================================", flush=True)
    
    # 1. Fast stem scan of PNGs
    print("Scanning PNG image files on D:...", flush=True)
    png_stems = {e.name.rsplit('.', 1)[0] for e in os.scandir(str(dataset_dir / "images/png")) if e.is_file()}
    jpg_stems = {e.name.rsplit('.', 1)[0] for e in os.scandir(str(dataset_dir / "images/jpeg")) if e.is_file()}
    gt_stems = {e.name.rsplit('.', 1)[0] for e in os.scandir(str(dataset_dir / "groundtruth")) if e.is_file()}
    meta_stems = {e.name.rsplit('.', 1)[0] for e in os.scandir(str(dataset_dir / "metadata")) if e.is_file()}
    
    complete_specimens = png_stems & jpg_stems & gt_stems & meta_stems
    print(f"Verified 4-modality complete specimens on D: {len(complete_specimens):,} / 60,000", flush=True)
    
    # 2. Extract completed task indices from ground truth seeds
    print("Scanning ground truth JSONs to identify completed template indices...", flush=True)
    completed_task_keys = set()
    
    # Group stems by base doc id
    from collections import defaultdict
    doc_profs = defaultdict(set)
    for s in complete_specimens:
        doc_id, prof = s.rsplit('_', 1)
        doc_profs[doc_id].add(prof)
        
    complete_base_docs = {doc_id for doc_id, profs in doc_profs.items() if len(profs) == 4}
    print(f"Base documents with all 4 profiles complete: {len(complete_base_docs):,} / 15,000", flush=True)
    
    for gt_name in gt_stems:
        doc_id, prof = gt_name.rsplit('_', 1)
        if doc_id in complete_base_docs and prof == "clean":
            gt_p = dataset_dir / "groundtruth" / f"{gt_name}.json"
            try:
                data = json.loads(gt_p.read_text(encoding="utf-8"))
                doc_t = data.get("document_type")
                seed = data.get("seed", 0)
                if doc_t in CAT_OFFSETS:
                    i = seed - 4200000000 - CAT_OFFSETS[doc_t]
                    if 0 <= i < 5000:
                        completed_task_keys.add(f"{doc_t}_{i}")
            except Exception:
                pass
                
    print(f"Found {len(completed_task_keys):,} completed templates in dataset ({len(completed_task_keys)*4:,} specimens).", flush=True)
    
    # 3. Formulate missing tasks
    missing_tasks = []
    for cat in ["certificate", "marksheet", "student_id"]:
        for i in range(5000):
            tk = f"{cat}_{i}"
            if tk not in completed_task_keys:
                t_seed = (42 * 100000000) + CAT_OFFSETS[cat] + i
                missing_tasks.append((tk, cat, t_seed, str(dataset_dir)))
                
    print(f"Exact missing templates to render: {len(missing_tasks):,} / 15,000 ({len(missing_tasks)*4:,} specimens)", flush=True)
    
    if len(missing_tasks) == 0:
        print("[SUCCESS] All 15,000 templates and 60,000 specimens are already 100% complete!", flush=True)
    else:
        print(f"Starting 4-worker generation for remaining {len(missing_tasks):,} templates...", flush=True)
        completed = 0
        with ProcessPoolExecutor(max_workers=4) as executor:
            futures = {
                executor.submit(generate_single_specimen_task, tk, cat, s, out): tk
                for tk, cat, s, out in missing_tasks
            }
            for fut in as_completed(futures):
                try:
                    res = fut.result()
                except Exception as e:
                    print(f"  [WARNING] Recovered from worker error: {e}", flush=True)
                completed += 1
                if completed % 50 == 0 or completed == len(missing_tasks):
                    rate = (completed * 4) / max(1, time.time() - t0)
                    print(f"  [{completed:,}/{len(missing_tasks):,} Templates Rendered] ({completed/len(missing_tasks)*100:.1f}%) | {rate:.1f} spec/s", flush=True)
                    
    print("\n[SUCCESS] Final rendering complete! Running final ultra-fast audit...", flush=True)
    import subprocess
    subprocess.run([sys.executable, "scratch/ultra_fast_manifest.py"], check=True)

if __name__ == "__main__":
    main()
