# Academic Document Benchmark Generator (ADBG)

**Version:** 1.0.0

A production-quality, research-grade framework for generating realistic synthetic academic documents with complete benchmark metadata and ground-truth annotations.

## Purpose

ADBG generates configurable-size datasets of synthetic academic documents — certificates, marksheets, student ID cards — together with exact ground-truth JSON, per-sample metadata, dataset manifests, and computed statistics. Every output is deterministically reproducible given a random seed.

**This is NOT an OCR or Document AI system.** ADBG only _generates_ benchmark datasets. Those datasets are consumed by AU DIC and other Document Intelligence systems for evaluation.

## Quick Start

```bash
# Install in development mode
cd ADBG
pip install -e ".[dev]"

# Generate 100 documents (seed=42)
python generate.py generate --documents 100 --seed 42 --output ./dataset

# Run tests
pytest
```

## Architecture

```
ADBG/
├── adbg/               ← Python package
│   ├── core/           ← Interfaces, SeedManager, PluginRegistry, Pipeline
│   ├── generators/     ← Document type plugins (Certificate, Marksheet, ID)
│   ├── templates/      ← YAML-driven university template engine
│   ├── data/           ← Academic data fabrication (Faker + custom)
│   ├── degradations/   ← CV degradation operators (blur, noise, perspective, etc.)
│   ├── groundtruth/    ← Ground truth JSON builder
│   ├── metadata/       ← Per-sample metadata builder
│   ├── manifest/       ← Dataset manifest builder
│   ├── statistics/     ← Dataset statistics engine
│   ├── cli/            ← Click CLI entry point
│   └── utils/          ← Hashing, logging
├── config/             ← YAML configuration files
├── tests/              ← pytest test suite
├── docs/               ← Architecture and extension documentation
├── generate.py         ← Convenience entry point
└── pyproject.toml      ← PEP 621 project configuration
```

## Key Design Principles

- **Zero manual dataset creation** — everything is generated programmatically
- **Deterministic reproduction** — same seed always produces identical output
- **Plugin architecture** — new document types require zero core changes
- **YAML templates** — add new university designs without writing Python
- **CV degradation engine** — realistic scanner/camera/rotation simulations via OpenCV
- **Architecturally independent** — no dependencies on Academic Universe backend/frontend

## Tech Stack

| Component | Technology |
|:---|:---|
| Language | Python 3.12+ |
| PDF Rendering | ReportLab |
| Image Processing | Pillow, OpenCV |
| Numerical Computing | NumPy |
| Data Fabrication | Faker |
| Configuration | PyYAML |
| CLI | Click |
| Testing | pytest |

## Adding a New Document Type

1. Create `adbg/generators/my_document.py`
2. Implement the `DocumentGenerator` ABC
3. Register with `PluginRegistry.register_generator(MyGenerator)`
4. Import in `adbg/generators/__init__.py`

No other files need to change. See `docs/extending.md` for details.

## License

MIT
