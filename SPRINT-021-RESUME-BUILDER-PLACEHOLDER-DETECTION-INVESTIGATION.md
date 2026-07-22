# Sprint-021: Resume Builder Placeholder Detection Investigation Report

## Issue
Student Resume Builder shows "Step 1 of 1" with no input fields. Every template card displays "0 fields". The dynamic form generator renders nothing because `template.questions` is empty.

## Investigation Scope
- Examined: `backend/src/controllers/resumeController.ts`
- Examined: `backend/src/services/resumeService.ts`
- Examined: `backend/src/services/aiService.ts`
- Examined: `backend/src/models/ResumeTemplate.ts`
- Examined: `app/dashboard/student/resume-builder/components/ResumeForm/ResumeForm.tsx`
- Examined: `app/dashboard/student/resume-builder/components/ResumeForm/FormFieldRenderer.tsx`
- Examined: `app/dashboard/student/resume-builder/components/TemplateSelection/TemplateCard.tsx`

No code was modified.

---

## 1. Complete Flow Trace

```
Faculty Upload (DOCX)
    │
    ▼
resumeController.uploadTemplateController()
    │
    ├── File saved to Firebase Storage
    │
    ├── /* DISABLED FOR MVP */  ← EXACT FAILURE POINT
    │   Placeholder extraction block is commented out
    │   PizZip never reads word/document.xml
    │   {{tags}} never extracted
    │   aiService.generateTemplateQuestions() never called
    │
    └── ResumeTemplate saved with questions: []
            │
            ▼
GET /api/resume/templates
    │
    ▼
ResumeTemplate returned with questions: []
    │
    ▼
Frontend TemplateCard shows "0 fields"
    │
    ▼
Student selects template
    │
    ▼
ResumeForm renders template.questions.map(...)
    │
    ▼
Zero <FormFieldRenderer> components rendered
    │
    ▼
FormNavigation shows "Step 1 of 1" with empty form
```

---

## 2. Exact Failure Point

**File:** `backend/src/controllers/resumeController.ts`
**Lines:** 95-120
**Function:** `uploadTemplateController`

```typescript
// Extract tags from DOCX and generate AI questions
let questions: any[] = [];

/* DISABLED FOR MVP
try {
  const PizZip = (await import('pizzip')).default;
  const zip = new PizZip(finalBuffer);
  const docXml = zip.file('word/document.xml')?.asText() || '';
  
  // Strip XML formatting tags to reconstruct raw text. 
  const cleanText = docXml.replace(/<[^>]+>/g, '');
  const matches = cleanText.match(/\{\{([^}]+)\}\}/g);
  
  if (matches) {
    const rawTags = matches.map((m: string) => m.replace(/\{\{|\}\}/g, '').trim());
    const uniqueTags = [...new Set(rawTags)];
    
    if (uniqueTags.length > 0) {
       logger.info(`Found ${uniqueTags.length} unique tags in uploaded template: ${uniqueTags.join(', ')}`);
       const { default: aiService } = await import('../services/aiService');
       questions = await aiService.generateTemplateQuestions(uniqueTags);
    }
  } else {
    logger.warn('No {{tags}} found in the uploaded document.');
  }
} catch (tagError: any) {
  logger.error('Failed to extract tags or generate AI questions:', tagError);
}
*/
```

The entire block is wrapped in `/* DISABLED FOR MVP */` ... `*/` comments. Execution never enters the `try` block. `questions` remains `[]`.

---

## 3. What the Disabled Code Would Do (If Enabled)

If uncommented, the logic would:

1. Open the uploaded DOCX using PizZip
2. Extract `word/document.xml` from the ZIP
3. Strip XML tags to get raw text: `docXml.replace(/<[^>]+>/g, '')`
4. Match placeholders with regex: `/\{\{([^}]+)\}\}/g`
5. Deduplicate tags: `[...new Set(rawTags)]`
6. Call `aiService.generateTemplateQuestions(uniqueTags)` to convert tags into structured questions
7. If AI is not configured, fallback creates basic questions:
   ```javascript
   tags.map(tag => ({
       tag,
       question: `Please enter details for ${tag.replace(/_/g, ' ')}`,
       type: 'text',
       aiEnhanceable: false
   }))
   ```

---

## 4. Why "0 fields" Appears Everywhere

| Location | Code | Why it shows 0 |
|----------|------|----------------|
| `TemplateCard.tsx:30` | `{template.questions.length} fields` | `questions` is `[]` |
| `ResumeForm.tsx:132-140` | `template.questions.map((question) => ...)` | Array is empty, no `FormFieldRenderer` rendered |
| `ResumeForm.tsx:143-151` | `FormNavigation currentStep={0} totalSteps={1}` | Only one step exists (the form), but with 0 questions |
| `ResumeForm.tsx:109` | `ResumeSkeleton count={template.questions.length}` | Skeleton shows 0 items |

---

## 5. Whether Placeholders Exist in Uploaded DOCX

**Cannot be determined from code alone.** The investigation confirms that:

