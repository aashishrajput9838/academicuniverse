# Runtime Schema Inspection Report

**Date:** 2026-07-22  
**Process:** `npm run dev` (ts-node)  
**Model:** `ResumeTemplate`  
**Endpoint:** `POST /api/resume/templates/:id/process`

## 1. Live Runtime Schema

### `ResumeTemplate.schema.path('sections')`
- Instance: `DocumentArrayPath`
- Parent path: `sections`
- Schema type: document array of subdocuments

### `ResumeTemplate.schema.path('sections.fields')`
- Instance: `SchemaArray`
- **Critical:** `casterConstructor: [Function: SchemaString]`
- **Critical:** `caster` is `SchemaString { instance: 'String', path: 'fields', ... }`
- `options: SchemaArrayOptions { type: [ [Object] ] }`
- Field options carried by the caster:

```
SchemaStringOptions {
  key: [Function: String],
  label: [Function: String],
  required: [Function: Boolean],
  aiEnhanceable: [Function: Boolean],
  placeholder: [Function: String],
  validation: [Object],
  options: [Array]
}
```

### `ResumeTemplate.schema.obj.sections`
```
sections: [
  {
    id: [Function: String],
    title: [Function: String],
    order: [Function: Number],
    repeatable: [Function: Boolean],
    maxEntries: [Function: Number],
    minEntries: [Function: Number],
    fields: [ [Object] ],
    aiPrompt: [Function: String]
  }
]
```

**Mongoose internal `sections.schema.paths`:**
```
paths: {
  id: [SchemaString],
  title: [SchemaString],
  order: [SchemaNumber],
  repeatable: [SchemaBoolean],
  maxEntries: [SchemaNumber],
  minEntries: [SchemaNumber],
  fields: [SchemaArray],
  aiPrompt: [SchemaString],
  _id: [ObjectId]
}
aliases: {},
subpaths: { 'fields.$': [SchemaString] }
```

## 2. Update Payload (logged at runtime)

```json
{
  "fileUrl": "https://res.cloudinary.com/...",
  "originalFileUrl": "https://res.cloudinary.com/...",
  "sections": [
    {
      "id": "bae3bbbb-e950-41f8-a366-a69bf3498848",
      "title": "ProfessionalSummary",
      "order": 0,
      "repeatable": false,
      "maxEntries": 1,
      "minEntries": 1,
      "fields": [
        {
          "key": "text",
          "label": "Summary",
          "type": "textarea",
          "required": true,
          "aiEnhanceable": true
        }
      ],
      "aiPrompt": "Extract structured data for section: ProfessionalSummary"
    },
    {
      "id": "39a8a4cd-5ef5-4bcc-9d81-4ab1f3bd7750",
      "title": "Skills",
      "order": 1,
      "repeatable": false,
      "maxEntries": 1,
      "minEntries": 1,
      "fields": [
        {
          "key": "category",
          "label": "Category",
          "type": "text",
          "required": false,
          "aiEnhanceable": true
        },
        {
          "key": "items",
          "label": "Skills",
          "type": "list",
          "required": true,
          "aiEnhanceable": true
        }
      ],
      "aiPrompt": "Extract structured data for section: Skills"
    },
    ... 4 more sections (Projects, Certifications, Research&Publications, Education)
  ],
  "questions": [...],
  "formattingMetadata": { ... },
  "confidence": 1
}
```

## 3. API Response

```json
{
  "success": false,
  "statusCode": 500,
  "message": "Cast to embedded failed for value \"{\\n  id: 'bae3bbbb-...' ... }\" (type Object) at path \"sections\" because of \"CastError\""
}
```

## 4. Discrepancy Summary

| Aspect | Source Code (`ResumeTemplate.ts`) | Runtime Schema |
|---|---|---|
| `sections` | Array of subdocuments | `DocumentArrayPath` (correct) |
| `sections.fields` | Array of subdocuments `[{key, label, type, ...}]` | `SchemaArray` with `casterConstructor: SchemaString` |
| `subpaths` | N/A | `fields.$: [SchemaString]` |
| `options` on `fields` caster | N/A | `SchemaStringOptions { key, label, required, aiEnhanceable, ... }` |

## 5. Root Cause

The committed source file `backend/src/models/ResumeTemplate.ts` defines:

```typescript
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
```

Mongoose compiles this runtime schema such that `ResumeTemplate.schema.path('sections.fields')` is a `SchemaArray` whose element type (`caster`) is `SchemaString` — **not** a subdocument/schema object. The field options (`key`, `label`, `required`, etc.) are being attached as field-level options on the `SchemaString`, which Mongoose silently accepts but does not create subdocument paths for.

As a result:

1. The controller builds an `updatePayload` where `sections[].fields` is an array of **objects**.
2. Mongoose runtime schema expects `sections[].fields` to be an array of **strings**.
3. `findByIdAndUpdate` throws `CastError: Cast to embedded failed ... at path "sections"`.

## 6. Single Source of Truth

- **Exactly one** `ResumeTemplateSchema` definition in `backend/src/models/ResumeTemplate.ts:57`.
- **Exactly one** `mongoose.model('ResumeTemplate', ...)` registration at `backend/src/models/ResumeTemplate.ts:146`.
- **Exactly one** import of `ResumeTemplate` in `backend/src/controllers/resumeController.ts:8`.
- No duplicate model or alternate `Schema` instantiation found anywhere in `backend/src/`.

## 7. Required Fix Direction

The source schema literal for `fields` must be rewritten so that Mongoose interprets it as an **array of subdocuments**, **not** an array of strings. The current literal shape is being silently coerced by Mongoose's schema compiler.
