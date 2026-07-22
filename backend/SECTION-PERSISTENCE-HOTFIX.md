# Section Persistence Hotfix Report

## Executive Summary
Fixed a backend persistence bug where template processing results failed to save to MongoDB with "Cast to embedded failed at path 'sections'" errors. The root cause was a mismatch between the extracted section/field object structure and the exact schema expected by the `ResumeTemplate` embedded document definition.

## Problem Statement
Manual QA discovered that after faculty processed a template via `POST /api/resume/templates/:id/process`, the backend threw a Mongoose cast error when attempting to persist `sections` to the `ResumeTemplate` document. Error: `Cast to embedded failed at path "sections"`.

Error payload showed field objects like `{ label: "Summary", type: "textarea", ... }` being involved in the cast failure, indicating a schema shape mismatch between extraction output and the MongoDB embedded document schema.

## Root Cause
1. `processTemplateController` passed `result.milestone2Result.sections` directly into `ResumeTemplate.findByIdAndUpdate(..., { $set: { sections: ... } })`.
2. The extraction pipeline produces plain TypeScript objects (`DetectedSection[]` / `TemplateField[]`).
3. Mongoose's embedded-document caster is stricter when updating nested arrays via `$set` than when creating new documents.
4. Any extra properties, undefined values in nested objects, or implicit typing differences caused the cast to fail on the `sections` path.

## Fix
- **File:** `backend/src/controllers/resumeController.ts`
- **Change:** Before persisting, explicitly transform each extracted section and each nested field into a new plain object that matches the `ResumeTemplate` schema exactly.
- This strips unexpected properties, preserves the schema-defined field list, and guarantees Mongoose receives clean embedded-document payloads.

### Transformation Logic
```typescript
sections: result.milestone2Result.sections.map((section: any) => ({
  id: section.id,
  title: section.title,
  order: section.order,
  repeatable: section.repeatable,
  maxEntries: section.maxEntries,
  minEntries: section.minEntries,
  fields: section.fields.map((field: any) => ({
    key: field.key,
    label: field.label,
    type: field.type,
    required: field.required,
    aiEnhanceable: field.aiEnhanceable,
    placeholder: field.placeholder,
    validation: field.validation,
    options: field.options,
  })),
  aiPrompt: section.aiPrompt,
})),
```

## What Was Not Changed
- `ResumeTemplate` Mongoose schema was **not modified**.
- Extraction pipeline (`SectionDetectorService`, `ExtractionResultService`, `TemplateProcessingOrchestrator`) was **not modified**.
- Frontend was **not modified**.
- All existing tests were preserved.

## Test Coverage
- Existing workflow tests updated to expect the transformed section payload.
- Added new regression test: `should transform sections to schema-compatible format before persisting`.
- Full regression suite: **311/311 tests pass**.

## Verification
- Re-ran `resumeBuilderWorkflow.test.ts`: 3/3 pass.
- Re-ran full Jest suite: 311/311 pass.
- Added regression coverage for section persistence specifically.

## Deployment Notes
This is a controller-level data-shape fix. No database migration is required. Previously failed template processing calls will now succeed and persist sections, questions, formatting metadata, and confidence scores correctly.
