# AUTOSAVE-CALLGRAPH INVESTIGATION

**Date:** 2026-07-23  
**Symptom:** Typing into the resume form triggers `POST /api/resume/generate`, causing Docxtemplater to execute and throw:
```
Could not find the body element: are you sure this is a docx file?
```
**Scope:** Read-only investigation. No code modified.

---

## 1. Frontend API Endpoint Called by `useAutoSave`

**File:** `app/dashboard/student/resume-builder/components/ResumeBuilderPage/hooks/useAutoSave.ts`

Line 4 imports `generateResume` from `@/components/Resume/api/resumeApi`:

```typescript
import { generateResume, fetchDraft } from '@/components/Resume/api/resumeApi';
```

Line 17-31 defines `saveDraft`:

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
}, [backendToken, templateId, formData, onSaveStart, onSaveSuccess, onSaveError]);
```

**Critical finding:** `saveDraft()` calls `generateResume()`, not a draft-save function.

**File:** `components/Resume/api/resumeApi.ts`

```typescript
export async function generateResume(
  backendToken: string,
  templateId: string,
  data: Record<string, any>,
  tone?: string
): Promise<GenerateResumeResponse> {
  return request<GenerateResumeResponse>(
    '/api/resume/generate',             // <-- LINE 45
    {
      method: 'POST',
      body: JSON.stringify({ templateId, data, tone }),
    },
    backendToken
  );
}
```

The autosave calls `POST /api/resume/generate` with `tone: 'none'`.

---

## 2. Backend Controller Receiving the Request

**File:** `backend/src/routes/resumeRoutes.ts`

```typescript
router.post('/generate', processResumeController);    // LINE 32
```

`POST /api/resume/generate` → `processResumeController`

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

    // Process using ResumeService
    const { docxBuffer, htmlPreview } = await resumeService.processResumeTemplate(template.fileUrl, data, tone, enhanceableTags); // LINE 261

    // Save draft in DB
    const studentResume = await StudentResume.findOneAndUpdate(
      { userId: req.user.userId, templateId },
      { filledData: data },
      { new: true, upsert: true }
    );

    const docxBase64 = docxBuffer.toString('base64');
    
    return sendResponse(res, 200, {
      htmlPreview,
      docxBase64,
      studentResumeId: studentResume._id
    }, 'Resume generated successfully');
    
  } catch (error: any) {
    logger.error('Error generating resume:', error);
    return sendError(res, 500, error.message || 'Failed to generate resume');
  }
};
```

---

## 3. Complete Call Graph

```
useAutoSave.ts:24
  → generateResume(backendToken, templateId, formData, 'none')
    → POST /api/resume/generate
      → processResumeController (resumeController.ts:238)
        → ResumeTemplate.findById(templateId) (resumeController.ts:250)
        → resumeService.processResumeTemplate(template.fileUrl, data, tone, enhanceableTags) (resumeController.ts:261)
          → ResumeService.processResumeTemplate (resumeService.ts:14)
            → axios.get(template.fileUrl, { responseType: 'arraybuffer' }) (resumeService.ts:18)
            → new PizZip(content) (resumeService.ts:22)
            → new Docxtemplater(zip, {...}) (resumeService.ts:25)
            → doc.setData(finalData) (resumeService.ts:37)
            → doc.render() (resumeService.ts:40)
              → EXCEPTION: "Could not find the body element: are you sure this is a docx file?"
```

---

## 4. Why Docxtemplater Is Executed During Draft Save

Docxtemplater is executed because `useAutoSave` is calling the **resume generation** endpoint (`POST /api/resume/generate`), not a draft save endpoint.

The `generateResume` API function in `resumeApi.ts` maps to `processResumeController` on the backend. That controller immediately calls `resumeService.processResumeTemplate()` at line 261, which:
1. Fetches the DOCX file from `template.fileUrl` (Cloudinary) via `axios.get`
2. Loads it into PizZip
3. Initializes Docxtemplater
4. Calls `doc.render()`

