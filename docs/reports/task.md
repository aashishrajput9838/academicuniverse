# ADBG v1.0 — Implementation Tasks

## Phase 1: Foundation (Core + Interfaces + Seed + Config) ✅ COMPLETE
- [x] Project structure — `pyproject.toml`, `README.md`, `generate.py`, all `__init__.py` files
- [x] `config/default.yaml` — Default generation configuration
- [x] `core/interfaces.py` — All ABCs and frozen dataclasses
- [x] `core/seed_manager.py` — Deterministic RNG with NumPy SeedSequence
- [x] `core/plugin_registry.py` — Plugin auto-registration with type safety
- [x] `utils/hashing.py` — SHA-256 checksums (file, bytes, string)
- [x] `utils/logging.py` — Structured logging with console + file handlers
- [x] `adbg/cli/main.py` — Click CLI with generate/validate/stats subcommands
- [x] `tests/conftest.py` — Shared test fixtures with autouse registry cleanup
- [x] `tests/test_seed_manager.py` — 24 tests covering determinism, bounds, selection, domain methods
- [x] `tests/test_plugin_registry.py` — 13 tests covering registration, retrieval, type safety
- [x] Verify: `pip install -e ".[dev]"` ✅ and `pytest` (37/37 passed) ✅

## Phase 2: Data Fabrication + Template Engine ✅ COMPLETE
- [x] Document schema versioning (`schema_version`, `generator_version`, `benchmark_version`, `dataset_version`)
- [x] Dual document IDs (`document_id`, `document_uuid`)
- [x] Multilingual locale preparation (`locale="en_IN"`)
- [x] Research metadata fields (`experiment_id`, `quality_profile`, `seed`)
- [x] `templates/validator.py` — `TemplateValidator` strict semver and schema validator
- [x] `data/providers.py` — `IDataProvider` abstraction hierarchy
- [x] `data/name_provider.py` — `FakerNameProvider`
- [x] `data/university_provider.py` — `YamlUniversityProvider`
- [x] `data/course_provider.py` — `YamlCourseProvider`
- [x] `data/roll_number_provider.py` — `PatternRollNumberProvider`
- [x] `data/grade_provider.py` — `StandardGradeProvider`
- [x] `data/date_provider.py` — `StandardDateProvider`
- [x] `data/fabricator.py` — `AcademicDataFabricator` orchestrator with provider injection
- [x] `data/catalogs/universities.yaml` — Configurable catalog (4 institutions)
- [x] `data/catalogs/subjects.yaml` — Reusable subject pools across 10 academic branches
- [x] `templates/loader.py` — Data-driven `YamlTemplateLoader`
- [x] `templates/renderer.py` — Generic `ReportLabTemplateRenderer`
- [x] `templates/definitions/*.yaml` — Data-driven templates (`marksheet_alpha`, `certificate_alpha`, `student_id_alpha`)
- [x] `tests/test_fabricator.py` — 7 unit tests
- [x] `tests/test_templates.py` — 6 unit tests

## Phase 3: Document Generators ✅ COMPLETE
- [x] `generators/certificate.py` — `CertificateGenerator` plugin (auto-registers)
- [x] `generators/marksheet.py` — `MarksheetGenerator` plugin (auto-registers)
- [x] `generators/student_id.py` — `StudentIDGenerator` plugin (auto-registers)
- [x] `generators/__init__.py` — Auto-registration package init
- [x] `tests/test_generators.py` — 4 unit tests

## Phase 4: CV Degradation Engine ✅ COMPLETE
- [x] `utils/pdf.py` — PDF page to NumPy BGR image rasterization via `pypdfium2`
- [x] 15 independent `DegradationOperator` plugins
- [x] `degradations/profiles.py` — `QualityProfileRegistry` with `clean_pdf`, `scanner_copy`, `mobile_camera`, `rotated`
- [x] `degradations/engine.py` — `DegradationEngine` executing ordered pipeline with deterministic SeedManager children & structured metadata return
- [x] `degradations/preview.py` — `DegradationPreviewGenerator` & `ContactSheetGenerator` with SHA-256 pixel checksums
- [x] `degradations/reporter.py` — `DegradationReporter` exporting JSON and Markdown audit reports
- [x] `degradations/figures.py` — `ResearchPaperFigureGenerator` producing publication-ready composite figures
- [x] `tests/test_degradations.py` & `tests/test_visual_regression.py` — 25 unit tests

## Phase 5: Benchmark Pipeline & Dataset Packaging ✅ COMPLETE
- [x] `groundtruth/builder.py` — `GroundTruthBuilder` exporting exact ground-truth JSON annotations
- [x] `metadata/builder.py` — `SampleMetadataBuilder` exporting per-sample metadata JSON records
- [x] `manifest/builder.py` — `ManifestBuilder` and `ManifestVerifier` for dataset manifests & integrity verification
- [x] `statistics/engine.py` — `StatisticsEngine` computing dataset metrics (counts, file size min/max/mean/median/std, manifest SHA-256)
- [x] `core/pipeline.py` — `GenerationPipeline` master orchestrator packaging dataset output (`pdf/`, `images/png/`, `images/jpeg/`, `groundtruth/`, `metadata/`, `manifest.json`, `statistics.json`, `reports/`, `figures/`)
- [x] `cli/main.py` — Wired Click CLI commands (`adbg generate`, `adbg validate`, `adbg stats`)
- [x] `tests/test_pipeline.py` — 3 end-to-end integration tests
- [x] Verify: `pytest` ✅ (82/82 passed in 9.23s) & E2E CLI dataset generation ✅
