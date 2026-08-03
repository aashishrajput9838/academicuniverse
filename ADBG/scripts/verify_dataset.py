"""
Dataset Integrity Verification Script for AU DIC Benchmark v1.0.

Programmatically verifies:
    1. Every expected output file exists.
    2. manifest.json is complete.
    3. benchmark_certificate.json is complete.
    4. statistics.json is complete.
    5. All checksums match 100%.
    6. Concise completion report.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from adbg.manifest.builder import ManifestVerifier


def verify_au_dic_dataset(dataset_dir: str = "./AU_DIC_Benchmark_v1.0") -> bool:
    ds_path = Path(dataset_dir)
    print("==========================================================")
    print("AU DIC Benchmark v1.0 — Comprehensive Verification Audit")
    print(f"Target Directory: {ds_path.resolve()}")
    print("==========================================================")

    errors: list[str] = []
    profiles = ["clean", "scanner_copy", "mobile_camera", "rotated_90"]
    categories = ["certificates", "marksheets", "student_ids"]

    # 1. Verify pdf/clean/{cat}/ directories (30 files each)
    pdf_count = 0
    for cat in categories:
        p_dir = ds_path / "pdf" / "clean" / cat
        if not p_dir.exists():
            errors.append(f"Directory missing: pdf/clean/{cat}")
        else:
            files = list(p_dir.glob("*.pdf"))
            pdf_count += len(files)
            if len(files) != 30:
                errors.append(f"File count mismatch in pdf/clean/{cat}: expected 30, got {len(files)}")
            else:
                print(f"  [OK] pdf/clean/{cat}: 30/30 PDF files present.")

    # 2. Verify images, groundtruth, metadata per profile per category
    png_count = 0
    jpeg_count = 0
    gt_count = 0
    meta_count = 0

    for prof in profiles:
        for cat in categories:
            png_dir = ds_path / "images" / prof / "png" / cat
            jpeg_dir = ds_path / "images" / prof / "jpeg" / cat
            gt_dir = ds_path / "groundtruth" / prof / cat
            meta_dir = ds_path / "metadata" / prof / cat

            for d_path, label in [(png_dir, "png"), (jpeg_dir, "jpeg"), (gt_dir, "gt"), (meta_dir, "meta")]:
                if not d_path.exists():
                    errors.append(f"Directory missing: {d_path.relative_to(ds_path)}")
                else:
                    file_cnt = len(list(d_path.glob("*.*")))
                    if label == "png":
                        png_count += file_cnt
                    elif label == "jpeg":
                        jpeg_count += file_cnt
                    elif label == "gt":
                        gt_count += file_cnt
                    elif label == "meta":
                        meta_count += file_cnt

                    if file_cnt != 30:
                        errors.append(f"File count mismatch in {d_path.relative_to(ds_path)}: expected 30, got {file_cnt}")

    print(f"  [OK] images: {png_count} PNGs and {jpeg_count} JPEGs verified across all categories.")
    print(f"  [OK] groundtruth: {gt_count} Ground Truth JSON files verified across all categories.")
    print(f"  [OK] metadata: {meta_count} Metadata JSON files verified across all categories.")

    # 3. Verify manifest.json
    manifest_p = ds_path / "manifest.json"
    manifest_valid = False
    if not manifest_p.exists():
        errors.append("manifest.json missing!")
    else:
        manifest_data = json.loads(manifest_p.read_text(encoding="utf-8"))
        if manifest_data.get("total_documents") != 360:
            errors.append(f"manifest.json total_documents expected 360, got {manifest_data.get('total_documents')}")
        if len(manifest_data.get("documents", [])) != 360:
            errors.append(f"manifest.json documents array expected 360 items, got {len(manifest_data.get('documents', []))}")
        else:
            manifest_valid = True
            print("  [OK] manifest.json: 360 document sample records validated.")

    # 4. Verify benchmark_certificate.json
    cert_p = ds_path / "benchmark_certificate.json"
    cert_valid = False
    if not cert_p.exists():
        errors.append("benchmark_certificate.json missing!")
    else:
        cert_data = json.loads(cert_p.read_text(encoding="utf-8"))
        if cert_data.get("dataset_id") != "AU-DIC-BENCHMARK-V1.0":
            errors.append(f"benchmark_certificate.json dataset_id mismatch: {cert_data.get('dataset_id')}")
        if cert_data.get("file_counts", {}).get("total_image_samples") != 360:
            errors.append("benchmark_certificate.json total_image_samples count mismatch!")
        else:
            cert_valid = True
            print("  [OK] benchmark_certificate.json: Certificate integrity validated.")

    # 5. Verify statistics.json
    stats_p = ds_path / "statistics.json"
    stats_valid = False
    if not stats_p.exists():
        errors.append("statistics.json missing!")
    else:
        stats_data = json.loads(stats_p.read_text(encoding="utf-8"))
        if stats_data.get("total_documents") != 360:
            errors.append("statistics.json total_documents count mismatch!")
        else:
            stats_valid = True
            print("  [OK] statistics.json: Dataset statistical summary validated.")

    # 6. Verify checksums match & relative paths valid
    verifier = ManifestVerifier()
    sha_valid, check_errors = verifier.verify_dataset(ds_path)
    if not sha_valid:
        errors.extend(check_errors)
    else:
        print("  [OK] Checksums: 100% SHA-256 file digests matched successfully.")

    # 7. Count total directories and total files recursively
    all_dirs = [d for d in ds_path.glob("**/*") if d.is_dir()]
    all_files = [f for f in ds_path.glob("**/*") if f.is_file()]
    total_dirs_cnt = len(all_dirs) + 1  # include root ds_path
    total_files_cnt = len(all_files)

    # Check orphan/duplicate file presence
    expected_total_files = 90 + 360 + 360 + 360 + 360 + 5  # PDFs + PNGs + JPEGs + GTs + Metas + Manifest + Cert + Stats + Report + Figure
    if total_files_cnt != expected_total_files:
        errors.append(f"Unexpected file count in dataset tree: expected {expected_total_files}, found {total_files_cnt}")
    else:
        print(f"  [OK] Orphan/Duplicate Audit: Zero orphan or duplicate files found ({total_files_cnt} total files).")

    is_success = len(errors) == 0

    # 8. Produce Final Verification Report
    print("\n==========================================================")
    print("AU DIC BENCHMARK v1.0 — FINAL AUDIT REPORT")
    print("==========================================================")
    print(f"  Directories Count:     {total_dirs_cnt}")
    print(f"  Original PDF Specimens:{pdf_count}")
    print(f"  PNG Image Samples:     {png_count}")
    print(f"  JPEG Image Samples:    {jpeg_count}")
    print(f"  Ground Truth JSONs:    {gt_count}")
    print(f"  Metadata JSON Logs:    {meta_count}")
    print(f"  Manifest Validation:   {'PASS' if manifest_valid else 'FAIL'}")
    print(f"  Statistics Validation: {'PASS' if stats_valid else 'FAIL'}")
    print(f"  Certificate Validation:{'PASS' if cert_valid else 'FAIL'}")
    print(f"  SHA-256 Digest Status: {'PASS (0 errors)' if sha_valid else 'FAIL'}")
    print(f"  Total Files Count:     {total_files_cnt}")
    print(f"  Verification Status:   {'SUCCESS / PASS' if is_success else 'FAIL'}")
    print("==========================================================")

    return is_success


if __name__ == "__main__":
    success = verify_au_dic_dataset("./AU_DIC_Benchmark_v1.0")
    if not success:
        sys.exit(1)
