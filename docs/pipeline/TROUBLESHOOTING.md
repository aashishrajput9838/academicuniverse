# PIPELINE TROUBLESHOOTING GUIDE

---

## Common Issues & Solutions

### 1. `PermissionError: [Errno 13] Permission denied: 'Paper_V3_IEEE.docx'`
- **Cause**: The `.docx` file is currently opened in Microsoft Word.
- **Solution**: Close Microsoft Word before running `python -m paper_pipeline.main`.

### 2. Pytest Import Failure
- **Cause**: Python path missing current directory.
- **Solution**: Run `python -m pytest paper_pipeline/tests/`.
