# STORAGE-UPLOAD-ROOT-CAUSE: INVESTIGATION PLAN

**Date:** 2026-07-23  
**Status:** Read-only plan. No code modified. No fixes proposed.  
**Goal:** Isolate whether `POST /api/resume/templates` `Request Timeout` is caused by:
- **A)** Cloudinary / SDK / network infrastructure, OR
- **B)** The specific DOCX/template being uploaded.

---

## 1. What Should Happen When Uploading `test.docx`

**Test artifact:** `test.docx` (~10–20 KB). Contents: the text `Hello World` created with any DOCX generator (LibreOffice, python-docx, Microsoft Word). No placeholders, no macros, minimal XML.

**Request shape:**
```
POST /api/resume/templates
Content-Type: multipart/form-data
Field: templateFile = test.docx
Field: templateName = Test
Field: type = global
```
Authentication must present a valid JWT for a user with role `FACULTY`, `ADMIN`, or `SUPER_ADMIN`.

**Expected successful execution path (code references included):**

1. **Multer intake** — `resumeRoutes.ts:16-21`  
   `multer.memoryStorage()` with `limits.fileSize: 5MB`. `test.docx` is ~20 KB, so Multer buffers the file into `req.file.buffer` without error.

2. **Controller validation** — `resumeController.ts:29-93`  
   - Auth middleware runs first (`resumeRoutes.ts:24`).  
   - Role check (`resumeController.ts:36-43`): must resolve to allowed role.  
   - File presence (`resumeController.ts:45-48`): `req.file` exists.  
   - Body validation (`resumeController.ts:50-53`): `templateName` and `type` present.

3. **Cloudinary upload initiation** — `storageService.ts:114`  
   Log line emitted: `Uploading resume template to Cloudinary: test.docx`.

4. **SDK network call** — `storageService.ts:117`, backed by `node_modules/cloudinary/lib/uploader.js:621-642`  
   - Signs multipart params with `timestamp`, `signature`, `api_key`.  
   - Creates `https.request` to `https://api.cloudinary.com/v1_1/demkeuigf/raw/upload`.  
   - Pipes a 20 KB Buffer through `UploadStream` into the POST body.  
   - `post_request.setTimeout(60000)` starts a 60-second socket idle timer.

5. **Cloudinary responds** — expected within seconds for 20 KB.  
   SDK `handle_response` receives status 200, parses JSON, calls bound callback with `(undefined, result)`.

6. **Promise resolves** — `storageService.ts:131` resolves with `result.secure_url`.

7. **DB save** — `resumeController.ts:126-136` creates `ResumeTemplate` document with `fileUrl`.

8. **HTTP response** — `sendResponse(res, 201, template, ...)` (`resumeController.ts:138`).

**Normal end-to-end outcome:** HTTP `201 Created` with `ResumeTemplate` JSON body. `performanceMonitorMiddleware` logs a request duration under 10 seconds.

---

## 2. Possible Outcomes and Their Meaning

### Outcome 1 — HTTP 201 Created
**Meaning:** The entire upstream path is healthy for this file.  
- Multer accepted the file.
- ResumeController did not reject auth/input.
- StorageService resolved the Promise.
- Cloudinary returned a signed asset URL.
- MongoDB accepted the insert.

**Implication for A vs B:** If the SAME endpoint and environment previously returned 500 on another template, the failure is **template-triggered** (B). Because DOCX **content** does not influence the Cloudinary multipart upload stream, the only template property that can trigger an upload failure is **file size or structural corruption that changes effective upload size/behavior**. If `test.docx` is 20 KB and the failing template is ~5 MB, the trigger is size. If both are ~20 KB and only one fails, the cause is environmental variance between requests (A), because file content cannot affect the upload stream.

---

### Outcome 2 — HTTP 500 with body containing `Request Timeout`
**Meaning:** The Cloudinary SDK aborted the socket after 60 seconds without a response (`node_modules/cloudinary/lib/uploader.js:635-638`).  
This error is synthetic; it only fires AFTER:
- TCP connection was established,
- the multipart request body was transmitted,
- **and 60 seconds of socket idle time elapsed waiting for the first response byte.**

It is NOT a pre-connection timeout (which would surface as `ECONNREFUSED`, `ENOTFOUND`, `ETIMEDOUT` from Node `https.request`).

**Implication for A vs B:**
- If `test.docx` (20 KB) also times out, the root cause is **A** (shared Cloudinary/network infrastructure). A 20 KB upload cannot legitimately take > 60 seconds; the timeout is caused by network path, host egress throttling, IPv6 blackholing, or SDK/platform interaction.
- If only the larger template times out, the failure is **size-triggered but still rooted in Cloudinary/network behavior** (the 60-second ceiling is an infrastructure property).

**How to rule out B entirely:** If `test.docx` also fails, B is falsified. The DOCX content is irrelevant.

---

