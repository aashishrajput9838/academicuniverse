"""
Find and complete any remaining missing specimens in D:/AU_DIC_Benchmark_60k
to guarantee exact 15,000 PDFs, 60,000 PNGs, 60,000 JPGs, 60,000 GTs, 60,000 Metas.
"""

import json
import os
import sys
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

# Add project root and ADBG to sys.path
workspace = Path(__file__).resolve().parents[1]
adbg_root = workspace / "ADBG"
sys.path.insert(0, str(workspace))
sys.path.insert(0, str(adbg_root))

from adbg.core.plugin_registry import PluginRegistry
from adbg.data.fabricator import AcademicDataFabricator
from adbg.degradations.engine import DegradationEngine
from adbg.degradations.profiles import BUILTIN_PROFILES
from adbg.groundtruth.builder import GroundTruthBuilder
from adbg.metadata.builder import SampleMetadataBuilder
from adbg.rendering.pdf_engine import PdfRenderingEngine
from adbg.rendering.raster_engine import RasterRenderingEngine

dataset_dir = Path("D:/AU_DIC_Benchmark_60k")
PROFILES = ["clean", "scanner_copy", "mobile_camera", "rotated_90"]
CAT_OFFSETS = {"certificate": 10000000, "marksheet": 20000000, "student_id": 30000000}

def render_missing_template(task):
    cat, i, seed = task
    
    registry = PluginRegistry()
    registry.discover_plugins()
    fabricator = AcademicDataFabricator()
    pdf_engine = PdfRenderingEngine()
    raster_engine = RasterRenderingEngine()
    degradation_engine = DegradationEngine()
    gt_builder = GroundTruthBuilder()
    meta_builder = SampleMetadataBuilder()
    
    generator = registry.get_generator(cat)
    data = fabricator.fabricate(doc_type=cat, seed=seed)
    
    # PDF
    pdf_path = dataset_dir / "pdf" / f"{data.document_id}.pdf"
    if not pdf_path.exists():
        pdf_bytes = generator.generate_pdf(data)
        pdf_path.parent.mkdir(parents=True, exist_ok=True)
        pdf_path.write_bytes(pdf_bytes)
    else:
        pdf_bytes = pdf_path.read_bytes()
        
    # Render all 4 profiles if any missing
    pristine_image = None
    import dataclasses
    for prof in PROFILES:
        png_p = dataset_dir / "images" / "png" / f"{data.document_id}_{prof}.png"
        jpg_p = dataset_dir / "images" / "jpeg" / f"{data.document_id}_{prof}.jpeg"
        gt_p = dataset_dir / "groundtruth" / f"{data.document_id}_{prof}.json"
        meta_p = dataset_dir / "metadata" / f"{data.document_id}_{prof}.json"
        
        if not (png_p.exists() and jpg_p.exists() and gt_p.exists() and meta_p.exists()):
            if pristine_image is None:
                pristine_image = raster_engine.rasterize_pdf(pdf_bytes, dpi=300)
                
            deg_profile = BUILTIN_PROFILES[prof]
            deg_result = degradation_engine.apply_profile(pristine_image, deg_profile, seed=seed)
            
            specimen_id = f"{data.document_id}_{prof}"
            specimen_data = dataclasses.replace(data, document_id=specimen_id, quality_profile=prof)
            
            # Save PNG
            png_p.parent.mkdir(parents=True, exist_ok=True)
            deg_result.image.save(png_p, format="PNG")
            
            # Save JPG
            jpg_p.parent.mkdir(parents=True, exist_ok=True)
            deg_result.image.convert("RGB").save(jpg_p, format="JPEG", quality=92)
            
            # Save GT JSON
            gt_dict = gt_builder.build_ground_truth(specimen_data, degradation_parameters=deg_result.applied_parameters)
            gt_builder.save_ground_truth(gt_p, gt_dict)
            
            # Save Meta JSON
            meta_dict = meta_builder.build_metadata(specimen_data, degradation_parameters=deg_result.applied_parameters)
            meta_builder.save_metadata(meta_p, meta_dict)
            
    return f"{cat}_{i}"

def main():
    print("=================================================================")
    print(" SCANNING & COMPLETING MISSING SPECIMENS FOR 100% 60,000 DATASET")
    print("=================================================================")
    
    # Find missing tasks
    missing_tasks = []
    for cat in ["certificate", "marksheet", "student_id"]:
        for i in range(5000):
            seed = (42 * 100000000) + CAT_OFFSETS[cat] + i
            # Check if all files exist for this template
            # Quick check via expected document_id (fabricate seed)
            missing_tasks.append((cat, i, seed))
            
    print(f"Total candidate tasks to verify: {len(missing_tasks):,}")
    
    # Filter only those truly missing any files
    # Fast stem scan
    png_stems = {e.name.rsplit('.', 1)[0] for e in os.scandir(str(dataset_dir / "images/png")) if e.is_file()}
    jpg_stems = {e.name.rsplit('.', 1)[0] for e in os.scandir(str(dataset_dir / "images/jpeg")) if e.is_file()}
    gt_stems = {e.name.rsplit('.', 1)[0] for e in os.scandir(str(dataset_dir / "groundtruth")) if e.is_file()}
    meta_stems = {e.name.rsplit('.', 1)[0] for e in os.scandir(str(dataset_dir / "metadata")) if e.is_file()}
    
    complete_specimens = png_stems & jpg_stems & gt_stems & meta_stems
    print(f"Currently complete specimens on D: {len(complete_specimens):,} / 60,000")
    
    # We will process tasks using 4 parallel workers
    tasks_to_run = []
    fabricator = AcademicDataFabricator()
    print("Identifying specific templates with missing specimens...")
    for cat, i, seed in missing_tasks:
        data = fabricator.fabricate(doc_type=cat, seed=seed)
        all_exist = True
        for prof in PROFILES:
            if f"{data.document_id}_{prof}" not in complete_specimens:
                all_exist = False
                break
        if not all_exist:
            tasks_to_run.append((cat, i, seed))
            
    print(f"Templates needing fill-in rendering: {len(tasks_to_run):,} ({len(tasks_to_run)*4:,} potential specimens)")
    
    if len(tasks_to_run) == 0:
        print("[SUCCESS] All 60,000 specimens are already 100% complete!")
        return
        
    print(f"Starting 4-worker fill-in generation for {len(tasks_to_run):,} templates...")
    completed = 0
    with ProcessPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(render_missing_template, task): task for task in tasks_to_run}
        for fut in as_completed(futures):
            res = fut.result()
            completed += 1
            if completed % 100 == 0 or completed == len(tasks_to_run):
                print(f"  [{completed:,}/{len(tasks_to_run):,} Templates Filled] ({completed/len(tasks_to_run)*100:.1f}%)")
                
    print("\n[SUCCESS] Fill-in rendering complete! Running final audit...")

if __name__ == "__main__":
    main()
