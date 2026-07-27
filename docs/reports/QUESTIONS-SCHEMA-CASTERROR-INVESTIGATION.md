# QUESTIONS-SCHEMA-CASTERROR-INVESTIGATION

**Date:** 2026-07-23  
**Symptom:** `processTemplateController()` fails at `resumeController.ts:398` with:
```
Cast to embedded failed at path "questions"
Inner error: Cast to ObjectId failed for value
bc064516-70d5-49bc-970c-edda7e07fd88_text
```
**Scope:** Read-only investigation. No code modified.

---

## 1. Which Mongoose Schema Defines `questions`

**File:** `backend/src/models/ResumeTemplate.ts:89-156`

The `questions` field is defined inline as an array of subdocuments at lines `121-128`:

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

**The schema does NOT define `_id: false` on this array subdocument.**

In Mongoose, when an array of subdocuments is defined without `{ _id: false }`, Mongoose automatically adds an `_id` field of type `Schema.Types.ObjectId` to each embedded element.

---

## 2. What Shape the Schema Expects

Each element of the `questions` array must match exactly:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `tag` | String | Yes | |
| `question` | String | Yes | |
| `type` | String | No | Enum: `'text'` or `'textarea'` |
| `aiEnhanceable` | Boolean | No | Default: `false` |

**No `id` field is defined.**  
**No `_id` field is explicitly defined**, but Mongoose adds one automatically of type `ObjectId`.

Valid document shape:
```json
{
  "tag": "name",
  "question": "Full Name",
  "type": "text",
  "aiEnhanceable": true
}
```

---

## 3. Which Code Constructs the Question Objects

**File:** `backend/src/controllers/resumeController.ts:361-369`

```typescript
const questions = result.milestone2Result.sections.flatMap((section: any) =>
  section.fields.map((field: any) => ({
    id: `${section.id}_${field.key}`,
    tag: field.key,
    question: field.label,
    type: field.type === 'textarea' ? 'textarea' : 'text',
    aiEnhanceable: field.aiEnhanceable || false,
  }))
);
```

This is the **only** location where `questions` arrays are populated with actual objects.

**Contrast with the upload path:** `uploadTemplateController` (`resumeController.ts:96`) initializes `questions` as `let questions: any[] = [];` and the tag-extraction block that would populate it is **disabled for MVP** (`resumeController.ts:98-123`). Therefore, `uploadTemplateController` never reaches this code path.

---

## 4. Why It Uses `id` Instead of `_id`

The value `bc064516-70d5-49bc-970c-edda7e07fd88_text` clearly shows the template:
```typescript
id: `${section.id}_${field.key}`
```

- `section.id` comes from `ITemplateSection.id` (`ResumeTemplate.ts:32`), which is a `String`.
- `field.key` comes from `ITemplateField.key` (`ResumeTemplate.ts:43`), also a `String`.

The developer used `id` (a string composite key) to create a human-readable identifier for each question, likely for frontend reference or uniqueness checking.

**However**, `id` is a reserved virtual property in Mongoose documents. Mongoose defines `id` as a virtual getter that returns `this._id.toString()`. While `id` is typically a read-only virtual, adding it to raw data during document/subdocument creation interacts badly with Mongoose's internal casting.

---

## 5. Whether `_id` Should Be Removed, Generated Automatically, or Converted

**The `id` key must be removed from the constructor object.**

Options if an identifier is desired:

| Option | Action | Impact |
|--------|--------|--------|
| **A. Remove `id` entirely** | Delete `id: `${section.id}_${field.key}`` from `resumeController.ts:363` | Simplest. Mongoose auto-generates `_id: ObjectId` for each question subdocument. Frontend must use `_id` or derive its own key client-side. |
| **B. Add `id` to schema** | Add `id: { type: String }` to the inline schema at `ResumeTemplate.ts:122-127`, AND add `_id: false` to disable auto-ObjectId | Preserves the composite key intent. Requires schema migration if data already exists. |
| **C. Convert `id` to `_id`** | Pass the value as `_id` in the constructor | Requires the value to be a valid `ObjectId`. The current string composites (e.g., `bc064516-70d5-49bc-970c-edda7e07fd88_text`) are NOT valid ObjectIds. |

**Recommended:** Option A. The composite `id` is never read by backend code after insertion. It is only written here and returned in the API response at `resumeController.ts:408` (`questions: updatedTemplate.questions`). Removing it eliminates the schema violation without changing the API contract in any meaningful way.

---

## 6. Exact Line That Constructs the Invalid Object

**File:** `backend/src/controllers/resumeController.ts:361-369`

```typescript
361:    const questions = result.milestone2Result.sections.flatMap((section: any) =>
362:      section.fields.map((field: any) => ({
363:          id: `${section.id}_${field.key}`,   // <--- THIS LINE
364:          tag: field.key,
365:          question: field.label,
366:          type: field.type === 'textarea' ? 'textarea' : 'text',
367:          aiEnhanceable: field.aiEnhanceable || false,
368:      }))
369:    );
```

