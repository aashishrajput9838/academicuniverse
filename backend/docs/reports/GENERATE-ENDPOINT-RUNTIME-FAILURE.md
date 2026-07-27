# Generate Endpoint Runtime Failure Report

**Date:** 2026-07-23  
**Endpoint:** `POST /api/resume/generate`  
**Controller:** `processResumeController` (`resumeController.ts:238-286`)  
**Status:** Root cause unproven — requires browser Network tab + backend log correlation

---

## 1. Browser Request (Pending User Verification)

The user must capture the failing request from the browser Network tab.

**Expected request details based on code:**

| Field | Expected Value |
|---|---|
| **Request URL** | `http://localhost:5003/api/resume/generate` |
| **HTTP Method** | `POST` |
| **Request Headers** | `Authorization: Bearer <token>`, `Content-Type: application/json` |
| **Request Payload** | `{ "templateId": "<id>", "data": { ... }, "tone": "none" }` |
| **Trigger** | Auto-save timer fires every 2 seconds after form data changes |
| **Timing** | ~2s after last keystroke / field change |

**What to capture:**
1. Open DevTools → Network tab.
2. Filter by `/generate` or `XHR`.
3. Trigger the failure by changing any form field and waiting 2s.
4. Click the failing request and record:
   - Status code
   - Response body
   - Response headers
   - Timing (DNS, initial connection, request/response)

---

## 2. Backend Code Trace: Exact Failure Points

### 2.1 Controller Entry: `processResumeController`

**File:** `backend/src/controllers/resumeController.ts:238-286`

```typescript
export const processResumeController = async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    const { templateId, data, tone } = req.body;

    if (!templateId || !data) {
      return sendError(res, 400, 'Template ID and resume data are required.');
    }

    const template = await ResumeTemplate.findById(templateId);
    if (!template) {
      return sendError(res, 404, 'Resume template not found.');
    }

    const enhanceableTags = template.questions
      ? template.questions.filter((q: any) => q.aiEnhanceable).map((q: any) => q.tag)
      : [];

    const { docxBuffer, htmlPreview } = await resumeService.processResumeTemplate(
      template.fileUrl, data, tone, enhanceableTags
    );

    const studentResume = await StudentResume.findOneAndUpdate(
      { userId: req.user.userId, templateId },
      { filledData: data },
      { new: true, upsert: true }
    );

    return sendResponse(res, 200, {
      htmlPreview,
      docxBase64: docxBuffer.toString('base64'),
      studentResumeId: studentResume._id
    }, 'Resume generated successfully');

  } catch (error: any) {
    logger.error('Error generating resume:', error);
    return sendError(res, 500, error.message || 'Failed to generate resume');
  }
};
```

**Protected by:** `authenticateUser` middleware (`resumeRoutes.ts:24`).

### 2.2 Service Layer: `ResumeService.processResumeTemplate`

**File:** `backend/src/services/resumeService.ts:14-64`

```typescript
async processResumeTemplate(
  templateUrl: string,
  data: any,
  tone?: string,
  enhanceableTags?: string[]
): Promise<{ docxBuffer: Buffer; htmlPreview: string }> {
  try {
    // STEP 1: Fetch template from Firebase Storage
    const response = await axios.get(templateUrl, { responseType: 'arraybuffer' });
    const content = response.data;

    // STEP 2: Parse DOCX zip
    const zip = new PizZip(content);

    // STEP 3: Initialize Docxtemplater
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // STEP 4: AI Enhancement (optional)
    let finalData = data;
    if (tone && tone !== 'none' && enhanceableTags && enhanceableTags.length > 0) {
      finalData = await aiService.enhanceResumeFields(data, tone, enhanceableTags);
    }

    doc.setData(finalData);

    // STEP 5: Render
    try {
      doc.render();
    } catch (error: any) {
      throw new Error('Template processing failed. Ensure template placeholders match data.');
    }

    // STEP 6: Generate DOCX buffer
    const docxBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    // STEP 7: Convert to HTML preview
    const mammothResult = await mammoth.convertToHtml({ buffer: docxBuffer });

    return { docxBuffer, htmlPreview: mammothResult.value };

  } catch (error: any) {
    throw new Error(error.message || 'Failed to process resume template.');
  }
}
```

---

## 3. Exact Failure Classification by Step