1. The extraction code is disabled, so we don't know if the uploaded templates contain `{{name}}`, `{{email}}`, `{{skills}}`, etc.
2. The regex `/\{\{([^}]+)\}\}/g` would match any `{{...}}` pattern in the raw DOCX text.
3. If templates DO contain placeholders, they would be extracted once the code is enabled.
4. If templates do NOT contain placeholders, 0 fields would still be the correct result — but this should be verified against actual DOCX content.

**Recommended verification:** Inspect the actual DOCX files in Firebase Storage or download them and check for `{{...}}` patterns.

---

## 6. Root Cause

**Primary Root Cause: Placeholder extraction is intentionally disabled.**

The `/* DISABLED FOR MVP */` comment in `resumeController.ts:95-120` disables the entire placeholder extraction pipeline. This was likely a temporary measure during MVP development that was never re-enabled.

**Effect chain:**
1. `questions = []` (never populated)
2. `ResumeTemplate.questions` saved as empty array
3. Frontend receives template with 0 questions
4. Dynamic form generator has nothing to render
5. Student sees empty form with "Step 1 of 1"

---

## 7. Files Involved

| File | Role |
|------|------|
| `backend/src/controllers/resumeController.ts` | **ROOT CAUSE** — placeholder extraction disabled at lines 95-120 |
| `backend/src/services/aiService.ts` | Provides `generateTemplateQuestions()` to convert tags into form questions (unused due to disabled code) |
| `backend/src/models/ResumeTemplate.ts` | Schema has `questions` field, but it's always empty |
| `backend/src/services/resumeService.ts` | Uses docxtemplater to render DOCX with data (unaffected, works correctly) |
| `app/dashboard/student/resume-builder/components/ResumeForm/ResumeForm.tsx` | Renders form from `template.questions` (works correctly given input) |
| `app/dashboard/student/resume-builder/components/ResumeForm/FormFieldRenderer.tsx` | Renders individual input fields (works correctly given input) |
| `app/dashboard/student/resume-builder/components/TemplateSelection/TemplateCard.tsx` | Shows "0 fields" because `questions.length === 0` |

---

## 8. Proposed Fix

### Option A: Re-enable the Disabled Block (Minimal Fix)

Remove the `/* DISABLED FOR MVP */` and `*/` comments around lines 95-120 in `resumeController.ts`.

**Pros:**
- Minimal code change
- Restores intended functionality
- Includes AI fallback for environments without Gemini

**Cons:**
- Depends on `pizzip` being installed (it is — used in `resumeService.ts`)
- Depends on `aiService` being available (it is — used elsewhere)
- May fail on malformed DOCX files (already has try/catch)

### Option B: Add Fallback When No Placeholders Found

If placeholders are not found in the DOCX, generate a default set of common resume fields:
- Name, Email, Phone, Skills, Experience, Education

**Pros:**
- Guarantees form is never empty
- Works even without DOCX placeholders

**Cons:**
- May generate irrelevant fields for templates that don't need them
- More complex logic

### Option C: Hybrid Approach (Recommended)

1. Re-enable the disabled block (Option A)
2. If `questions` is still empty after extraction, fall back to a default set of common fields
3. Log when fallback is used so faculty can be notified to add `{{tags}}` to their DOCX

---

## 9. Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `pizzip` not installed | Very Low | Already a dependency of `docxtemplater` |
| DOCX parsing fails on malformed files | Low | Existing try/catch handles errors |
| AI service not configured | Low | Fallback creates basic questions without AI |
| Large DOCX files cause performance issues | Low | Only processes `word/document.xml` |
| Placeholder regex misses non-standard formats | Medium | Regex `/\{\{([^}]+)\}\}/g` is standard docxtemplater format |

---

## 10. Implementation Plan (Pending Approval)

1. Remove `/* DISABLED FOR MVP */` and `*/` comments surrounding lines 95-120 in `resumeController.ts`
2. Verify `pizzip` is in `backend/package.json` dependencies
3. Test with existing templates to confirm placeholders are extracted
4. If placeholders are missing from DOCX, add fallback default fields
5. Add diagnostic log showing extracted tags count and AI question generation status
6. Verify by uploading a DOCX with `{{name}}`, `{{email}}`, `{{skills}}` and confirming form renders

---

## 11. Exact Code Location Summary

**File:** `backend/src/controllers/resumeController.ts`
**Line:** 95
**Current state:**
```javascript
    /* DISABLED FOR MVP
    try {
      ...
    }
    */
```

**Required state:**
```javascript
    try {
      ...
    }
```

---

## Conclusion

The "0 fields" issue is caused by a single commented-out code block in `resumeController.ts:95-120`. The placeholder extraction pipeline is fully implemented but intentionally disabled. Re-enabling it should restore dynamic form generation for DOCX templates containing `{{...}}` placeholders.

If the uploaded DOCX templates do not contain any `{{...}}` placeholders, then even after re-enabling the code, 0 fields would still be returned — which would be correct behavior, indicating that faculty need to add placeholders to their templates.
