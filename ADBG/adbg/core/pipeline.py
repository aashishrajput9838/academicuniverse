"""
ADBG Generation Pipeline — Master Benchmark Orchestrator & Dataset Packaging Engine.

Generates complete, publication-ready synthetic academic document benchmark datasets.
"""

from __future__ import annotations

import time
from pathlib import Path

import cv2

from adbg.core.interfaces import (
    DatasetResult,
    GenerationConfig,
    SampleMetadata,
)
from adbg.core.plugin_registry import PluginRegistry
from adbg.core.seed_manager import SeedManager
from adbg.data.fabricator import AcademicDataFabricator
from adbg.degradations.engine import DegradationEngine
from adbg.degradations.figures import ResearchPaperFigureGenerator
from adbg.degradations.reporter import DegradationReporter
from adbg.groundtruth.builder import GroundTruthBuilder
from adbg.manifest.builder import ManifestBuilder
from adbg.metadata.builder import SampleMetadataBuilder
from adbg.statistics.engine import StatisticsEngine
from adbg.templates.loader import YamlTemplateLoader
from adbg.utils.logging import get_logger
from adbg.utils.pdf import pdf_bytes_to_image

logger = get_logger(__name__)


class GenerationPipeline:
    """
    Master end-to-end benchmark generation pipeline.
    """

    def __init__(
        self,
        fabricator: AcademicDataFabricator | None = None,
        template_loader: YamlTemplateLoader | None = None,
        degradation_engine: DegradationEngine | None = None,
    ) -> None:
        self.fabricator = fabricator or AcademicDataFabricator()
        self.template_loader = template_loader or YamlTemplateLoader()
        self.template_loader.load_all()
        self.degradation_engine = degradation_engine or DegradationEngine()
        self.gt_builder = GroundTruthBuilder()
        self.meta_builder = SampleMetadataBuilder()
        self.manifest_builder = ManifestBuilder()
        self.stats_engine = StatisticsEngine()

    def run(self, config: GenerationConfig) -> DatasetResult:
        """
        Run dataset benchmark generation based on GenerationConfig.

        Returns:
            DatasetResult detailing output directory, generated document count,
            manifest, statistics, and any errors.
        """
        start_time = time.time()
        out_dir = Path(config.output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)

        # Setup directory structure
        pdf_dir = out_dir / "pdf"
        png_dir = out_dir / "images" / "png"
        jpg_dir = out_dir / "images" / "jpeg"
        gt_dir = out_dir / "groundtruth"
        meta_dir = out_dir / "metadata"
        reports_dir = out_dir / "reports"
        figures_dir = out_dir / "figures"

        for d in [pdf_dir, png_dir, jpg_dir, gt_dir, meta_dir, reports_dir, figures_dir]:
            d.mkdir(parents=True, exist_ok=True)

        master_seed = SeedManager(seed=config.seed)
        samples: list[SampleMetadata] = []
        errors: list[str] = []

        doc_types = list(config.document_types)
        quality_profiles = list(config.quality_distribution.keys())
        quality_weights = list(config.quality_distribution.values())

        # Select matching templates for doc types
        available_templates = self.template_loader.load_all()

        logger.info(
            "Starting benchmark generation: %d documents, seed=%d -> %s",
            config.count,
            config.seed,
            out_dir,
        )

        for i in range(config.count):
            doc_seed = master_seed.child()
            try:
                # Pick doc type & quality profile
                doc_type = doc_seed.pick(doc_types)
                quality_prof = doc_seed.pick_weighted(quality_profiles, quality_weights)

                # Select template
                matching_templates = [
                    t for t in available_templates.values()
                    if t.metadata.document_type == doc_type
                ]
                if not matching_templates:
                    # Fallback default template per type
                    tmpl_id = f"{doc_type}_alpha"
                    template = self.template_loader.get_template(tmpl_id)
                else:
                    template = doc_seed.pick(matching_templates)

                # Fabricate data
                data = self.fabricator.fabricate_document_data(
                    seed=doc_seed.child(),
                    document_type=doc_type,
                    template_id=template.metadata.template_id,
                    template_version=template.metadata.template_version,
                    quality_profile=quality_prof,
                    schema_version=config.schema_version,
                    generator_version=config.generator_version,
                    benchmark_version=config.benchmark_version,
                    dataset_version=config.dataset_version,
                    experiment_id=config.experiment_id,
                    locale=config.locale,
                )

                # Generate clean PDF
                generator = PluginRegistry.get_generator(doc_type)
                gen_doc = generator.generate(data, template)

                pdf_path = pdf_dir / f"{data.document_id}.pdf"
                pdf_path.write_bytes(gen_doc.pdf_bytes)

                # Convert PDF to image BGR
                bgr_img = pdf_bytes_to_image(gen_doc.pdf_bytes)

                # Apply CV degradation
                deg_res = self.degradation_engine.apply_degradation(
                    bgr_img, quality_prof, doc_seed.child()
                )

                # Save PNG & JPEG
                png_path = png_dir / f"{data.document_id}.png"
                jpg_path = jpg_dir / f"{data.document_id}.jpeg"
                cv2.imwrite(str(png_path), deg_res.image)
                cv2.imwrite(str(jpg_path), deg_res.image, [cv2.IMWRITE_JPEG_QUALITY, 90])

                # Build & Save Ground Truth JSON
                gt_dict = self.gt_builder.build_ground_truth_dict(data, deg_res.parameters)
                gt_path = gt_dir / f"{data.document_id}.json"
                self.gt_builder.save_ground_truth(gt_path, gt_dict)

                # Build & Save Metadata JSON
                rel_pdf = str(pdf_path.relative_to(out_dir))
                rel_png = str(png_path.relative_to(out_dir))
                rel_jpg = str(jpg_path.relative_to(out_dir))
                rel_gt = str(gt_path.relative_to(out_dir))

                sample_meta = self.meta_builder.build_metadata(
                    data, rel_pdf, rel_png, rel_jpg, rel_gt, deg_res.parameters, base_dir=out_dir
                )
                meta_path = meta_dir / f"{data.document_id}.json"
                self.meta_builder.save_sample_metadata(meta_path, sample_meta)

                samples.append(sample_meta)

                # For the first specimen, generate paper figures & reports
                if i == 0:
                    fig_gen = ResearchPaperFigureGenerator()
                    fig_img = fig_gen.generate_publication_figure(bgr_img, doc_seed.child())
                    cv2.imwrite(str(figures_dir / "figure_1_degradation_grid.png"), fig_img)

                    reporter = DegradationReporter()
                    md_rep = reporter.generate_markdown_report(
                        data.document_id, quality_prof, data.seed, deg_res.parameters, sample_meta.checksum_sha256
                    )
                    (reports_dir / "degradation_audit.md").write_text(md_rep, encoding="utf-8")

            except Exception as exc:
                err_msg = f"Document {i+1} failed: {exc}"
                logger.error(err_msg)
                errors.append(err_msg)

        duration = time.time() - start_time

        # Build Manifest & Statistics
        manifest = self.manifest_builder.build_manifest(
            samples=samples,
            generation_seed=config.seed,
            formats=config.formats,
            generator_version=config.generator_version,
            benchmark_version=config.benchmark_version,
            dataset_version=config.dataset_version,
            experiment_id=config.experiment_id,
        )
        manifest_sha256 = self.manifest_builder.save_manifest(out_dir / "manifest.json", manifest)

        stats = self.stats_engine.compute_statistics(samples, duration, manifest_sha256)
        self.stats_engine.save_statistics(out_dir / "statistics.json", stats)

        logger.info("Generation complete: %d documents in %.2fs", len(samples), duration)

        return DatasetResult(
            output_dir=str(out_dir),
            total_documents=len(samples),
            manifest=manifest,
            statistics=stats,
            document_ids=[s.document_id for s in samples],
            errors=errors,
            generation_duration_seconds=round(duration, 3),
        )
