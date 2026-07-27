# STORAGE-UPLOAD-TIMEOUT-INVESTIGATION

**Date:** 2026-07-23  
**Symptom:** `POST /api/resume/templates` returns HTTP 500 with `Storage upload failed: Request Timeout`  
**Scope:** Read-only code investigation — no files modified.

---

## 1. Upload Path Trace

```
POST /api/resume/templates
  router.post('/templates', upload.single('templateFile'), uploadTemplateController)
    ↓ resumeRoutes.ts:27
  uploadTemplateController (resumeController.ts:29–143)
    ↓ awaits storageService.uploadResumeTemplate(...) (resumeController.ts:89–93)
  StorageService.uploadResumeTemplate() (storageService.ts:108–140)
    ↓ uses cloudinary.uploader.upload_stream(...) with resource_type: 'raw'
    ↓ callback receives (error, result) -> reject / resolve
```

### Key files inspected
- `backend/src/routes/resumeRoutes.ts:16–27` — multer `memoryStorage` with 5 MB limit.
- `backend/src/controllers/resumeController.ts:29–93` — controller entry point.
- `backend/src/services/storageService.ts:108–140` — upload implementation.
- `backend/src/config/cloudinary.ts:1–11` — Cloudinary v2 configuration.
- `backend/package.json:38` — `cloudinary: ^2.9.0`.

---

## 2. Which Storage Provider Is Being Used

**Provider:** Cloudinary (Node.js SDK v2).

Despite a misleading comment in `resumeController.ts:88` that says:
> // Upload file to Firebase Storage

the actual call is:
```ts
const fileUrl = await storageService.uploadResumeTemplate(
  finalBuffer,
  file.originalname,
  organizationId
);
```

and `uploadResumeTemplate()` delegates to `cloudinary.uploader.upload_stream(...)` (`storageService.ts:117`), not Firebase Storage. The Firebase credentials in the environment are used by other services (e.g., Firestore, Auth, and the timetable upload path), but **resume template uploads go to Cloudinary**.

---

## 3. Which Function Throws "Request Timeout"

The error propagates through this chain:

1. Cloudinary Node.js SDK v2 internal HTTP client throws `Error: Request Timeout` while attempting the multipart upload to `api.cloudinary.com/v1_1/<cloud_name>/raw/upload`.
2. The `upload_stream` callback receives this error and executes:
   ```ts
   reject(new Error(error.message || 'Cloudinary upload failed'));
   ```
   (`storageService.ts:125–126`)
3. The wrapper `Promise` rejects.
4. The `catch` block in `uploadResumeTemplate()` catches it:
   ```ts
   throw new Error(`Storage upload failed: ${error.message}`);
   ```
   (`storageService.ts:138`)
5. `uploadTemplateController` catch block receives it and returns HTTP 500 with `error.message`.

**Exact thrower:** Cloudinary SDK’s internal HTTP client, surfaced via the `upload_stream` callback rejection.

---

## 4. Whether the Timeout Happens Before or During Upload

**During upload.**

Evidence:
- The `upload_stream` callback has **not** fired yet. If the timeout were pre-upload (e.g., DNS resolution, TLS handshake), Cloudinary’s SDK would typically surface a different error like `ENOTFOUND`, `ECONNREFUSED`, or `ETIMEDOUT` on the socket/connection level.
- Cloudinary SDK v2 uses an underlying HTTP client with a default request-level timeout. In the v2 SDK, the default timeout for uploads is **60 seconds** (the exact value depends on the SDK version, but it is a hard client-side timeout). After the file upload begins, if the transfer stalls or the response from `api.cloudinary.com` is not received within that window, the client aborts with `Request Timeout`.
- Because the buffer is already being streamed (via `uploadStream.end(buffer)` at `storageService.ts:134`), the upload phase is active. The timeout fires while the multipart body is in flight or while the client waits for the server response after the body is sent.

**Scenario more likely to trigger it:**
- Files close to the 5 MB multer limit.
- Slow egress bandwidth (e.g., deployment on Render/v1 free-tier or restrictive egress).
- Transient congestion to Cloudinary’s upload endpoint.