### Outcome 3 — HTTP 413 Payload Too Large
**Meaning:** Multer rejected the file before the controller ran.  
Source: `resumeRoutes.ts:18-20` (`fileSize: 5 * 1024 * 1024`).

**Implication:** This is **not** the reported symptom, but it isolates Multer as the failing subsystem. If seen, the issue is client-side upload size.

---

### Outcome 4 — HTTP 400 / 401 / 403
**Meaning:** ResumeController validation or auth middleware rejected the request.  
Sources: `resumeController.ts:31-48`, `resumeController.ts:50-53`, `authenticateUser` middleware.

**Implication:** Not a storage failure. Isolates ResumeController or auth.

---

### Outcome 5 — Upload succeeds, but later processing fails
**Meaning:** The POST returns 201, but a subsequent `POST /templates/:id/process` or `POST /generate` returns 500.  
This is a **different symptom** from the reported upload timeout. If observed after a successful upload, investigation must shift to:
- `TemplateProcessingOrchestrator.process()` (`templateProcessingOrchestrator.service.ts:39-104`)
- `PlaceholderInjector.inject()` (`placeholderInjector.service.ts:56-200`)
- `Docxtemplater.render()` inside `ResumeService.processResumeTemplate()` (`resumeService.ts:40-44`)

**Subsystem responsibility map for downstream failures:**
- **TemplateProcessingOrchestrator:** orchestrates extraction → injection → generation. A crash here (`templateProcessingOrchestrator.service.ts:81-103`) wraps the error and returns `success: false`.
- **PlaceholderInjector:** parses XML, injects placeholders, rebuilds ZIP. Failures here produce `XML parsing failed`, `XML serialization failed`, or `DOCX generation failed` (`placeholderInjector.service.ts:77-83`, `160-166`, `184-190`).
- **Docxtemplater:** renders the final DOCX with data. Malformed placeholder XML (e.g., duplicate/misplaced braces) throws `TemplateError` / `Multi error` (`resumeService.ts:40-44`).

**Important:** None of these subsystems execute during `POST /api/resume/templates` in the current code. The upload controller has interactive mapping and tag extraction **disabled** (`resumeController.ts:64-86`, `96-123`). Therefore, they **cannot** cause an upload timeout. They can only cause failures in `/templates/:id/process` or `/generate`.

---

### Outcome 6 — Unhandled rejection / `UNCAUGHT EXCEPTION` / process crash
**Meaning:** An exception escaped all try/catch boundaries.  
Possible sources:
- `uploadStream.end(buffer)` throws synchronously due to an internal stream state (unlikely but observable).
- Cloudinary SDK internal throw not wrapped by `v1_result_adapter` (no evidence in reviewed code).
- `template.save()` throws (Mongoose/Mongo issue).

**Evidence:** `process.on('unhandledRejection')` handler (`backend/src/index.ts:9-14`) prints the reason and promise to stderr. This is distinct from a normal HTTP 500.

---

## 3. Decision Tree

```
START: POST /api/resume/templates with test.docx
|
|-- HTTP 413?
|   YES → Multer rejected file size. [MULTER]
|   NO  ↓
|
|-- HTTP 400 / 401 / 403?
|   YES → ResumeController validation or auth failed. [RESUME_CONTROLLER]
|   NO  ↓
|
|-- HTTP 201 Created?
|   YES → Upload path healthy for 20 KB.
|   |       Did the ORIGINAL template also fail with timeout?
|   |       YES → Failure is specific to the original template [B].
|   |              Because DOCX content does not affect Cloudinary upload,
|   |              the trigger is almost certainly FILE SIZE.
|   |              Upload path works; Cloudinary timeout is triggered only
|   |              by the larger payload.
|   |       NO  → Original template also succeeds → no failure. Investigation ends.
|   NO  ↓
|
|-- HTTP 500 with "Request Timeout" in body?
|   YES → Cloudinary SDK aborted after 60 s idle.
|   |       Did test.docx also fail?
|   |       YES → Shared path failure. Not template-specific. [A / CLOUDINARY_UPLOAD]
|   |       NO  → Size-triggered timeout. Document size is the discriminant.
|   |              Root cause is still Cloudinary's 60 s ceiling on this host.
|   |              The specific template is only the trigger. [A + size]
|   NO  ↓
|
|-- Unhandled rejection / process crash?
|   YES → Inspect 'unhandledRejection' stderr.
|   |       Likely [STORAGE_SERVICE] promise wrapper or [CLOUDINARY_UPLOAD] SDK crash.
|   |       Check if 'Uploading resume template to Cloudinary' log was emitted.
|   NO  ↓
|
|-- Other HTTP 500?
    YES → Inspect ResumeController catch block log line
           ('Error uploading template:', resumeController.ts:140).
           Check whether the failure originated in
           [RESUME_CONTROLLER] or [STORAGE_SERVICE].
```

