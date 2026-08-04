# PIPELINE DEVELOPER & EXTENSION GUIDE

**Package**: `paper_pipeline/`  
**Python Version**: `>= 3.9`  

---

## 1. Local Development Setup

```bash
# Install core dependencies
pip install pytest python-docx Pillow win32com

# Run the full pipeline
python -m paper_pipeline.main

# Run pytest test suite
pytest paper_pipeline/tests/
```

---

## 2. Adding Custom Evaluators or Renderers

To add new custom publication validators:
1. Create a module under `paper_pipeline/validator/`.
2. Inherit from `BaseValidator` and implement `.validate()`.
3. Register the validator in `paper_pipeline/main.py`.