Line `363` adds `id` to each question subdocument.

---

## 7. Explanation of the Correct Data Contract

### Schema contract (what Mongoose expects)

The `questions` array stores **embedded subdocuments**. Each element must contain only the fields declared in the inline schema:

```typescript
{
  tag: string,           // required
  question: string,      // required
  type?: 'text' | 'textarea',  // optional, default 'text'
  aiEnhanceable?: boolean      // optional, default false
}
```

Mongoose automatically appends `_id: ObjectId` to each element because the inline schema does not set `{ _id: false }`.

### Code contract (what the controller sends)

The controller sends:

```typescript
{
  id: string,           // NOT in schema — causes CastError
  tag: string,
  question: string,
  type: string,
  aiEnhanceable: boolean
}
```

### Why Mongoose throws "Cast to ObjectId failed"

When Mongoose processes the POJO for each `questions` array element, it encounters the `id` key. Because `id` is Mongoose's reserved virtual alias for `_id`, Mongoose's subdocument creation path attempts to treat the `id` value as the subdocument's `_id`. It then tries to cast `bc064516-70d5-49bc-970c-edda7e07fd88_text` to `Schema.Types.ObjectId`. The value is not a valid 24-character hex ObjectId, so the cast fails.

**Mongoose error chain:**
1. `findByIdAndUpdate` triggers casting of the `$set.questions` array (`resumeController.ts:398-402`).
2. For each element, Mongoose creates a subdocument instance from the raw POJO.
3. The `id` key collides with Mongoose's `_id` handling.
4. Mongoose attempts ` mongoose.Types.ObjectId('bc064516-70d5-49bc-970c-edda7e07fd88_text')`.
5. Cast fails → `Cast to ObjectId failed` → bubbles up as `Cast to embedded failed at path "questions"`.

---

## 8. Evidence From Tests

**File:** `backend/src/controllers/__tests__/resumeBuilderWorkflow.test.ts`

The test mock at line `98` replaces `uploadResumeTemplate` with a stub, so upload is bypassed. The test's `updatedTemplate` mock (`lines 145-153`) defines `questions` without `id`:

```typescript
questions: [
  { tag: 'degree', question: 'Degree', type: 'text', aiEnhanceable: true },
  { tag: 'institution', question: 'Institution', type: 'text', aiEnhanceable: true },
],
```

This is why the unit test passes: it never exercises the real `processTemplateController` question-construction logic. The tests mock `storageService.uploadResumeTemplate`, `TemplateProcessingOrchestrator`, `ResumeTemplate`, and `Role`, so the failing `findByIdAndUpdate` with real question objects is never reached.

**File:** `backend/src/models/__tests__/ResumeTemplateSchema.test.ts`

Schema tests create documents with `questions: []` (lines `69`, `115`). They never test persisting a non-empty `questions` array, so the `id` mismatch is invisible to schema regression tests.

---

## 9. Summary

| Item | Finding |
|------|---------|
| Schema file | `backend/src/models/ResumeTemplate.ts:121-128` |
| Schema shape | `{ tag, question, type, aiEnhanceable }` — no `id` |
| Faulty constructor | `backend/src/controllers/resumeController.ts:361-369` |
| Exact bad key | Line `363`: `id: `${section.id}_${field.key}`` |
| Root cause | `id` is a Mongoose virtual alias for `_id`. Mongoose tries to cast the composite string to `ObjectId` and fails. |
| Fix scope | Remove `id` from the object at line `363`, or add `id` to the schema at `ResumeTemplate.ts:121-128` with `_id: false`. |
| Why tests miss it | Unit tests mock the orchestrator and never persist real non-empty `questions` arrays. |

---

## 10. Suggested Experiments (No Code Changes)

To confirm this diagnosis without modifying code:

1. **Manual DB insert:** Use MongoDB shell or Compass to insert a document with `questions` array **without** `id`:
   ```json
   {
     "templateName": "Debug",
     "type": "global",
     "fileUrl": "https://example.com/doc.docx",
     "organizationId": "<valid ObjectId>",
     "uploadedBy": "<valid ObjectId>",
     "questions": [
       { "tag": "text", "question": "Content", "type": "textarea", "aiEnhanceable": true }
     ]
   }
   ```
   Expected: Insert succeeds.

2. **Manual DB insert with `id`:** Repeat the insert but add `id: "test_text"` to the question object.
   Expected: Mongoose throws `Cast to embedded failed at path "questions"` / `Cast to ObjectId failed for value "test_text"`.

3. **Compare stack traces:** If experiment 2 reproduces the exact error, the diagnosis is confirmed.

*End of report.*
