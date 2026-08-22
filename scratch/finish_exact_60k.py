"""
Finish Exact 60,000-Specimen Dataset using the validated generate_single_specimen_task function.
"""

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
from adbg.data.fabricator import AcademicDataFabricator
from adbg.core.seed_manager import SeedManager

dataset_dir = Path("D:/AU_DIC_Benchmark_60k")
PROFILES = ["clean", "scanner_copy", "mobile_camera", "rotated_90"]
CAT_OFFSETS = {"certificate": 10000000, "marksheet": 20000000, "student_id": 30000000}

def main():
    t0 = time.time()
    print("=================================================================")
    print(" EXACT 60,000-SPECIMEN DATASET GAP CLOSER")
    print("=================================================================")
    
    # 1. Fast scan of existing complete stems
    print("Scanning existing specimen files on D:...")
    png_stems = {e.name.rsplit('.', 1)[0] for e in os.scandir(str(dataset_dir / "images/png")) if e.is_file()}
    jpg_stems = {e.name.rsplit('.', 1)[0] for e in os.scandir(str(dataset_dir / "images/jpeg")) if e.is_file()}
    gt_stems = {e.name.rsplit('.', 1)[0] for e in os.scandir(str(dataset_dir / "groundtruth")) if e.is_file()}
    meta_stems = {e.name.rsplit('.', 1)[0] for e in os.scandir(str(dataset_dir / "metadata")) if e.is_file()}
    
    complete_specimens = png_stems & jpg_stems & gt_stems & meta_stems
    print(f"Verified 4-modality complete specimens on D: {len(complete_specimens):,} / 60,000")
    
    # 2. Check each of the 15,000 tasks (5,000 per category)
    fabricator = AcademicDataFabricator()
    tasks_to_render = []
    
    for cat in ["certificate", "marksheet", "student_id"]:
        for i in range(5000):
            t_seed = (42 * 100000000) + CAT_OFFSETS[cat] + i
            doc_seed = SeedManager(seed=t_seed)
            data = fabricator.fabricate_document_data(
                seed=doc_seed.child(),
                document_type=cat,
                template_id=f"{cat}_alpha",
                template_version="1.0.0",
                quality_profile="clean",
            )
            base_doc_id = data.document_id
            
            # Check if all 4 profiles and PDF exist
            pdf_exists = (dataset_dir / "pdf" / f"{base_doc_id}.pdf").exists()
            all_profs_exist = all(f"{base_doc_id}_{prof}" in complete_specimens for prof in PROFILES)
            
            if not (pdf_exists and all_profs_exist):
                task_key = f"{cat}_{i}"
                tasks_to_render.append((task_key, cat, t_seed, str(dataset_dir)))
                
    print(f"Total incomplete templates needing rendering: {len(tasks_to_render):,} / 15,000", flush=True)
    
    if len(tasks_to_render) == 0:
        print("[SUCCESS] All 15,000 templates and 60,000 specimens are 100% complete!", flush=True)
    else:
        print(f"Starting 4-worker rendering for {len(tasks_to_render):,} templates...", flush=True)
        completed = 0
        with ProcessPoolExecutor(max_workers=4) as executor:
            futures = {
                executor.submit(generate_single_specimen_task, tk, cat, s, out): tk
                for tk, cat, s, out in tasks_to_render
            }
            for fut in as_completed(futures):
                res = fut.result()
                completed += 1
                if completed % 50 == 0 or completed == len(tasks_to_render):
                    rate = (completed * 4) / max(1, time.time() - t0)
                    print(f"  [{completed:,}/{len(tasks_to_render):,} Templates Rendered] ({completed/len(tasks_to_render)*100:.1f}%) | {rate:.1f} spec/s", flush=True)
                    
    print("\n[SUCCESS] Final rendering complete! Running final ultra-fast audit...", flush=True)
    import subprocess
    subprocess.run([sys.executable, "scratch/ultra_fast_manifest.py"], check=True)

if __name__ == "__main__":
    main()
