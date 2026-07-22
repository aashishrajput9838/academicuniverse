# Section Schema Diff Report

## 1. ResumeTemplate Mongoose Schema — `sections` / `fields`

**Source of truth:** `backend/src/models/ResumeTemplate.ts`

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
    validation: {
      pattern: String,
      minLength: Number,
      maxLength: Number
    },
    options: [String]
  }],
  aiPrompt: String
}],
```

## 2. Extracted Object Produced by Pipeline

**Source:** `backend/src/services/milestone2.types.ts` + `backend/src/services/sectionDetector.service.ts`

```typescript
{
  id: string;
  title: string;
  order: number;
  repeatable: boolean;
  maxEntries?: number;
  minEntries?: number;
  fields: Array<{
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'date' | 'email' | 'phone' | 'url' | 'select' | 'list';
    required: boolean;
    aiEnhanceable: boolean;
    placeholder?: string;
    validation?: { pattern?: string; minLength?: number; maxLength?: number };
    options?: string[];
  }>;
  aiPrompt?: string;
}
```

## 3. Actual Object Passed to `findByIdAndUpdate()`

**Source:** `backend/src/controllers/resumeController.ts` lines 370-395

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

## 4. Side-by-Side Comparison

| Path | Schema expects | Actual object sent | Match? |
|---|---|---|---|
| `sections` | Array of subdocuments | Array of objects | ✅ Shape matches |
| `sections[].id` | `String` | `string` | ✅ Compatible |
| `sections[].title` | `String` | `string` | ✅ Compatible |
| `sections[].order` | `Number` | `number` | ✅ Compatible |
| `sections[].repeatable` | `Boolean` | `boolean` | ✅ Compatible |
| `sections[].maxEntries` | `Number` | `number \| undefined` | ✅ Compatible |
| `sections[].minEntries` | `Number` | `number \| undefined` | ✅ Compatible |
| `sections[].fields` | **Array of subdocuments**: `[{ key: String, label: String, type: String, required: Boolean, aiEnhanceable: Boolean, placeholder: String, validation: {...}, options: [String] }]` | Array of objects with same keys | ✅ Shape matches |
| `sections[].fields[].key` | `String` | `string` | ✅ |
| `sections[].fields[].label` | `String` | `string` | ✅ |
| `sections[].fields[].type` | `String` | `string` | ✅ |
| `sections[].fields[].required` | `Boolean` | `boolean` | ✅ |
| `sections[].fields[].aiEnhanceable` | `Boolean` | `boolean` | ✅ |
| `sections[].fields[].placeholder` | `String` | `string \| undefined` | ✅ |
| `sections[].fields[].validation` | `{ pattern: String, minLength: Number, maxLength: Number }` | `{ pattern?: string, minLength?: number, maxLength?: number }` | ✅ |
| `sections[].fields[].options` | `[String]` | `string[]` | ✅ |
| `sections[].aiPrompt` | `String` | `string \| undefined` | ✅ |

**Result:** The object structure produced by the controller transformation matches the TypeScript schema definition exactly.

## 5. Critical Finding: Compiled Schema Is Stale

**File:** `backend/dist/src/models/ResumeTemplate.js`

The compiled JavaScript schema in `dist/` does **not** include any of these fields:
- `sections`
- `originalFileUrl`
- `formattingMetadata`
- `confidence`
- `reviewed`
- `reviewNotes`

The compiled schema only contains:
- `templateName`, `type`, `target`, `fileUrl`, `organizationId`, `uploadedBy`, `questions`

This means when the backend runs from `dist/src/index.js` (as defined by `"start": "node dist/src/index.js"` in `package.json`), Mongoose loads the **stale compiled schema** which lacks `sections` entirely.

However, the backend logs report `Cast to [string] failed for value Object at path "fields"`, which further indicates the runtime schema definition the server is actually enforcing differs from both the current TypeScript source and the current compiled output captured on disk.

## 6. Recommended Fix

1. Rebuild the backend: `npm run build` inside `backend/` to regenerate `dist/src/models/ResumeTemplate.js` from the current TypeScript source.
2. Restart the backend process so it loads the rebuilt schema.
3. If the production MongoDB collection was created under a previous schema where `sections.fields` was typed as `[String]`, drop or migrate that collection/index before restarting.

The root cause is the compiled ResumeTemplate schema served to Mongoose at runtime is stale and does not contain the `sections` array-of-subdocuments definition, so the actual reject path targets `fields` as `[String]` instead of the intended subdocument shape.
