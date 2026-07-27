# Schema Fix Report

**Date:** 2026-07-22  
**Model:** `ResumeTemplate`  
**Fix:** Explicit embedded-document schemas for `sections` and `fields`

## Problem

Mongoose compiled `ResumeTemplate.schema.path('sections.fields')` as:

```
SchemaArray<SchemaString>
```

instead of an array of embedded documents. The inline object-literal syntax:

```typescript
fields: [{
    key: String,
    label: String,
    ...
}]
```

was silently coerced by Mongoose into an array of strings with attached field options. This caused the runtime `CastError`:

```
Cast to embedded failed for value Object at path "sections"
```

## Root Cause

Mongoose interprets nested array-of-objects literals inconsistently when the inner object keys are schema type constructors rather than an explicitly instantiated `Schema`. The options (`key`, `label`, `required`, etc.) were attached as option bags on a `SchemaString` caster instead of becoming subdocument paths.

## Fix Applied

### File: `backend/src/models/ResumeTemplate.ts`

1. **Created `ResumeFieldSchema`** — explicit `new Schema<ITemplateField>(...)` with `{ _id: false }`.
2. **Created `ResumeSectionSchema`** — explicit `new Schema<ITemplateSection>(...)` with `{ _id: false }`, referencing `ResumeFieldSchema`.
3. **Replaced inline literals** with typed schema references:

**Before:**
```typescript
sections: [{
    id: String,
    title: String,
    order: Number,
    repeatable: Boolean,
    maxEntries: Number,
    minEntries: Number,
    fields: [{
        key: String,
        label: String,
        type: String,
        required: Boolean,
        aiEnhanceable: Boolean,
        placeholder: String,
        validation: { pattern: String, minLength: Number, maxLength: Number },
        options: [String]
    }],
    aiPrompt: String
}]
```

**After:**
```typescript
const ResumeFieldSchema = new Schema<ITemplateField>(..., { _id: false });
const ResumeSectionSchema = new Schema<ITemplateSection>(..., { _id: false });

sections: { type: [ResumeSectionSchema], default: [] }
```

And inside `ResumeSectionSchema`:
```typescript
fields: { type: [ResumeFieldSchema], default: [] }
```

## Regression Test

**File:** `backend/src/models/__tests__/ResumeTemplateSchema.test.ts`

Added 3 test cases:

1. **Schema compilation assertion** — verifies `ResumeTemplate.schema.path('sections.fields').caster.instance` is NOT `'String'` and the ctor name is NOT `'SchemaString'`.
2. **Document creation with fields** — creates a `ResumeTemplate` with `sections[].fields = [{ key, label, type }]` and asserts `save()` succeeds and values round-trip.
3. **Preservation of nested properties** — asserts `validation`, `options`, and `placeholder` are persisted correctly.

## Test Results

| Command | Result |
|---|---|
| `npx jest --runInBand src/models/__tests__/ResumeTemplateSchema.test.ts` | **3 passed** |
| `npx jest --runInBand` (full suite) | **47 passed, 314 tests passed** |
| `npx tsc --noEmit` (typecheck) | **0 errors in `ResumeTemplate.ts`** |

Pre-existing type errors in unrelated test files (`academicRecordController.test.ts`, `resumeBuilderWorkflow.test.ts`, `DocumentClassifier.test.ts`) remain unchanged.

## API Contract

No controller logic was modified. The `ITemplateSection`, `ITemplateField`, and `IResumeTemplate` interfaces are unchanged. The payload shape sent by `processTemplateController` continues to match the runtime schema exactly.
