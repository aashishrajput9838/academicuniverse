"""
AU DIC Research Paper Benchmark Dataset v1.0 Generation Script.

Generates:
    - 30 Academic Certificates
    - 30 Academic Marksheets
    - 30 Student ID Cards
Total Original Documents: 90.

For every original document, generates all 4 quality profiles:
    - clean_pdf
    - scanner_copy
    - mobile_camera
    - rotated

Total Image Samples: 360 (90 x 4).
Uses fixed master seed = 42 for 100% scientific reproducibility.
Outputs to: ./AU_DIC_Benchmark_v1.0/
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import cv2

import adbg.degradations  # Register degradations
import adbg.generators   # Register generators
from adbg import __version__
from adbg.core.plugin_registry import PluginRegistry
from adbg.core.seed_manager import SeedManager
from adbg.data.fabricator import AcademicDataFabricator
from adbg.degradations.engine import DegradationEngine
from adbg.degradations.figures import ResearchPaperFigureGenerator
from adbg.degradations.reporter import DegradationReporter
from adbg.groundtruth.builder import GroundTruthBuilder
from adbg.manifest.builder import ManifestBuilder, ManifestVerifier
from adbg.metadata.builder import SampleMetadataBuilder
from adbg.statistics.engine import StatisticsEngine
from adbg.templates.loader import YamlTemplateLoader
from adbg.utils.hashing import sha256_file, sha256_string
from adbg.utils.pdf import pdf_bytes_to_image


def generate_au_dic_benchmark(
    master_seed_val: int = 42,
    output_dir: str | Path | None = None,
) -> None:
    start_time = time.time()
    if output_dir is None:
        out_dir = Path(__file__).resolve().parents[1] / "AU_DIC_Benchmark_v1.0"
    else:
        out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    pdf_dir = out_dir / "pdf"
    png_dir = out_dir / "images" / "png"
    jpg_dir = out_dir / "images" / "jpeg"
    gt_dir = out_dir / "groundtruth"
    meta_dir = out_dir / "metadata"
    reports_dir = out_dir / "reports"
    figures_dir = out_dir / "figures"

    for d in [pdf_dir, png_dir, jpg_dir, gt_dir, meta_dir, reports_dir, figures_dir]:
        d.mkdir(parents=True, exist_ok=True)

    master_seed = SeedManager(seed=master_seed_val)
    fabricator = AcademicDataFabricator()
    template_loader = YamlTemplateLoader()
    available_templates = template_loader.load_all()
    degradation_engine = DegradationEngine()

    gt_builder = GroundTruthBuilder()
    meta_builder = SampleMetadataBuilder()
    manifest_builder = ManifestBuilder()
    stats_engine = StatisticsEngine()

    quality_profiles = ["clean", "scanner_copy", "mobile_camera", "rotated_90"]
    category_dirs_map = {
        "certificate": "certificates",
        "marksheet": "marksheets",
        "student_id": "student_ids",
    }
    category_names = ["certificates", "marksheets", "student_ids"]

    # Pre-create directory tree
    for cat in category_names:
        (out_dir / "pdf" / "clean" / cat).mkdir(parents=True, exist_ok=True)
        for prof in quality_profiles:
            (out_dir / "images" / prof / "png" / cat).mkdir(parents=True, exist_ok=True)
            (out_dir / "images" / prof / "jpeg" / cat).mkdir(parents=True, exist_ok=True)
            (out_dir / "groundtruth" / prof / cat).mkdir(parents=True, exist_ok=True)
            (out_dir / "metadata" / prof / cat).mkdir(parents=True, exist_ok=True)

    (out_dir / "reports").mkdir(parents=True, exist_ok=True)
    (out_dir / "figures").mkdir(parents=True, exist_ok=True)

    # 30 certificates, 30 marksheets, 30 student IDs
    specimen_types = (
        ["certificate"] * 30 +
        ["marksheet"] * 30 +
        ["student_id"] * 30
    )

    print("==========================================================")
    print(f"AU DIC Research Paper Benchmark Dataset v1.0 Generation")
    print(f"Master Seed: {master_seed_val} | Target: 90 original docs -> 360 samples")
    print(f"Output Directory: {out_dir.resolve()}")
    print("==========================================================")

    samples: list = []

    for idx, doc_type in enumerate(specimen_types):
        doc_seed = master_seed.child()
        cat_dir = category_dirs_map[doc_type]

        # Select template
        matching_templates = [
            t for t in available_templates.values()
            if t.metadata.document_type == doc_type
        ]
        template = matching_templates[0] if matching_templates else template_loader.get_template(f"{doc_type}_alpha")

        # Fabricate base DocumentData once for this original specimen
        base_data = fabricator.fabricate_document_data(
            seed=doc_seed.child(),
            document_type=doc_type,
            template_id=template.metadata.template_id,
            template_version=template.metadata.template_version,
            quality_profile="clean",
            schema_version="1.0.0",
            generator_version=__version__,
            benchmark_version="1.0.0",
            dataset_version="1.0.0",
            experiment_id="AU_DIC_v1.0",
            locale="en_IN",
        )

        # Generate clean PDF specimen
        generator = PluginRegistry.get_generator(doc_type)
        gen_doc = generator.generate(base_data, template)

        # Save clean vector PDF specimen ONCE under pdf/clean/{cat_dir}/
        pdf_path = out_dir / "pdf" / "clean" / cat_dir / f"{base_data.document_id}.pdf"
        pdf_path.write_bytes(gen_doc.pdf_bytes)

        # Convert clean PDF to base BGR image array
        base_bgr = pdf_bytes_to_image(gen_doc.pdf_bytes)

        # For every quality profile, generate a degraded image sample
        for prof in quality_profiles:
            prof_seed = doc_seed.child()

            # Apply degradation operator pipeline
            deg_res = degradation_engine.apply_degradation(
                base_bgr, prof, prof_seed
            )

            # Sample ID suffixing
            sample_id = f"{base_data.document_id}_{prof}"

            # Create sample-specific DocumentData variant preserving base specimen fields
            sample_data = base_data.__class__(
                document_id=sample_id,
                document_uuid=base_data.document_uuid,
                document_type=doc_type,
                template_id=template.metadata.template_id,
                template_version=template.metadata.template_version,
                schema_version=base_data.schema_version,
                generator_version=base_data.generator_version,
                benchmark_version=base_data.benchmark_version,
                dataset_version=base_data.dataset_version,
                experiment_id=base_data.experiment_id,
                locale=base_data.locale,
                university=base_data.university,
                seed=base_data.seed,
                student=base_data.student,
                semester_records=base_data.semester_records,
                cgpa=base_data.cgpa,
                issue_date=base_data.issue_date,
                quality_profile=prof,
                generation_timestamp=base_data.generation_timestamp,
            )

            # Define category-nested output paths
            png_path = out_dir / "images" / prof / "png" / cat_dir / f"{sample_id}.png"
            jpg_path = out_dir / "images" / prof / "jpeg" / cat_dir / f"{sample_id}.jpeg"
            gt_path = out_dir / "groundtruth" / prof / cat_dir / f"{sample_id}.json"
            meta_path = out_dir / "metadata" / prof / cat_dir / f"{sample_id}.json"

            # Save PNG and JPEG images
            cv2.imwrite(str(png_path), deg_res.image)
            cv2.imwrite(str(jpg_path), deg_res.image, [cv2.IMWRITE_JPEG_QUALITY, 90])

            # Save Ground Truth JSON
            gt_dict = gt_builder.build_ground_truth_dict(sample_data, deg_res.parameters)
            gt_builder.save_ground_truth(gt_path, gt_dict)

            # Build Sample Metadata with relative paths
            rel_pdf = str(pdf_path.relative_to(out_dir))
            rel_png = str(png_path.relative_to(out_dir))
            rel_jpg = str(jpg_path.relative_to(out_dir))
            rel_gt = str(gt_path.relative_to(out_dir))

            sample_meta = meta_builder.build_metadata(
                sample_data, rel_pdf, rel_png, rel_jpg, rel_gt, deg_res.parameters, base_dir=out_dir
            )
            meta_builder.save_sample_metadata(meta_path, sample_meta)

            samples.append(sample_meta)

        # Generate paper figure for specimen #1
        if idx == 0:
            fig_gen = ResearchPaperFigureGenerator()
            fig_img = fig_gen.generate_publication_figure(base_bgr, doc_seed.child())
            cv2.imwrite(str(figures_dir / "figure_1_au_dic_degradations.png"), fig_img)

            reporter = DegradationReporter()
            md_rep = reporter.generate_markdown_report(
                base_data.document_id, "mobile_camera", base_data.seed, deg_res.parameters, samples[-1].checksum_sha256
            )
            (reports_dir / "degradation_audit.md").write_text(md_rep, encoding="utf-8")

        if (idx + 1) % 15 == 0 or idx == 89:
            print(f"  Processed {idx + 1}/90 specimens ({len(samples)} samples generated)...")

    duration = time.time() - start_time

    # Build Top-Level Manifest & Statistics
    manifest = manifest_builder.build_manifest(
        samples=samples,
        generation_seed=master_seed_val,
        formats=("pdf", "png", "jpeg"),
        generator_version=__version__,
        benchmark_version="1.0.0",
        dataset_version="1.0.0",
        experiment_id="AU_DIC_v1.0",
    )
    manifest_sha = manifest_builder.save_manifest(out_dir / "manifest.json", manifest)

    stats = stats_engine.compute_statistics(samples, duration, manifest_sha)
    stats_engine.save_statistics(out_dir / "statistics.json", stats)

    # Validate dataset integrity
    verifier = ManifestVerifier()
    is_valid, errors = verifier.verify_dataset(out_dir)

    # Export benchmark_certificate.json
    manifest_content = (out_dir / "manifest.json").read_text(encoding="utf-8")
    dataset_sha = sha256_string(manifest_content)

    certificate = {
        "dataset_id": "AU-DIC-BENCHMARK-V1.0",
        "title": "Academic Universe Document Intelligence Research Benchmark Dataset v1.0",
        "generator_version": __version__,
        "schema_version": "1.0.0",
        "benchmark_version": "1.0.0",
        "generation_timestamp": stats.generated_timestamp if hasattr(stats, "generated_timestamp") else "",
        "random_seed": master_seed_val,
        "manifest_sha256": manifest_sha,
        "dataset_sha256": dataset_sha,
        "file_counts": {
            "original_documents": 90,
            "quality_variants_per_doc": 4,
            "total_image_samples": 360,
            "pdfs": 90,
            "png_images": 360,
            "jpeg_images": 360,
            "ground_truth_jsons": 360,
            "metadata_jsons": 360,
            "reports": 1,
            "figures": 1,
        },
        "document_type_distribution": {
            "certificate": 30,
            "marksheet": 30,
            "student_id": 30,
        },
        "quality_profile_distribution": {
            "clean_pdf": 90,
            "scanner_copy": 90,
            "mobile_camera": 90,
            "rotated": 90,
        },
        "generation_duration_seconds": round(duration, 2),
        "throughput_samples_per_sec": round(360 / duration, 2) if duration > 0 else 0,
        "integrity_verified": is_valid,
        "verification_errors_count": len(errors),
    }

    cert_path = out_dir / "benchmark_certificate.json"
    cert_path.write_text(json.dumps(certificate, indent=2), encoding="utf-8")

    print("\n==========================================================")
    print(f"[SUCCESS] AU DIC Benchmark Dataset v1.0 Generation Complete!")
    print(f"   Original Documents: 90")
    print(f"   Total Image Samples: {len(samples)}")
    print(f"   Generation Duration: {duration:.2f} seconds ({360/duration:.2f} samples/sec)")
    print(f"   Certificate: {cert_path}")
    print("==========================================================")

    # Run full verification audit
    try:
        from adbg.scripts.verify_dataset import verify_au_dic_dataset
    except ImportError:
        try:
            from verify_dataset import verify_au_dic_dataset
        except ImportError:
            verify_au_dic_dataset = None

    if verify_au_dic_dataset:
        print("\n[RUNNING] Executing Dataset Verification Audit...")
        verify_au_dic_dataset(str(out_dir))


if __name__ == "__main__":
    generate_au_dic_benchmark(master_seed_val=42)
