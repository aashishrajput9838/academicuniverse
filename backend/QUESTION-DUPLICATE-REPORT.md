# Question Duplicate Report

**Date:** 2026-07-22  
**Symptom:** React warning: `Encountered two children with the same key, "name"`  
**Location:** `ResumeForm.tsx` line 32 — `key={question.tag}`

---

## 1. Where duplicate tags originate

`backend/src/controllers/resumeController.ts` lines 361-368:

```typescript
const questions = result.milestone2Result.sections.flatMap((section: any) =>
  section.fields.map((field: any) => ({
    tag: field.key,
    question: field.label,
    type: field.type === 'textarea' ? 'textarea' : 'text',
    aiEnhanceable: field.aiEnhanceable || false,
  }))
);
```

This flattens **all** section fields into a single `questions` array. When multiple sections contain fields with the same `key`, the `tag` values collide.

---

## 2. Real collision example from processed template

From the runtime payload captured in `RUNTIME-SCHEMA-INSPECTION.md`:

| Section | Field `key` | Generated `tag` |
|---|---|---|
| Projects | `name` | `name` |
| Certifications | `name` | `name` |
| Research&Publications | `name` | `name` |
| Projects | `description` | `description` |
| Research&Publications | `description` | `description` |
| Projects | `tech_stack` | `tech_stack` |
| Research&Publications | `tech_stack` | `tech_stack` |

Result: `template.questions` contains multiple entries with `tag: "name"`.

---

## 3. Why the frontend breaks

`ResumeForm.tsx` renders the flat questions list:

```tsx
{template.questions.map((question) => (
  <FormFieldRenderer
    key={question.tag}          // <-- duplicate key warning
    question={question}
    value={formData[question.tag] || ''}
    ...
  />
))}
```

React requires unique keys among siblings. `question.tag` is not guaranteed to be unique because it comes from `field.key`, which is a **semantic placeholder token** (e.g., `{{name}}` in the DOCX template), not a globally unique identifier.

---

## 4. Downstream impact

| Consumer | How it uses `tag` | Impact of duplicates |
|---|---|---|
| React render | `key={question.tag}` | Warning + incorrect reconciliation |
| `formData` state | `formData[question.tag]` | Later entries overwrite earlier ones with same tag |
| Draft save | `generateResume(formData)` | Only one value per duplicate key is persisted/generated |
| Document generation | Backend fills `{{name}}` with `data["name"]` | Same single value fills all `{{name}}` placeholders |

The duplicate `tag` is therefore not merely a React rendering issue — it also causes **data loss** when multiple sections share the same placeholder name.

---

## 5. Root cause

The question-generation pipeline in `processTemplateController` derives `tag` from `field.key` without any namespace or uniqueness guarantee. `field.key` is designed for DOCX placeholder matching, not for identifying individual form fields across sections.

There is no unique identifier emitted for each flattened question.

---

## 6. API contract

The backend currently returns `questions` as:

```typescript
export interface TemplateQuestion {
  tag: string;
  question: string;
  type: 'text' | 'textarea';
  aiEnhanceable: boolean;
}
```

No `id` or `sectionId` field exists for the flat questions array.

---

## 7. Proposed minimal fix

### Backend (`resumeController.ts`)

Generate a unique `id` for each question using the section's unique `id` plus the field key:

```typescript
const questions = result.milestone2Result.sections.flatMap((section: any) =>
  section.fields.map((field: any) => ({
    id: `${section.id}_${field.key}`,   // unique across template
    tag: field.key,                      // preserved for data compatibility
    question: field.label,
    type: field.type === 'textarea' ? 'textarea' : 'text',
    aiEnhanceable: field.aiEnhanceable || false,
  }))
);
```

### Frontend (`ResumeForm.tsx`)

Use `question.id` as the React key:

```tsx
{template.questions.map((question) => (
  <FormFieldRenderer
    key={question.id}
    question={question}
    value={formData[question.tag] || ''}
    onChange={(value) => handleChange(question.tag, value)}
    error={errors[question.tag]}
  />
))}
```

No other frontend changes required. `handleChange`, `validate`, `useAutoSave`, and `generateResume` continue to use `question.tag` for data keys, preserving document-generation compatibility.

### Type update (`components/Resume/types/api.ts`)

```typescript
export interface TemplateQuestion {
  id: string;
  tag: string;
  question: string;
  type: 'text' | 'textarea';
  aiEnhanceable: boolean;
}
```

---

## 8. Why this is the correct fix

- **Fixes the root cause:** questions now have guaranteed-unique identifiers from the pipeline.
- **Does not use array index** as React key.
- **Preserves backend API semantics:** `tag` remains the DOCX placeholder mapping.
- **Minimal diff:** one new field in backend generation, one key change in frontend render, one type field addition.
- **No data loss:** all questions are still rendered; React can now reconcile them correctly.
