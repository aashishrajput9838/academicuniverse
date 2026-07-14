# Cloudinary / Upload Trace

Flow summary:
- Upload entrypoint: `POST /api/resume/templates` → `uploadTemplateController` (protected by `authenticateUser`) with `multer.memoryStorage()` and 5MB limit. Evidence: `backend/src/routes/resumeRoutes.ts` and `backend/src/controllers/resumeController.ts`.
- Storage service: `storageService.uploadResumeTemplate` uses Cloudinary `uploader.upload_stream` with `resource_type: 'raw'` and folder `academicuniverse/templates/${organizationId}`. Evidence: `backend/src/services/storageService.ts`.

Validation checks:
- File size: enforced by multer `limits.fileSize = 5MB`.
- MIME type: No strict whitelist enforced. `storageService.getContentType` maps by extension for Firebase uploads but Cloudinary upload does not validate MIME — potential to upload arbitrary file types.

Extraction / parsing:
- Template tag extraction (DOCX parsing) is present but disabled (`DISABLED FOR MVP` comments) in `uploadTemplateController`.

Delete path:
- Resume template deletion behavior not centralised here — deletion likely handled by template management code (search `ResumeTemplate` delete paths). Cloudinary deletions are not observed in the upload controller.

Recommendations:
1. Add MIME whitelist checks in `uploadTemplateController` to enforce `.docx` and known template types server-side.
2. Ensure Cloudinary public_id naming does not include user-controlled characters without sanitization (current code replaces unsafe chars for `public_id` but double-check edge cases).
3. Implement secure delete flow that removes Cloudinary object and DB metadata atomically.