**Key rule:** `PlaceholderInjector`, `Docxtemplater`, and `TemplateProcessingOrchestrator` are **not on the upload path**. They cannot be responsible for a failure of `POST /api/resume/templates`. They are only responsible for failures of `POST /templates/:id/process` or `POST /generate`.

---

## 4. Evidence to Collect After Each Experiment

Carry out **one experiment at a time** and collect the following before drawing conclusions.

### Experiment A — Upload `test.docx` (minimal DOCX)

| Evidence | Source / Location | What It Proves |
|----------|-------------------|----------------|
| HTTP status and response body | Client / API response | Whether upload endpoint returned 201, 413, 500, etc. |
| Request duration in ms | `backend/src/middleware/performanceMonitor.ts:12-24` | Confirms if request completed in < 60 s. |
| Log line: `Uploading resume template to Cloudinary: test.docx` | Winston logger (`storageService.ts:114`) | Confirms execution reached `StorageService.uploadResumeTemplate`. |
| Log line: `Cloudinary upload failed` | Winston logger (`storageService.ts:125`) | Confirms the SDK callback received an error object. |
| Log line: `Failed to upload resume template to Cloudinary` | Winston logger (`storageService.ts:137`) | Confirms the Promise catch executed. |
| Log line: `Error uploading template:` | Winston logger (`resumeController.ts:140`) | Confirms controller catch executed. |
| MongoDB insert check | `ResumeTemplate` collection | If a new document exists, upload succeeded end-to-end. If not, upload failed before save. |
| Node stderr on unhandled rejection | Process output | Detects crashes outside HTTP response flow. |
| Host TCP/HTTP trace (if shell available) | e.g., `curl -w '%{time_total}\n' -o /dev/null https://api.cloudinary.com` | Confirms host can reach Cloudinary and receive a response in < 10 s. |

### Experiment B — Upload original failing template (if size/behavior is suspect)

Run only after Experiment A succeeds.

| Evidence | Source / Location | What It Proves |
|----------|-------------------|----------------|
| Same Evidence Set as Experiment A | Same as above | Allows direct comparison of duration and outcome. |
| Exact `buffer.length` of the uploaded file | `req.file.size` or log in controller | Correlates file size with timeout. Must be present to prove/disprove size causation. |
| Cloudinary asset ID from successful upload | `result.public_id` in callback | Confirms Cloudinary actually processed the request if it succeeds. |

**Critical missing log:** The current code does **not** log `buffer.length`, `req.file.size`, or upload duration. Without this, you cannot correlate file size with timeout. Adding logging is required to prove size causation, but per instructions, no code changes are proposed in this plan.

---

## 5. Why Certain Subsystems Are Eliminated Up Front

| Subsystem | On Upload Path? | Can It Cause `Request Timeout`? | Reason |
|-----------|----------------|-------------------------------|--------|
| **Multer** | Yes — first handler | No (for < 5 MB) | `memoryStorage` with 5 MB limit. A 20 KB file cannot trigger `fileSize` limit. |
| **ResumeController** | Yes | No | Only synchronous validation + `await storageService.uploadResumeTemplate()`. No async work before or after upload that could hang the request. |
| **StorageService** | Yes | Possibly | Wraps Cloudinary SDK in a Promise. If callback never fires, Promise hangs. But callback design covers success, HTTP error, network error, and timeout. An unresolved Promise cannot produce HTTP 500; it would hang until Express/Node timeout, producing a different error. |
| **Cloudinary upload** | Yes | **Yes** — confirmed source of `Request Timeout` | Occurs in SDK internals (`node_modules/cloudinary/lib/uploader.js:621-642`, timeout at `:635`). |
| **TemplateProcessingOrchestrator** | **No** | **No** | Executed only by `processTemplateController` (`resumeController.ts:335`). Not called during upload. |
| **PlaceholderInjector** | **No** | **No** | Executed only inside `TemplateProcessingOrchestrator.process()` (`templateProcessingOrchestrator.service.ts:50`). Not on upload path. |
| **Docxtemplater** | **No** | **No** | Executed only inside `ResumeService.processResumeTemplate()` (`resumeService.ts:25-44`). Not on upload path. |

**Conclusion:** If the failure is `Request Timeout` on `POST /api/resume/templates`, the only responsible subsystems are **Cloudinary upload** (SDK/network) or **StorageService** (if it were wrapping the Promise incorrectly, which analysis shows it is not). The processing chain is irrelevant to this symptom.

---

## 6. Precise Action Plan

1. Create `test.docx` (10–20 KB, plain text `Hello World`).
2. Ensure the backend is running with the same `.env.development` used in the failing environment.
3. Send `POST /api/resume/templates` with `test.docx` and valid auth.
4. Record the outcome (HTTP status, duration, logs, DB state).
5. Compare to the original failing template upload.
6. Apply the decision tree above to assign responsibility.

Do not modify any source code during this investigation.