Docxtemplater then throws because:
- The template URL may point to a file that is not a valid DOCX
- Or the processed template URL stored in the database does not contain a proper `word/document.xml` body element
- Or the URL is inaccessible/returns HTML/error instead of DOCX binary

**Regardless of the specific DOCX content failure:** the root cause is that autosave should never invoke Docxtemplater. Autosave must only persist raw form data (`filledData`) to `StudentResume`.

---

## 5. Which Function Should Have Been Called Instead

The correct function should be a **draft save** operation, which would:

1. Call a `POST /api/resume/draft` endpoint (currently **does not exist**)
2. Or call an existing `findOneAndUpdate` on `StudentResume` with only `filledData`

**Evidence that draft save does not exist:**

Backend routes (`resumeRoutes.ts`):
```typescript
router.get('/draft', getSavedResumeController);    // LINE 34 — GET only, for fetching drafts
```

There is **no `POST /api/resume/draft`** route and **no `saveDraftController`** in the backend.

The `processResumeController` does save `filledData` via `StudentResume.findOneAndUpdate` (line 264), but only **after** full DOCX processing succeeds. This means autosave fails entirely if Docxtemplater throws.

---

## 6. Exact Route, Controller, Service, and Offending Line Numbers

| Layer | File | Line(s) | Role |
|-------|------|---------|------|
| Frontend hook | `app/dashboard/student/resume-builder/components/ResumeBuilderPage/hooks/useAutoSave.ts` | 24 | Calls `generateResume()` instead of saving draft |
| Frontend API | `components/Resume/api/resumeApi.ts` | 44-51 | Sends `POST /api/resume/generate` |
| Backend route | `backend/src/routes/resumeRoutes.ts` | 32 | Maps `/generate` → `processResumeController` |
| Backend controller | `backend/src/controllers/resumeController.ts` | 238-286 | Receives request, calls ResumeService |
| Offending service call | `backend/src/controllers/resumeController.ts` | 261 | `resumeService.processResumeTemplate(...)` |
| Service | `backend/src/services/resumeService.ts` | 14-64 | Fetches DOCX, initializes Docxtemplater |
| Offending line in service | `backend/src/services/resumeService.ts` | 40 | `doc.render()` — throws Docxtemplater error |

---

## 7. Is the Autosave Endpoint Accidentally Invoking Resume Generation or Template Processing?

**It is invoking resume generation.**

The autosave feature (`useAutoSave`) is wired to `generateResume()`, which maps to `POST /api/resume/generate`. This endpoint is designed for the explicit "Generate Resume" button action, not for background draft autosave.

The confusion is compounded by:
- The hook is named `useAutoSave` and the inner function is named `saveDraft`
- `fetchDraft` is imported but never used in the autosave path
- The `onSaveSuccess(formData)` callback at line 25 makes it appear that only draft data is being saved
- However, the `generateResume` call returns `{ htmlPreview, docxBase64, studentResumeId }` — full generation output, not draft confirmation

**The backend is not at fault for this specific routing.** The backend correctly maps `/generate` to generation logic. The error is on the frontend: the autosave hook calls the wrong API function.

---

## 8. Summary of Root Cause

| Question | Answer |
|----------|--------|
| Frontend endpoint | `POST /api/resume/generate` |
| Backend controller | `processResumeController` (`resumeController.ts:238`) |
| Service | `ResumeService.processResumeTemplate` (`resumeService.ts:14`) |
| Exception thrown by | Docxtemplater `doc.render()` (`resumeService.ts:40`) |
| Why Docxtemplater runs | Autosave calls resume generation instead of draft save |
| Correct function | A draft save endpoint that does `StudentResume.findOneAndUpdate({ filledData: data }, { upsert: true })` without DOCX processing |
| Missing backend piece | No `POST /api/resume/draft` endpoint exists |
| Faulty frontend code | `useAutoSave.ts:24` calls `generateResume()` instead of a `saveDraft()` function |

---

*End of report.*
