# Troubleshooting Guide

## Common Issues

### 1. Placeholder Injection Returns 0 Placeholders
**Cause:** Template lacks detectable section headings or fields.
**Fix:**
- Verify template has bold/underline/numbered headings
- Re-run extraction and check `sectionsDetected`

### 2. docxtemplater Duplicate Tag Errors
**Cause:** Duplicate placeholder keys across sections.
**Fix:**
- Ensure `PlaceholderInjector` unique key scoping is active
- Regenerate processed template

### 3. Memory Leak on Large Templates
**Cause:** Large DOCX buffers held in memory.
**Fix:**
- Increase Node.js heap: `NODE_OPTIONS=--max_old_space_size=4096`
- Consider streaming generation for >5MB templates

### 4. Cloudinary Upload Failures
**Cause:** Invalid credentials or network issue.
**Fix:**
- Verify `CLOUDINARY_URL`
- Check network egress
- Fall back to local storage if configured

### 5. PDF Extraction Returns Empty Text
**Cause:** PDF is scanned/image-based.
**Fix:**
- Use OCR preprocessing
- Reject unsupported PDFs with clear error
