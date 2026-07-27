# Resume Builder Architecture Audit

## 1. Backend Endpoint Investigation

**Question:** Does a backend endpoint exist for processing uploaded templates?

**Answer:** Yes, but it is **not reachable**.

### Existing Processing Controller
- **File:** `backend/src/controllers/resumeController.ts:317`
- **Controller:** `processTemplateController`
- **Purpose:** Downloads a raw template, runs `TemplateProcessingOrchestrator`, uploads a processed DOCX, and returns `sections`, `entities`, `confidence`, and `placeholdersInjected`.

### Route Status
**File:** `backend/src/routes/resumeRoutes.ts`

Mapped routes:
- `POST /templates` → `uploadTemplateController`
- `GET /templates` → `getAvailableTemplatesController`
- `POST /generate` → `processResumeController`
- `POST /generate-resume` → `generateResumeController`
- `GET /draft` → `getSavedResumeController`

**Missing route:** `processTemplateController` is **never imported or mounted**. It exists only as an orphaned export.

### Reachability from Faculty UI
**NO.** There is no Faculty UI workflow that calls `processTemplateController` because no route exposes it.

### Persistence of Sections/Questions
**NO.** `processTemplateController` returns sections and entities in the response body, but it does **not** write them back to the `ResumeTemplate` document in MongoDB.

---

## 2. ResumeTemplate Model Review

**File:** `backend/src/models/ResumeTemplate.ts`

The schema supports persisted metadata:
- `sections` — array of `ITemplateSection`
- `questions` — array of question objects
- `formattingMetadata`
- `confidence`
- `reviewed`, `reviewNotes`

These fields are **defined in the schema** but are **not populated during upload**.

---

## 3. Upload Workflow Review

**File:** `backend/src/controllers/resumeController.ts:29`

`uploadTemplateController`:
1. Validates role (`FACULTY`, `ADMIN`, `SUPER_ADMIN`)
2. Accepts file upload
3. **Explicitly disabled:** interactive mappings (`DISABLED FOR MVP`, line 64)
4. **Explicitly disabled:** tag extraction and AI question generation (`DISABLED FOR MVP`, lines 98-123)
5. Uploads raw file to storage
6. Saves `ResumeTemplate` with `questions: []`
7. Returns template metadata

**Result:** The saved document has empty `sections` and empty `questions`.

---

## 4. Student Workflow Review

**File:** `backend/src/controllers/resumeController.ts:148`

`getAvailableTemplatesController`:
- Queries `ResumeTemplate` by organization and visibility rules
- Returns template documents **as stored**
- Because upload never ran processing, returned documents contain empty `sections` and `questions`

**File:** `backend/src/controllers/resumeController.ts:238`

`processResumeController`:
- Expects `templateId` and `data`
- Downloads template from `fileUrl`
- Calls `resumeService.processResumeTemplate(...)`
- This is the **student-facing generation** endpoint, not the faculty processing endpoint

---

## 5. Complete Template Lifecycle

```
Faculty Upload (POST /templates)
    ↓
Storage upload (fileUrl saved)
    ↓
ResumeTemplate saved with empty sections/questions
    ↓
[NO PROCESSING STEP EXISTS IN WORKFLOW]
    ↓
Student listing (GET /templates)
    ↓
Returns templates with sections: [], questions: []
    ↓
Student form render → zero fields
```

**Missing step:** Template structure extraction + section/question persistence after upload.

---

## 6. Why Student API Returns Empty Sections/Questions

1. **Upload does not trigger processing.** The question-generation block is explicitly disabled (`DISABLED FOR MVP`).
2. **No post-upload processing route exists.** `processTemplateController` is orphaned and unreachable.
3. **No persistence of extracted structure.** Even if processing were triggered manually, sections are not saved back to the `ResumeTemplate` document.

---

## 7. Root Cause Classification

| Option | Assessment |
|---|---|
| A) Missing UI | Partial — UI exists but has no trigger |
| B) Missing backend endpoint | **Primary** — `processTemplateController` exists but is not mounted |
| C) Missing persistence | **Secondary** — processing result is not saved to DB |
| D) Regression | No — this appears to be incomplete MVP scaffolding |
| E) Expected behavior | No — empty forms break the student resume flow |

**Verdict:** This is a backend workflow gap. The faculty upload is the only implemented faculty workflow. Template structure extraction is implemented as a standalone controller but is neither exposed via routes nor wired into the upload flow, and it does not persist results.

---

## 8. Evidence From Codebase

### Orphaned Controller
```typescript
// backend/src/controllers/resumeController.ts:317
export const processTemplateController = async (req: any, res: Response) => {
  // ... fully implemented but never used
};
```

### Missing Route
```typescript
// backend/src/routes/resumeRoutes.ts
// No route references processTemplateController
```

### Disabled Upload Processing
```typescript
// backend/src/controllers/resumeController.ts:98
/* DISABLED FOR MVP
try {
  // ... tag extraction and AI question generation
} catch (tagError: any) { ... }
*/
```

### Empty Persistence
```typescript
// backend/src/controllers/resumeController.ts:126
const template = new ResumeTemplate({
  templateName,
  type,
  target,
  fileUrl,
  organizationId,
  uploadedBy,
  questions, // always []
});
// sections NOT included
```

---

## 9. Recommended Fix Direction

1. Mount `processTemplateController` on a reachable route.
2. Either trigger processing automatically after upload, or expose a Faculty UI action to process templates.
3. Persist `sections`, `questions`, `formattingMetadata`, and `confidence` back to the `ResumeTemplate` document.
4. Return populated `sections` and `questions` in the student template listing response.
