"""
Large-Scale ADBG v1.0 Generator Script (60,000 Specimens / 4.08M Observations).

Generates:
- 5,000 Unique Academic Certificates x 4 Profiles = 20,000 Specimens
- 5,000 Unique Semester Marksheets x 4 Profiles = 20,000 Specimens
- 5,000 Unique Student ID Cards x 4 Profiles = 20,000 Specimens
Total = 15,000 Original Templates / 60,000 Rendered Image Specimens + Ground Truth JSONs.

Features:
- Multiprocessing worker pool utilizing available CPU cores
- Master deterministic seed (seed = 42)
- Resumable checkpointing (checkpoint.json)
- Progress tracking and throughput telemetry
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

# Add ADBG to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ADBG"))

import cv2
from adbg.core.interfaces import DocumentType, QualityProfile
from adbg.core.plugin_registry import PluginRegistry
from adbg.core.seed_manager import SeedManager
from adbg.data.fabricator import AcademicDataFabricator
from adbg.degradations.engine import DegradationEngine
from adbg.groundtruth.builder import GroundTruthBuilder
from adbg.metadata.builder import SampleMetadataBuilder
from adbg.templates.loader import YamlTemplateLoader
from adbg.utils.pdf import pdf_bytes_to_image


def generate_single_specimen_task(
    task_key: str,
    doc_type_str: str,
    doc_seed_val: int,
    output_dir_str: str,
) -> dict:
    """Worker task: Fabricates one unique template and generates all 4 optical profiles."""
    out_dir = Path(output_dir_str)
    pdf_dir = out_dir / "pdf"
    png_dir = out_dir / "images" / "png"
    jpg_dir = out_dir / "images" / "jpeg"
    gt_dir = out_dir / "groundtruth"
    meta_dir = out_dir / "metadata"

    fabricator = AcademicDataFabricator()
    template_loader = YamlTemplateLoader()
    template_loader.load_all()
    degradation_engine = DegradationEngine()
    gt_builder = GroundTruthBuilder()
    meta_builder = SampleMetadataBuilder()

    doc_seed = SeedManager(seed=doc_seed_val)
    doc_type = DocumentType(doc_type_str)

    # Load template
    template_id = f"{doc_type_str}_alpha"
    template = template_loader.get_template(template_id)

    # 1. Fabricate clean ground-truth data
    data = fabricator.fabricate_document_data(
        seed=doc_seed.child(),
        document_type=doc_type_str,
        template_id=template.metadata.template_id,
        template_version=template.metadata.template_version,
        quality_profile="clean",
    )

    base_doc_id = data.document_id
    pdf_path = pdf_dir / f"{base_doc_id}.pdf"
    profiles = ["clean", "scanner_copy", "mobile_camera", "rotated_90"]

    # FAST SKIP: If PDF and all 4 profiles already exist on disk, skip instantly
    if pdf_path.exists() and all(
        (png_dir / f"{base_doc_id}_{p}.png").exists()
        and (jpg_dir / f"{base_doc_id}_{p}.jpeg").exists()
        and (gt_dir / f"{base_doc_id}_{p}.json").exists()
        and (meta_dir / f"{base_doc_id}_{p}.json").exists()
        for p in profiles
    ):
        return {
            "task_key": task_key,
            "base_doc_id": base_doc_id,
            "doc_type": doc_type_str,
            "specimens": [f"{base_doc_id}_{p}" for p in profiles],
        }

    # 2. Render pristine PDF if not existing
    generator = PluginRegistry.get_generator(doc_type_str)
    gen_doc = generator.generate(data, template)
    if not pdf_path.exists():
        pdf_path.write_bytes(gen_doc.pdf_bytes)

    # 3. Convert PDF to BGR Bitmap Tensor
    bgr_clean = pdf_bytes_to_image(gen_doc.pdf_bytes)

    generated_specimens = []

    for prof in profiles:
        prof_seed = doc_seed.child()
        specimen_id = f"{base_doc_id}_{prof}"

        # Apply degradation
        deg_res = degradation_engine.apply_degradation(bgr_clean, prof, prof_seed)

        # Save images
        png_path = png_dir / f"{specimen_id}.png"
        jpg_path = jpg_dir / f"{specimen_id}.jpeg"
        cv2.imwrite(str(png_path), deg_res.image)
        cv2.imwrite(str(jpg_path), deg_res.image, [cv2.IMWRITE_JPEG_QUALITY, 90])

        # Specimen-specific data object
        import dataclasses
        specimen_data = dataclasses.replace(data, document_id=specimen_id, quality_profile=prof)

        # Build Ground Truth JSON
        gt_dict = gt_builder.build_ground_truth_dict(specimen_data, deg_res.parameters)
        gt_path = gt_dir / f"{specimen_id}.json"
        gt_builder.save_ground_truth(gt_path, gt_dict)

        # Build Metadata JSON
        rel_pdf = str(pdf_path.relative_to(out_dir))
        rel_png = str(png_path.relative_to(out_dir))
        rel_jpg = str(jpg_path.relative_to(out_dir))
        rel_gt = str(gt_path.relative_to(out_dir))

        meta_obj = meta_builder.build_metadata(
            specimen_data, rel_pdf, rel_png, rel_jpg, rel_gt, deg_res.parameters, base_dir=out_dir
        )
        meta_path = meta_dir / f"{specimen_id}.json"
        meta_builder.save_sample_metadata(meta_path, meta_obj)

        generated_specimens.append(specimen_id)

    return {
        "task_key": task_key,
        "base_doc_id": base_doc_id,
        "doc_type": doc_type_str,
        "specimens": generated_specimens,
    }


def main():
    parser = argparse.ArgumentParser(description="ADBG v1.0 Large Scale Dataset Generator")
    parser.add_argument("--count-per-cat", type=int, default=5000, help="Templates per category (default: 5000)")
    parser.add_argument("--seed", type=int, default=42, help="Master deterministic seed (default: 42)")
    parser.add_argument("--workers", type=int, default=os.cpu_count() or 4, help="Parallel CPU workers")
    parser.add_argument("--output", type=str, default="benchmarks/AU_DIC_Benchmark_60k", help="Output directory")
    args = parser.parse_args()

    out_dir = Path(args.output)
    for sub in ["pdf", "images/png", "images/jpeg", "groundtruth", "metadata"]:
        (out_dir / sub).mkdir(parents=True, exist_ok=True)

    checkpoint_file = out_dir / "checkpoint.json"
    completed_indices = set()
    if checkpoint_file.exists():
        try:
            ckpt_data = json.loads(checkpoint_file.read_text(encoding="utf-8"))
            completed_indices = set(ckpt_data.get("completed_indices", []))
            print(f"[CHECKPOINT] Found {len(completed_indices)} previously completed template instances.")
        except Exception as e:
            print(f"[CHECKPOINT] Warning: could not parse checkpoint: {e}")

    total_templates = args.count_per_cat * 3
    total_specimens = total_templates * 4

    print("=================================================================")
    print(" ADBG v1.0 LARGE-SCALE DATASET GENERATOR (60,000 SPECIMENS)")
    print("=================================================================")
    print(f" Target Templates: {total_templates:,} ({args.count_per_cat:,} / category)")
    print(f" Target Rendered Specimens: {total_specimens:,} (4 optical profiles / template)")
    print(f" Target Field Observations: ~4,080,000 Observations")
    print(f" Master Seed: {args.seed}")
    print(f" Parallel Worker Processes: {args.workers}")
    print(f" Output Location: {out_dir.resolve()}")
    print("=================================================================")

    categories = [
        DocumentType.CERTIFICATE.value,
        DocumentType.MARKSHEET.value,
        DocumentType.STUDENT_ID.value,
    ]

    # Deterministic category offset multipliers
    cat_offsets = {
        DocumentType.CERTIFICATE.value: 10_000_000,
        DocumentType.MARKSHEET.value: 20_000_000,
        DocumentType.STUDENT_ID.value: 30_000_000,
    }

    # Generate tasks with stable unique keys
    tasks = []
    for cat in categories:
        for i in range(args.count_per_cat):
            task_key = f"{cat}_{i}"
            t_seed = (args.seed * 100_000_000) + cat_offsets[cat] + i
            if task_key not in completed_indices:
                tasks.append((task_key, cat, t_seed, str(out_dir)))

    remaining = len(tasks)
    print(f"Remaining tasks to process: {remaining:,} / {total_templates:,}")

    if remaining == 0:
        print("[SUCCESS] All templates and specimens are already fully generated!")
        return

    start_time = time.time()
    completed_count = len(completed_indices)

    with ProcessPoolExecutor(max_workers=args.workers) as executor:
        futures = [executor.submit(generate_single_specimen_task, *t) for t in tasks]
        
        last_ckpt_time = time.time()
        for future in as_completed(futures):
            try:
                res = future.result()
                completed_indices.add(res["task_key"])
                completed_count += 1

                # Progress log every 50 templates
                if completed_count % 50 == 0 or completed_count == total_templates:
                    elapsed = time.time() - start_time
                    t_rate = (completed_count - (total_templates - remaining)) / max(elapsed, 0.001)
                    s_rate = t_rate * 4
                    eta_sec = (total_templates - completed_count) / max(t_rate, 0.001)
                    print(
                        f"[{completed_count:,}/{total_templates:,} Templates | {completed_count*4:,}/{total_specimens:,} Specimens] "
                        f"Rate: {s_rate:.1f} spec/s | Elapsed: {elapsed/60:.1f}m | ETA: {eta_sec/60:.1f}m"
                    )

                # Save checkpoint every 10 seconds
                if time.time() - last_ckpt_time > 10.0:
                    checkpoint_file.write_text(
                        json.dumps({"completed_indices": list(completed_indices), "total_specimens": completed_count * 4}, indent=2),
                        encoding="utf-8",
                    )
                    last_ckpt_time = time.time()

            except Exception as e:
                print(f"[ERROR] Task failed: {e}")

    # Final checkpoint
    checkpoint_file.write_text(
        json.dumps({"completed_indices": list(completed_indices), "total_specimens": completed_count * 4}, indent=2),
        encoding="utf-8",
    )

    total_time = time.time() - start_time
    print("=================================================================")
    print(f"[SUCCESS] Generation Finished in {total_time/60:.2f} minutes!")
    print(f"Total Unique Templates: {len(completed_indices):,}")
    print(f"Total Rendered Specimens: {len(completed_indices)*4:,}")
    print(f"Total Output Files: {len(completed_indices)*4*4:,} (PDF, PNG, JPG, JSON, META)")
    print("=================================================================")


if __name__ == "__main__":
    main()
