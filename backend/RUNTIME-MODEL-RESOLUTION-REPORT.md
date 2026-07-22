# Runtime Model Resolution Report

## 1. ResumeTemplate Model Definitions

### Schema Definition
**File:** `backend/src/models/ResumeTemplate.ts`
**Line 57:** `const ResumeTemplateSchema = new Schema<IResumeTemplate>(...)`
**Line 146:** `export default mongoose.model<IResumeTemplate>('ResumeTemplate', ResumeTemplateSchema);`

This is the **only** file in the repository that defines the ResumeTemplate schema or calls `mongoose.model('ResumeTemplate', ...)`.

### Complete Schema — `sections` / `fields`

```ts
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

## 2. ResumeTemplate Imports

### Source imports
**File:** `backend/src/controllers/resumeController.ts`
**Line 8:** `import ResumeTemplate from '../models/ResumeTemplate';`

This is the **only** source import of the ResumeTemplate model in the entire `backend/src/` tree.

### String references only (no model import)
**File:** `backend/src/models/StudentResume.ts`
**Line 22:** `ref: 'ResumeTemplate'`
- This is a Mongoose populate reference string. It does **not** import or register the ResumeTemplate model.

### Test mocks
**File:** `backend/src/controllers/__tests__/resumeBuilderWorkflow.test.ts`
- Uses `jest.mock('../../models/ResumeTemplate', ...)` — only active during test runs.

## 3. Runtime Resolution Chain

When `npm run dev` executes `ts-node src/index.ts`:

1. `src/index.ts` imports `routes` from `'./routes'`
2. `src/routes/index.ts` imports controller modules
3. `src/controllers/resumeController.ts` evaluates `import ResumeTemplate from '../models/ResumeTemplate'`
4. This loads `src/models/ResumeTemplate.ts`
5. `ResumeTemplate.ts` registers `mongoose.model('ResumeTemplate', ResumeTemplateSchema)` with the full schema shown above
6. No other file registers or overwrites the `ResumeTemplate` model

## 4. Duplicate Model Check

| Check | Result |
|---|---|
| Files named `ResumeTemplate.*` | 1 (`backend/src/models/ResumeTemplate.ts`) |
| `mongoose.model('ResumeTemplate', ...)` definitions | 1 |
| Model imports in `src/` | 1 (`resumeController.ts`) |
| Circular dependencies | None |
| Alternative registration paths | None |

**Confirmed: No duplicate models exist.**

## 5. Schema vs. Runtime Discrepancy

### What the source schema says
- `sections` is an **array of subdocuments** (`[{...}]`)
- `fields` is an **array of subdocuments** (`[{ key: String, label: String, ... }]`)
- `validation` is a **nested object** with `pattern`, `minLength`, `maxLength`

### What the controller sends
```ts
sections: result.milestone2Result.sections.map((section: any) => ({
    ...
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
    ...
})),
```
This produces objects that match the TypeScript schema shape exactly.

### What the runtime error reports
```
Cast to string failed for value Object at path "fields"
Cast to [string] failed
Cast to embedded failed at path "sections"
```

This indicates Mongoose is enforcing `fields: [String]` at runtime, not `fields: [{...}]`.

## 6. Conclusion

The TypeScript source schema in `backend/src/models/ResumeTemplate.ts` defines `sections` and `fields` as arrays of subdocuments. The controller transforms extracted data to match that exact shape. There is exactly one model definition, one registration, and one import path — no duplicates.

The runtime Mongoose enforcement of `fields: [String]` does not match the committed source schema. Without modifying code, the next investigative step is to verify whether the running process is loading the exact file on disk, or whether a runtime-only schema override/validator is applied elsewhere.

The root cause is the runtime Mongoose schema for `ResumeTemplate` expects `fields` as `[String]` while the committed TypeScript source defines it as an array of subdocuments, and there is no duplicate model or alternate schema definition in `backend/src/` to explain that divergence.