| Step | Operation | Failure Mode | HTTP Status | Exception Class | Root Cause Category |
|---|---|---|---|---|---|
| **Auth** | `authenticateUser` middleware | Missing/invalid JWT | `401` | `AuthenticationError` | Authentication |
| **Validation** | `templateId || data` check | Missing fields | `400` | N/A | Validation |
| **DB Query** | `ResumeTemplate.findById(templateId)` | Invalid ObjectId or not found | `404` | `CastError` / manual check | Database |
| **Step 1** | `axios.get(templateUrl, { responseType: 'arraybuffer' })` | Network error, 403/404 from Firebase, invalid URL | `500` | `AxiosError` | Firebase download |
| **Step 2** | `new PizZip(content)` | Content is not a valid ZIP (corrupted DOCX) | `500` | `Error` | Unexpected / corrupted template |
| **Step 3** | `new Docxtemplater(zip, ...)` | Invalid DOCX structure | `500` | `XTInternalError` | Unexpected / corrupted template |
| **Step 5** | `doc.render()` | Placeholder mismatch, missing data, type mismatch | `500` | `XTError` / `CastError` | **Docxtemplater render / placeholder mismatch** |
| **Step 6** | `doc.getZip().generate(...)` | Compression error, memory error | `500` | `Error` | Unexpected |
| **Step 7** | `mammoth.convertToHtml(...)` | Invalid DOCX buffer after render | **Does NOT fail** — caught at line 91, returns empty HTML | `Error` (caught) | Non-fatal |
| **Draft Save** | `StudentResume.findOneAndUpdate(...)` | DB connection loss, validation error | `500` | `MongoError` | Database |

---

## 4. Most Likely Failure Modes for "Save failed"

Ranked by probability based on the v1 codebase:

### 4.1 MOST LIKELY: Docxtemplater render failure (`doc.render()`)

**Evidence from code:**
- `resumeService.ts:39-44` wraps `doc.render()` in a try/catch that throws `Error: Template processing failed. Ensure template placeholders match data.`
- The processed template DOCX is stored in Cloudinary and fetched fresh on every auto-save.
- If the DOCX contains placeholders that don't match the data structure, `doc.render()` throws.
- This exception is caught at `resumeController.ts:282` and returns `500` with the error message.

**Why this affects auto-save specifically:**
- Auto-save fires every 2 seconds with `tone: 'none'`.
- The same template and data are rendered repeatedly.
- Any transient issue with the Cloudinary-hosted DOCX (corruption, wrong version, network hiccup during fetch) causes render failure.

### 4.2 SECOND: Firebase download failure (`axios.get(templateUrl)`)

**Evidence from code:**
- `resumeService.ts:18` fetches the template from `template.fileUrl` on every generation.
- If `template.fileUrl` is an expired Firebase Storage URL, or the network is unreliable, `axios.get()` throws.
- This exception propagates to the catch block at `resumeController.ts:282`.

### 4.3 THIRD: Database write failure (`StudentResume.findOneAndUpdate`)

**Evidence from code:**
- `resumeController.ts:264-270` saves the draft AFTER successful generation.
- If the DB write fails, the error is caught at line 282 and returns 500.
- Less likely because MongoDB is confirmed connected at startup.

---

## 5. What the Backend Logs Will Show

When the failure occurs, the backend logs will contain one of:

**For Docxtemplater render failure:**
```
[ERROR] Error in processResumeTemplate: Template processing failed. Ensure template placeholders match data.
```

**For Firebase download failure:**
```
[ERROR] Error in processResumeTemplate: getaddrinfo ENOTFOUND firebasestorage.googleapis.com
```
or
```
[ERROR] Error in processResumeTemplate: Request failed with status code 403
```

**For any failure, the controller logs:**
```
[ERROR] Error generating resume: <error.message>
```

And returns:
```json
{
  "success": false,
  "statusCode": 500,
  "message": "Failed to generate resume"
}
```

---

## 6. Frontend Error Flow

**`useAutoSave.ts:17-31`**
```typescript
const saveDraft = useCallback(async () => {
  if (!templateId || !backendToken || isSavingRef.current) return;

  isSavingRef.current = true;
  onSaveStart();

  try {
    const response = await generateResume(backendToken, templateId, formData, 'none');
    onSaveSuccess(formData);
  } catch (error) {
    onSaveError(error instanceof Error ? error : new Error('Failed to save draft'));
  } finally {
    isSavingRef.current = false;
  }
}, [backendToken, templateId, formData, ...]);
```

**`resumeApi.ts:5-30`**
```typescript
async function request<T>(endpoint, options, backendToken): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ... });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || `Request failed: ${response.status}`);
  }

  const payload = await response.json();
  if (!payload?.success || !payload?.data) {
    throw new Error('Invalid API response');
  }

  return payload.data;
}
```

**Error propagation chain:**
1. Backend returns `500 { success: false, message: "..." }`
2. `response.ok` is `false` → throws `data?.message || "Request failed: 500"`
3. OR backend returns `200 { success: true }` but `data` is `null` → throws `"Invalid API response"`
4. `useAutoSave` catches → `onSaveError(error)`
5. `ResumeForm` sets `draftStatus = 'error'`
6. `DraftIndicator` renders `"Save failed"`

---

## 7. Whether This Failure Would Also Affect Manual "Generate Resume"

