# QUESTIONS-CASTERROR-FIX

**Date:** 2026-07-23  
**Scope:** Minimal fix for `processTemplateController` CastError. One line removed. No schema changes. No unrelated code modified.

---

## 1. Verification: Object Passed to `findByIdAndUpdate()`

**File:** `backend/src/controllers/resumeController.ts:398-402`

```typescript
const updatedTemplate = await ResumeTemplate.findByIdAndUpdate(
  templateId,
  { $set: updatePayload },
  { new: true }
);
```

`updatePayload` is defined at lines 371-396. The `questions` field within it is constructed at lines 361-369:

```typescript
const questions = result.milestone2Result.sections.flatMap((section: any) =>
  section.fields.map((field: any) => ({
    id: `${section.id}_${field.key}`,   // <-- REMOVED
    tag: field.key,
    question: field.label,
    type: field.type === 'textarea' ? 'textarea' : 'text',
    aiEnhanceable: field.aiEnhanceable || false,
  }))
);
```

**Before the fix**, each question object included:
```json
{
  "id": "bc064516-70d5-49bc-970c-edda7e07fd88_text",
  "tag": "text",
  "question": "Content",
  "type": "textarea",
  "aiEnhanceable": true
}
```

This matches the stack trace exactly:
- `Cast to embedded failed at path "questions"`
- `Inner error: Cast to ObjectId failed for value "bc064516-70d5-49bc-970c-edda7e07fd88_text"`

---

## 2. Confirmed Root Cause

The `questions` schema in `backend/src/models/ResumeTemplate.ts:121-128` is:

```typescript
questions: [
    {
        tag: { type: String, required: true },
        question: { type: String, required: true },
        type: { type: String, enum: ['text', 'textarea'], default: 'text' },
        aiEnhanceable: { type: Boolean, default: false },
    },
],
```

**No `id` field is defined. No `{ _id: false }` is set.**

Mongoose auto-adds `_id: Schema.Types.ObjectId` to each embedded subdocument when `{ _id: false }` is absent. When the controller passes `id: "some-string"`, Mongoose maps `id` onto the subdocument's `_id` virtual and attempts to cast the string to `ObjectId`. The cast fails because the value is not a valid 24-char hex ObjectId.

---

## 3. Why `sections` Works But `questions` Fails

`resumeSectionSchema` (lines 75-87) explicitly declares:
- `id: { type: String, required: true }` — real schema path
- `{ _id: false }` — disables auto-`_id`

Therefore `id` in `sections` is a normal String field and does not collide with `_id`.

`questions` lacks both declarations, causing the collision.

---

## 4. Minimal Fix Applied

**File:** `backend/src/controllers/resumeController.ts:361-369`

```diff
     const questions = result.milestone2Result.sections.flatMap((section: any) =>
       section.fields.map((field: any) => ({
-        id: `${section.id}_${field.key}`,
         tag: field.key,
         question: field.label,
         type: field.type === 'textarea' ? 'textarea' : 'text',
         aiEnhanceable: field.aiEnhanceable || false,
       }))
     );
```

**Only one line removed.** No schema changes. No other code modified.

---

## 5. Build and TypeScript Check

**Command:** `npm run typecheck`  
**Result:** TypeScript reports pre-existing errors in unrelated files (`scripts/*.ts`, `src/__tests__/*`, `src/controllers/__tests__/*`). **Zero new errors** introduced by this change.

**Command:** `npm run build`  
**Result:** Same pre-existing errors only. The changed `resumeController.ts` compiles cleanly.

---

## 6. Test Results

**Command:** `npm test`  
**Result:** 314 tests passed, 47 test suites passed. No failures. The existing `resumeBuilderWorkflow.test.ts` mocks the orchestrator and passes `questions: []` to the schema, so it does not exercise this exact code path. All other unit tests remain green.

---

## 7. Post-Fix Data Contract

After this fix, each `questions` embedded document will contain only:

```json
{
  "tag": "string",
  "question": "string",
  "type": "text",
  "aiEnhanceable": true,
  "_id": "507f1f77bcf86cd799439011"
}
```

Mongoose auto-generates `_id`. If the frontend previously relied on `id`, it should use `_id.toString()` or compute its own identifier client-side.

---

## 8. Next Blocker

**No additional changes made.**

The fix is applied, builds cleanly relative to the change, and all existing tests pass. No new error has been observed yet because the actual integration test (Process Template flow against a live server) has not been executed. If another error appears during that flow, it will be reported as a separate blocker.

---

*End of report.*