---

## 5. Bucket / Folder Configuration Validation

**Result:** Configuration is structurally correct.

- **Cloudinary folder:**
  ```ts
  folder: `academicuniverse/templates/${organizationId}`
  ```
  (`storageService.ts:120`)

- **Public ID:**
  ```ts
  public_id: `template_${Date.now()}_${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  ```
  (`storageService.ts:121`)

**Observations:**
- `organizationId` is taken from `req.user.organizationId` (`resumeController.ts:59`). The controller enforces role access first, so `organizationId` is expected to be present. If it were missing, Cloudinary would receive `academicuniverse/templates/undefined`, but the error would be a 400 from Cloudinary, not `Request Timeout`.
- The folder path matches the one documented in prior audit artifacts (`audit/12_CLOUDINARY_TRACE.md`, `RB-011-FACULTY-TEMPLATE-MANAGEMENT-ARCHITECTURE.md`).
- `resource_type: 'raw'` is appropriate for DOCX files.
- No explicit timeout or chunked-upload options are passed to `upload_stream`.

**Configuration verdict:** The failure is not caused by a misconfigured bucket/folder.

---

## 6. Promise Handling and Unresolved Promise Check

**Result:** The Promise wrapper is correctly structured. `uploadResumeTemplate()` does **not** return an unresolved promise.

```ts
return await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: 'raw', folder: ..., public_id: ... },
        (error, result) => {
            if (error) {
                return reject(new Error(error.message || 'Cloudinary upload failed'));
            }
            if (!result) {
                return reject(new Error('No result returned from Cloudinary'));
            }
            resolve(result.secure_url);
        }
    );
    uploadStream.end(buffer);
});
```

(`storageService.ts:116–135`)

Why it is safe:
1. `uploadStream.end(buffer)` is called synchronously before the async callback can fire, ensuring the data is submitted to the stream.
2. The callback is bound by the Cloudinary SDK and will be invoked exactly once on success or failure.
3. Every branch in the callback either `reject`s or `resolve`s.
4. The controller `await`s the call (`resumeController.ts:89`), so the request stays open until the promise settles.

**Therefore:** The 500/500-response is not caused by a missing `await` or an orphaned Promise. The error genuinely originates inside the Cloudinary SDK during the upload.

---

## 7. Summary of Findings

| Question | Answer |
|----------|--------|
| Storage provider | Cloudinary (SDK v2), not Firebase Storage |
| Function that throws | Cloudinary SDK internal HTTP client during `upload_stream` multipart upload |
| When does timeout happen | During upload (stream active, waiting for server response) |
| Bucket/folder config | Correct; `academicuniverse/templates/${organizationId}` |
| Unresolved promise | No; wrapper and `await` are correct |

---

## 8. Probable Root Cause

Cloudinary SDK v2 applies a **default client-side request timeout** to uploads. For files near the 5 MB limit, the upload exceeds this default window on constrained networks (e.g., Render deployment), causing the SDK to abort the request with `Request Timeout`.

The code does not configure:
- A larger timeout via Cloudinary options (`timeout`), environment variable, or HTTP agent.
- Chunked/resumable upload for larger files.

---

## 9. Recommended Investigation / Remediation Steps (read-only reference)

These are suggestions for follow-up; no code has been changed.

1. **Measure actual upload duration.** Wrap the `uploadResumeTemplate` call with timing logs to confirm that large files consistently exceed ~60 s.
2. **Increase Cloudinary SDK timeout.** The SDK accepts a `timeout` option (ms) in the signature object or via `cloudinary.config({ timeout: ... })`.
3. **Reduce effective payload.** Ensure frontend compresses/ rescales before upload; 5 MB DOCX files upload slowly.
4. **Set `chunk_size` / `chunk_transfer`.** For files > 5 MB (if limit is ever raised), enable chunked upload so the SDK can stream in pieces.
5. **Correct the misleading comment** in `resumeController.ts:88` ("Firebase Storage" → "Cloudinary") to prevent future confusion.

---

*End of report.*