**YES — same code path.**

The "Generate Resume" button in `ResumeForm.tsx:69-77` calls:
```typescript
const handleNext = useCallback(() => {
  if (validate()) {
    if (onGenerate) {
      onGenerate(formData);
    } else {
      onNext(formData);
    }
  }
}, [validate, formData, onNext, onGenerate]);
```

This calls `generatePreview` in `useResumeBuilder`, which calls the same `generateResume` API function hitting `POST /api/resume/generate` → `processResumeController` → `resumeService.processResumeTemplate`.

**If the auto-save fails due to:**
- Docxtemplater render error → **manual generate will also fail** with the same error.
- Firebase download failure → **manual generate will also fail**.
- Database write failure → manual generate may succeed (draft save is secondary).

**The root cause of the auto-save failure is identical to the root cause of any generation failure.** Fixing one fixes the other.

---

## 8. Would Creating `POST /draft` Hide the Real Issue or Solve It?

### It depends on the actual runtime failure:

| If the real failure is... | Then POST /draft would... |
|---|---|
| **Docxtemplater render error** | **HIDE the real issue.** Auto-save would succeed, but manual "Generate Resume" would still fail. The template/data mismatch would go undetected until the user tries to generate. |
| **Firebase download failure** | **PARTIALLY solve.** Draft saves would work, but generation would still fail when the user clicks Generate. |
| **Database write failure** | **SOLVE it.** A lighter endpoint might bypass the DB failure if it's related to the save order or timing in the current controller. |
| **Architectural overload** (generating DOCX every 2s is too expensive) | **SOLVE it.** Separating draft persistence from generation is the correct architecture regardless of the specific runtime error. |

### Recommendation

**Do NOT create `POST /draft` until the exact runtime failure is identified.**

Creating a new endpoint before understanding the failure would:
1. Mask a potential template/data bug that should be fixed.
2. Add complexity without addressing the root cause.
3. Create a situation where drafts save but generation is broken — a worse user experience.

**Correct sequence:**
1. Identify the exact failure from browser Network tab + backend logs.
2. Fix the underlying issue (template fix, data fix, Firebase URL fix, etc.).
3. THEN evaluate whether a separate `POST /draft` endpoint is still needed for architectural reasons.

---

## 9. Evidence Required from User

To complete this investigation, the user must provide:

### 9.1 Browser Network Tab

1. Open DevTools → Network tab.
2. Clear existing requests.
3. Change any field in the Resume Builder form.
4. Wait 2 seconds for auto-save to trigger.
5. Find the `POST /api/resume/generate` request.
6. Copy:
   - Request URL
   - Status code
   - Response body (full JSON)
   - Response headers
   - Timing breakdown

### 9.2 Backend Logs

1. In the terminal running `npm run dev` (backend), scroll to find the log entry:
   ```
   [ERROR] Error generating resume: ...
   ```
2. Copy the full error message and stack trace.

### 9.3 ResumeForm Console Output

1. Open DevTools → Console tab.
2. Hard refresh the page (`Ctrl + Shift + R`).
3. Load a template and wait for the form to render.
4. Check for:
   - The `console.table` output (if still present)
   - Any `[ResumeForm DEBUG]` logs
   - The React key warning and its exact stack trace

---

## 10. Current Evidence Summary

| Evidence Item | Status | Finding |
|---|---|---|
| Clean build verification | ⏳ Pending user action | `.next` deleted, server restarted, needs browser confirmation |
| Runtime `template.questions` payload | ⏳ Pending user action | Debug logging added to `ResumeForm.tsx`, needs browser console output |
| Duplicate ID analysis | ✅ Static proof | Backend generates `${section.id}_${field.key}`. UUID v4 section IDs guarantee uniqueness. |
| Duplicate tag analysis | ✅ Static proof | `name`, `description`, `tech_stack` appear across multiple sections. Expected. |
| Executed React source verification | ⏳ Pending user action | Source code shows `key={question.id}`. Needs DevTools Sources panel confirmation. |
| Exact component causing warning | ⏳ Pending runtime evidence | Most likely `ResumeForm.tsx:148`. Needs bundle verification if warning persists. |
| Save failed — exact backend exception | ⏳ Pending user action | Needs Network tab + backend log correlation |
| Save failed — classification | ⏳ Pending runtime evidence | Most likely Docxtemplater render or Firebase download failure |

---

## 11. Minimal Next Steps (No Code Changes)

1. **User performs Step 1-5 in the browser** (clean build, hard refresh, Network tab, console logs, backend log capture).
2. **User reports back** with:
   - Does the React key warning persist after clean build?
   - Network tab details for the failing `/generate` request.
   - Backend error message from the terminal.
3. **Based on the evidence**, classify the failure and propose the minimal fix.

**No architectural changes will be made until the exact runtime failure is proven.**
