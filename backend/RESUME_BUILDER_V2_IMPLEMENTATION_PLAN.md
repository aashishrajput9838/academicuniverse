# Resume Builder v2 Implementation Plan

**Date:** 2026-07-22  
**Architecture Direction:** Docxtemplater loops for repeated collections (Option C)  
**Constraint:** No code changes — design document only

---

## Table of Contents

1. [Current Architecture](#1-current-architecture)
2. [Target Architecture](#2-target-architecture)
3. [Data Model Changes](#3-data-model-changes)
4. [PlaceholderInjector Redesign](#4-placeholderinjector-redesign)
5. [ResumeTemplate Changes](#5-resumetemplate-changes)
6. [StudentResume Draft Migration Strategy](#6-studentresume-draft-migration-strategy)
7. [ResumeForm Redesign](#7-resumeform-redesign)
8. [RepeatableSection Component Design](#8-repeatablesection-component-design)
9. [Validation Strategy](#9-validation-strategy)
10. [AutoSave Strategy](#10-autosave-strategy)
11. [DOCX Rendering Strategy](#11-docx-rendering-strategy)
12. [Backward Compatibility](#12-backward-compatibility)
13. [Rollback Strategy](#13-rollback-strategy)
14. [Estimated Implementation Phases](#14-estimated-implementation-phases)
15. [Risks](#15-risks)
16. [Testing Strategy](#16-testing-strategy)

---

## 1. Current Architecture

### 1.1 Data Flow

```
DOCX Template
    ↓
PlaceholderInjector
  - Scans extracted paragraphs for section headings
  - Replaces section text with {{field.key}} placeholders
  - getUniqueKey() prevents intra-document collisions
  - Returns dataKeyMapping (originalKey → uniqueKeys), but mapping is discarded after processing
    ↓
TemplateProcessingOrchestrator.process()
  - Returns Milestone2Result with flat sections[] and fields[]
    ↓
processTemplateController
  - Flattens all sections → questions[] with tag: field.key
  - Stores in ResumeTemplate.questions[]
  - Stores sections in ResumeTemplate.sections[]
    ↓
Frontend fetchTemplates()
  - Receives ResumeTemplateDTO with flat questions[]
    ↓
ResumeForm
  - Renders flat list of FormFieldRenderer components
  - Collects data into formData: Record<string, any>
  - Key = question.tag (causes duplicates across sections)
    ↓
useAutoSave
  - Calls generateResume() every 2s with formData
    ↓
processResumeController
  - Calls ResumeService.processResumeTemplate(template.fileUrl, data, tone, enhanceableTags)
  - Saves draft to StudentResume.filledData = data (flat object)
    ↓
ResumeService / DocxTemplateFiller
  - doc.setData(data) — flat object
  - expandDataWithMapping() applies PlaceholderInjector's key mapping
  - doc.render() fills {{placeholders}}
```

### 1.2 Key Components

| Component | File | Role |
|---|---|---|
| `PlaceholderInjector` | `backend/src/services/placeholderInjector.service.ts` | Replaces DOCX text with `{{key}}` placeholders. Already generates unique keys via `getUniqueKey()`. Produces `dataKeyMapping` but it's only used transiently in `DocxTemplateFiller`. |
| `SectionDetectorService` | `backend/src/services/sectionDetector.service.ts` | Detects section headings, assigns `repeatable`, `maxEntries`, `minEntries`. `REPEATABLE_SECTIONS` = experience, education, projects, publications, certifications. |
| `ResumeTemplate` model | `backend/src/models/ResumeTemplate.ts` | Stores `sections` (array of subdocuments with `fields`) and `questions` (flat array). `sections[].fields[]` uses explicit `ResumeFieldSchema`. |
| `StudentResume` model | `backend/src/models/StudentResume.ts` | Stores `filledData: Schema.Types.Mixed` — already supports any JSON shape. |
| `processTemplateController` | `backend/src/controllers/resumeController.ts:317` | Orchestrates template processing. Flattens sections → questions. |
| `processResumeController` | `backend/src/controllers/resumeController.ts:238` | Receives student data, calls `ResumeService`, saves draft. |
| `ResumeService` | `backend/src/services/resumeService.ts` | Fetches template, calls `doc.setData(data)`, renders DOCX. |
| `DocxTemplateFiller` | `backend/src/services/docxTemplateFiller.service.ts` | Validates data, expands with `dataKeyMapping`, renders DOCX. |
| `ResumeForm` | `app/dashboard/student/resume-builder/components/ResumeForm/ResumeForm.tsx` | Flat form renderer. `formData: Record<string, any>`. |
| `useAutoSave` | `.../hooks/useAutoSave.ts` | Calls `generateResume()` every 2s for draft persistence. |
| `resumeApi.ts` | `components/Resume/api/resumeApi.ts` | `fetchDraft`, `fetchTemplates`, `generateResume`. |

### 1.3 Current Data Shape

**ResumeTemplate.sections:**
```json
[
  {
    "id": "uuid",
    "title": "Projects",
    "repeatable": true,
    "maxEntries": undefined,
    "minEntries": undefined,
    "fields": [
      { "key": "name", "label": "Project Name", "type": "text", "required": true },
      { "key": "description", "label": "Description", "type": "textarea", "required": false }
    ]
  }
]
```

**ResumeTemplate.questions (flat):**
```json
[
  { "id": "sectionId_name", "tag": "name", "question": "Project Name", "type": "text" },
  { "id": "sectionId2_name", "tag": "name", "question": "Certification Name", "type": "text" }
  // duplicate tags!
]
```

**StudentResume.filledData (flat):**
```json
{ "name": "Last value wins", "description": "..." }
```

**Docxtemplater data:**
```json
{ "name": "Last value wins" }
// Only one {{name}} value fills ALL occurrences in the DOCX
```

---

## 2. Target Architecture

### 2.1 Design Principle

**The data model mirrors the DOCX template's hierarchical structure.** Repeatable sections become arrays of objects. Non-repeatable sections become single objects. Docxtemplater loop syntax (`{{#sectionId}}...{{/sectionId}}`) renders collections natively.

### 2.2 Target Data Flow

```
DOCX Template (with {{#sectionId}}...{{/sectionId}} loop tags for repeatable sections)
    ↓
PlaceholderInjector v2
  - Detects repeatable sections from section metadata
  - Wraps section runs in {{#sectionId}}...{{/sectionId}}
  - Inside loops, keeps {{field.key}} placeholders
  - Returns sectionKeyMapping: { sectionId: { originalKey → scopedKey } }
    ↓
TemplateProcessingOrchestrator
  - Stores processed template with loop-tagged DOCX in Cloudinary
  - Returns sections[] with repeatable metadata
    ↓
processTemplateController
  - Generates questions ONLY for non-repeatable fields (flat)
  - Repeatable fields are NOT flattened into questions
  - Stores sectionKeyMapping in ResumeTemplate
    ↓
Frontend fetchTemplates()
  - Receives sections[] with repeatable flag
  - Renders non-repeatable sections as flat form fields
  - Renders repeatable sections as RepeatableSection components (dynamic entry lists)
    ↓
ResumeForm
  - formData shape:
    {
      "summary": { "text": "..." },
      "skills": { "items": "..." },
      "projects": [
        { "name": "A", "description": "...", "tech_stack": ["React"] },
        { "name": "B", "description": "...", "tech_stack": ["Node"] }
      ],
      "certifications": [
        { "name": "AWS", "issuer": "Amazon", "date": "2024" }
      ]
    }
    ↓
useAutoSave
  - Deep-patches formData on change
  - Sends nested/array data to generateResume endpoint
    ↓
processResumeController
  - Receives nested/array data
  - Calls ResumeService with structured data
  - Saves draft as nested/array JSON
    ↓
ResumeService
  - doc.setData(data) — nested/array structure
  - Docxtemplater {{#projects}} loop renders array entries
  - Non-repeatable {{summary.text}} fills from nested object
```

### 2.3 Target DOCX Template Structure

**Non-repeatable section (Summary):**
```
{{text}}
```

**Repeatable section (Projects) with loop syntax:**
```
{{#projects}}
{{name}}
{{description}}
{{/projects}}
```

**Mixed (Skills — single object):**
```
{{items}}
```

### 2.4 Target Data Shape

**formData (frontend state):**
```typescript
interface FormData {
  summary: { text: string };
  skills: { items: string };
  projects: Array<{ name: string; description: string; tech_stack: string[] }>;
  certifications: Array<{ name: string; issuer: string; date: string }>;
}
```

**StudentResume.filledData (draft storage):**
```json
{
  "summary": { "text": "Experienced developer..." },
  "skills": { "items": "TypeScript, React" },
  "projects": [
    { "name": "Project A", "description": "Built X", "tech_stack": ["React"] },
    { "name": "Project B", "description": "Built Y", "tech_stack": ["Node"] }
  ]
}
```

**Docxtemplater setData:**
```javascript
doc.setData({
  summary: { text: "..." },
  skills: { items: "..." },
  projects: [{ name: "A", ... }, { name: "B", ... }]
});
// Template has {{#projects}}{{name}}{{/projects}} — renders both entries
```

---

## 3. Data Model Changes

### 3.1 ResumeTemplate Model

**No schema changes required.** The existing `sections` array already stores `repeatable`, `maxEntries`, `minEntries`, and `fields` with explicit `ResumeFieldSchema`. The `questions` array remains for backward compatibility but is no longer the primary form driver.

**New field to add (optional but recommended):**
```typescript
// In ResumeTemplate.ts
sectionKeyMapping?: {
  [sectionId: string]: {
    [originalKey: string]: string;
  };
};
```
This preserves the key mapping used by `PlaceholderInjector` so `DocxTemplateFiller` can expand data without recomputing the mapping.

### 3.2 StudentResume Model

**No schema changes required.** `filledData: Schema.Types.Mixed` already accepts nested objects and arrays.

### 3.3 DetectedSection / Milestone2Result Types

**No changes to `milestone2.types.ts`.** Existing fields (`repeatable`, `maxEntries`, `minEntries`) are sufficient.

### 3.4 New Type: FormDataShape

```typescript
// components/Resume/types/resume.ts
export interface FormDataShape {
  [sectionId: string]: any; // single object for non-repeatable, array for repeatable
}
```

---

## 4. PlaceholderInjector Redesign

### 4.1 Current Behavior

- `inject()` receives `sections: DetectedSection[]`
- For each section, calls `injectSectionPlaceholders()`
- `mapFieldsToRuns()` replaces text runs with `{{uniqueKey}}`
- `getUniqueKey()` ensures uniqueness: first occurrence gets raw key, subsequent get `section_{index}_{key}`
- Returns `dataKeyMapping: { originalKey → [uniqueKeys] }` but **only uses it internally** in `DocxTemplateFiller`

### 4.2 New Behavior: Loop-Aware Injection

**Signature change:**
```typescript
async inject(
  originalBuffer: Buffer,
  extractedDoc: ExtractedDocument,
  sections: DetectedSection[],
  repeatableSectionIds?: Set<string>
): Promise<InjectionResult & { sectionKeyMapping: Record<string, Record<string, string>> }>
```

**Algorithm:**

For each section `s` with fields `f[]`:

1. **If `s.repeatable === true`:**
   - Find section start paragraph (heading)
   - Find section end paragraph (next heading or end of document)
   - **Before** the first content run of the section: inject `{{#${s.id}}}`
   - Replace field runs with `{{${f.key}}}` (no index suffix — loop handles multiplicity)
   - **After** the last content run of the section: inject `{{/${s.id}}}`

2. **If `s.repeatable === false`:**
   - Keep current behavior: replace field runs with `{{${f.key}}}`
   - Uses `getUniqueKey()` only for cross-section collision avoidance

**Output:**
```typescript
{
  success: true,
  placeholdersInjected: number,
  issues: string[],
  buffer: Buffer,
  sectionKeyMapping: {
    "section-uuid-1": { "name": "name", "description": "description" },
    "section-uuid-2": { "degree": "degree", "institution": "institution" }
  }
}
```

### 4.3 Why This Works with Docxtemplater

Docxtemplater natively supports mustache loops:
```
{{#projects}}
  {{name}}
  {{description}}
{{/projects}}
```

When `setData({ projects: [{name: "A"}, {name: "B"}] })` is called, docxtemplater renders the loop block once per array entry. Non-loop placeholders outside loops resolve from the top-level data object.

### 4.4 Edge Cases

| Case | Handling |
|---|---|
| Section with 0 fields | Skip injection, no loop tags |
| Section marked repeatable but 0 entries in data | Docxtemplater skips loop block entirely — correct behavior |
| Collision between loop section key and top-level key | `getUniqueKey()` prefixes with `section_` for non-repeatable keys |
| Nested loops (future: projects containing sub-entries) | Not in v2 scope. Architecture supports nesting via section hierarchy. |

---

## 5. ResumeTemplate Changes

### 5.1 Processed Template Storage

When `processTemplateController` stores the processed template, the DOCX now contains loop tags for repeatable sections. The `processedFileUrl` stored in `ResumeTemplate.fileUrl` points to this loop-enabled DOCX.

### 5.2 Questions Array

**Current:** Flat array of all fields across all sections.  
**New:** Questions array contains only **non-repeatable** section fields. Repeatable section fields are NOT converted to questions — they are collected via dynamic form entries.

```typescript
// New questions generation logic
const questions = result.milestone2Result.sections
  .filter(s => !s.repeatable)
  .flatMap((section) =>
    section.fields.map((field) => ({
      id: `${section.id}_${field.key}`,
      tag: field.key,
      question: field.label,
      type: field.type === 'textarea' ? 'textarea' : 'text',
      aiEnhanceable: field.aiEnhanceable || false,
      sectionId: section.id,        // NEW: track which section the question belongs to
      sectionTitle: section.title,   // NEW: for frontend grouping
    }))
  );
```

### 5.3 Section Mapping Storage

Store `sectionKeyMapping` in `ResumeTemplate` for use during generation:

```typescript
// In updatePayload
sectionKeyMapping: result.injectionResult.sectionKeyMapping,
```

---

## 6. StudentResume Draft Migration Strategy

### 6.1 Problem

Existing drafts store flat data:
```json
{ "name": "Project A", "description": "Built X" }
```

New architecture expects:
```json
{
  "projects": [{ "name": "Project A", "description": "Built X" }]
}
```

### 6.2 Migration Approaches

#### Approach A: Lazy Migration (Recommended)

- **No bulk migration.**
- On draft load (`fetchDraft`), backend detects format:
  - If `filledData` has section IDs as top-level keys → new format, return as-is.
  - If `filledData` has raw field keys → old format, backend attempts to reconstruct sections.
- **Simplification:** For v2, old-format drafts are considered stale. The user starts fresh. A banner can say "Your previous draft was saved in an older format. Please re-enter your information."

#### Approach B: Eager Migration

- Run a one-time migration script that reads all `StudentResume` documents.
- For each draft, use the template's `sections` metadata to reconstruct nested data.
- **Risk:** Data loss if section detection has changed between template versions.

#### Approach C: Dual Format Acceptance

- Backend accepts both flat and nested formats.
- `DocxTemplateFiller` normalizes flat data to nested before rendering.
- **Risk:** Adds complexity and ambiguity. Not recommended for v2.

### 6.3 Recommended Strategy: Lazy Migration with Soft Reset

1. Add a `schemaVersion` field to `StudentResume` (default: 1 for existing, 2 for new).
2. When loading a v1 draft:
   - Return the flat data to frontend.
   - Frontend shows a soft prompt: "We've improved the resume builder. Your previous draft couldn't be fully migrated. Would you like to start fresh?"
   - If user accepts, create a new v2 draft.
3. All new drafts are v2.

**Migration script (one-time, runnable):**
```typescript
// scripts/migrate-student-resumes.ts
// Reads all StudentResume documents.
// Adds schemaVersion: 2 to documents without it.
// Does NOT transform filledData — leaves it for lazy migration.
```

---

## 7. ResumeForm Redesign

### 7.1 Current Structure

- Single flat form.
- `formData: Record<string, any>`.
- `template.questions.map(...)` renders all fields.

### 7.2 New Structure

```tsx
export function ResumeForm({ template, backendToken, onBack, onGenerate, isGenerating }: ResumeFormProps) {
  const [formData, setFormData] = useState<FormDataShape>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Group questions by section
  const sections = useMemo(() => {
    const map = new Map<string, TemplateSection>();
    for (const s of template.sections || []) {
      map.set(s.id, { ...s, questions: [] });
    }
    for (const q of template.questions) {
      const section = map.get(q.sectionId);
      if (section) section.questions.push(q);
    }
    return Array.from(map.values());
  }, [template.sections, template.questions]);

  // Render non-repeatable sections as flat field groups
  // Render repeatable sections as RepeatableSection components
}
```

### 7.3 Form Data Shape Management

```typescript
// Helper to update nested values
const updateFormValue = (sectionId: string, fieldKey: string, value: any, entryIndex?: number) => {
  setFormData(prev => {
    const next = { ...prev };
    if (entryIndex !== undefined) {
      // Repeatable section entry
      const sectionData = [...(prev[sectionId] || [])];
      sectionData[entryIndex] = { ...sectionData[entryIndex], [fieldKey]: value };
      next[sectionId] = sectionData;
    } else {
      // Non-repeatable section
      next[sectionId] = { ...(prev[sectionId] || {}), [fieldKey]: value };
    }
    return next;
  });
};
```

---

## 8. RepeatableSection Component Design

### 8.1 Component Interface

```typescript
interface RepeatableSectionProps {
  section: TemplateSection;  // contains id, title, repeatable, maxEntries, minEntries, fields
  data: any[];               // array of entry objects
  onChange: (entries: any[]) => void;
  errors: Record<string, string>;
}
```

### 8.2 Rendering Logic

```
RepeatableSection
  ├── Section Header ("Projects [2 entries]")
  ├── Entry List
  │   ├── EntryCard [0]
  │   │   ├── FormFieldRenderer (name)
  │   │   ├── FormFieldRenderer (description)
  │   │   ├── FormFieldRenderer (tech_stack)
  │   │   └── [Remove Entry] button (if minEntries < current count)
  │   ├── EntryCard [1]
  │   │   └── ...
  │   └── [Add Entry] button (if maxEntries not reached)
  └── Validation summary
```

### 8.3 Entry State Management

Each `EntryCard` manages its own field state. On blur/change, it broadcasts the entire updated entry array to the parent `RepeatableSection`, which calls `onChange(updatedEntries)`.

```typescript
const EntryCard = ({ entry, fields, onChange, onRemove, canRemove }) => {
  const [localData, setLocalData] = useState(entry);

  const handleChange = (fieldKey: string, value: any) => {
    const updated = { ...localData, [fieldKey]: value };
    setLocalData(updated);
    onChange(updated);
  };

  return (
    <div className="border border-slate-700 rounded-lg p-4 mb-3">
      {fields.map(f => (
        <FormFieldRenderer
          key={f.key}
          question={{ ...f, id: `${entry._tempId || entry.name}_${f.key}` }}
          value={localData[f.key] || ''}
          onChange={(val) => handleChange(f.key, val)}
        />
      ))}
      {canRemove && <button onClick={onRemove}>Remove</button>}
    </div>
  );
};
```

### 8.4 Add/Remove Constraints

- **minEntries:** Disable "Remove" when `entries.length <= minEntries`.
- **maxEntries:** Disable "Add" when `entries.length >= maxEntries`.
- **Empty entry creation:** When adding, create `{ _tempId: uuid(), ...fields.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {}) }`.

---

## 9. Validation Strategy

### 9.1 Current Validation

- `ResumeDataService.validate(studentData, flatSchema)` in `DocxTemplateFiller`.
- Validates `required` fields against flat schema.
- Returns `{ valid, issues, data }`.

### 9.2 New Validation

**Two-layer validation:**

1. **Frontend (real-time):**
   - Each `FormFieldRenderer` validates on blur.
   - `RepeatableSection` validates `minEntries` count.
   - Errors displayed inline.

2. **Backend (authoritative):**
   - `ResumeDataService.validate()` updated to accept nested/array schema:
     ```typescript
     validate(data: Record<string, any>, schema: DetectedSection[]): ResumeDataValidationResult
     ```
   - Iterates sections:
     - If `section.repeatable`:
       - Validate each entry object against `section.fields`.
       - Check `minEntries <= entries.length <= maxEntries`.
     - If not repeatable:
       - Validate `data[sectionId]` object against `section.fields`.

**Validation issues format:**
```typescript
interface ValidationIssue {
  path: string;           // "projects[0].name" or "summary.text"
  message: string;        // "This field is required"
  sectionId: string;
  sectionTitle: string;
}
```

### 9.3 aiService Enhance Compatibility

`aiService.enhanceResumeFields()` currently accepts `enhanceableTags: string[]`. In v2, it needs section context:

```typescript
// Current
enhanceableTags = ["description", "responsibilities"]

// New
enhanceableTags = [
  "projects.description",
  "experience.responsibilities",
  "summary.text"
]
```

Or pass section-aware metadata:
```typescript
enhanceableSections = [
  { sectionId: "projects", fields: ["description", "tech_stack"] }
]
```

AI enhancement iterates entries in repeatable sections and enhances each matching field.

---

## 10. AutoSave Strategy

### 10.1 Current Behavior

- `useAutoSave` calls `generateResume(backendToken, templateId, formData, 'none')`.
- `generateResume` endpoint calls `processResumeController`.
- `processResumeController` saves draft AND generates DOCX preview.
- **Problem:** Draft saving triggers full document generation every 2 seconds. Expensive and unnecessary.

### 10.2 New Behavior

**Separate draft save from document generation:**

1. **New endpoint:** `POST /api/resume/draft`
   - Accepts `{ templateId, data }`.
   - Saves to `StudentResume.filledData`.
   - Returns `{ success: true, lastSavedAt }`.
   - Does NOT generate DOCX.

2. **Updated `useAutoSave`:**
   ```typescript
   export function useAutoSave({
     backendToken, templateId, formData,
     onSaveStart, onSaveSuccess, onSaveError
   }) {
     const timerRef = useRef<NodeJS.Timeout | null>(null);

     const saveDraft = useCallback(async () => {
       if (!templateId || !backendToken || isSavingRef.current) return;
       isSavingRef.current = true;
       onSaveStart();

       try {
         await saveDraft(backendToken, templateId, formData); // new API call
         onSaveSuccess(formData);
       } catch (error) {
         onSaveError(error instanceof Error ? error : new Error('Failed to save draft'));
       } finally {
         isSavingRef.current = false;
       }
     }, [backendToken, templateId, formData, ...]);

     useEffect(() => {
       if (!templateId || !backendToken) return;
       timerRef.current = setTimeout(saveDraft, 2000);
       return () => { if (timerRef.current) clearTimeout(timerRef.current); };
     }, [formData, templateId, backendToken, saveDraft]);

     return { saveDraft };
   }
   ```

3. **Document generation only on explicit "Generate Resume" button click:**
   - Calls existing `generateResume` endpoint.
   - Generates DOCX + HTML preview + validation.

### 10.3 Deep Equality for AutoSave

To avoid unnecessary saves, use deep equality:

```typescript
import { isEqual } from 'lodash';

useEffect(() => {
  if (isEqual(formData, previousFormDataRef.current)) return;
  previousFormDataRef.current = formData;
  // trigger save
}, [formData]);
```

---

## 11. DOCX Rendering Strategy

### 11.1 Template Requirements

Templates processed by v2 must support one of:

1. **Loop syntax for repeatable sections:**
   ```
   {{#projects}}
   {{name}}
   {{/projects}}
   ```

2. **Single placeholder for non-repeatable sections:**
   ```
   {{text}}
   ```

### 11.2 PlaceholderInjector v2 Output

For repeatable sections:
- Before section content: `{{#${section.id}}}`
- After section content: `{{/${section.id}}}`
- Field placeholders inside: `{{${field.key}}}`

For non-repeatable sections:
- Field placeholders: `{{${field.key}}}` (same as current)

### 11.3 Rendering Pipeline

```
Student submits form
    ↓
Frontend sends nested/array formData
    ↓
processResumeController
  - data = formData (nested/array)
  - enhanceableTags derived from template.questions (non-repeatable only) + section metadata
    ↓
ResumeService.processResumeTemplate(template.fileUrl, data, tone, enhanceableTags)
  - Fetches processed DOCX with loop tags from Cloudinary
  - doc.setData(data) — nested/array structure
  - doc.render()
  - Docxtemplater handles loops natively
    ↓
Return docxBuffer + htmlPreview
```

### 11.4 Backward Compatibility for Existing Templates

Existing templates without loop tags will still render top-level placeholders. If a template has `{{name}}` but the data is now `{ projects: [{name: "A"}] }`, the top-level `{{name}}` will be empty.

**Solution:** `PlaceholderInjector` v2 can be configured to:

- **Mode A (v2 templates):** Inject loop tags for repeatable sections.
- **Mode B (legacy templates):** Fall back to flat placeholder injection and flatten data before rendering.

A `ResumeTemplate.schemaVersion` field or `supportsLoops` boolean flag can indicate which mode to use.

---

## 12. Backward Compatibility

### 12.1 API Versioning

Do not break existing endpoints. Instead:

- `GET /api/resume/templates` — unchanged return shape (adds `repeatable` to sections, which is already present).
- `GET /api/resume/draft` — returns `filledData` in the new nested shape for v2 drafts, flat shape for v1 drafts. Frontend handles both.
- `POST /api/resume/generate` — accepts both flat and nested `data`. Backend normalizes before rendering.
- `POST /api/resume/templates/:id/process` — unchanged.

### 12.2 Frontend Compatibility

- Old templates (processed before v2) return flat `questions[]`. `ResumeForm` detects `sections[].repeatable` and renders accordingly.
- If `questions` is flat and no `sections` metadata, fall back to current flat rendering.
- `ResumeForm` accepts both flat `formData` and nested `formData` via a `dataFormat` flag in `ResumeTemplateDTO`.

### 12.3 Draft Compatibility

- v1 drafts (flat) display with a migration prompt.
- v2 drafts (nested) load directly into RepeatableSection components.

---

## 13. Rollback Strategy

### 13.1 Feature Flags

Wrap v2 behavior behind a feature flag:

```typescript
// Backend
const USE_V2_RESUME_BUILDER = process.env.USE_V2_RESUME_BUILDER === 'true';

// Frontend
const useV2ResumeBuilder = process.env.NEXT_PUBLIC_USE_V2_RESUME_BUILDER === 'true';
```

### 13.2 Rollback Procedure

1. **Set feature flag to false.**
2. **Backend:** Falls back to existing flat placeholder injection and flat data handling.
3. **Frontend:** Falls back to flat `ResumeForm` rendering.
4. **Existing v2 drafts:** Remain in nested format. The flat renderer cannot display them.
   - **Mitigation:** On rollback, show migration prompt to re-enter data.
   - **Alternative:** Keep a normalization layer that flattens nested data for v1 display.

### 13.3 Database Rollback

- No schema migrations are destructive.
- `ResumeTemplate` gains optional `sectionKeyMapping` field — safe to leave.
- `StudentResume` gains optional `schemaVersion` field — safe to leave.
- Rollback does not require data deletion.

---

## 14. Estimated Implementation Phases

### Sprint 0: Foundation and Experimentation (1 week)

**Goal:** Prove the loop injection and rendering pipeline works end-to-end with a manual test.

| Task | Owner | Description |
|---|---|---|
| Create test DOCX with loop tags | Backend | Manual DOCX with `{{#projects}}{{name}}{{/projects}}` |
| Write script to render loop DOCX | Backend | `doc.setData({ projects: [{name:"A"}, {name:"B"}] })`, verify output |
| Update PlaceholderInjector loop prototype | Backend | Modify existing `getUniqueKey` approach to emit `{{#id}}...{{/id}}` for a test section |
| Run end-to-end script | Backend | Process template → inject loops → render with data → verify DOCX |
| Document findings | Backend | Note any docxtemplater quirks (nested loops, empty arrays, whitespace) |

**Acceptance Criteria:**
- A DOCX with `{{#projects}}{{name}}{{/projects}}` renders 2 project blocks when given 2 entries.
- Empty array `projects: []` renders zero blocks (no leftover whitespace).
- Single entry `projects: [{name:"A"}]` renders one block.

**No production code changes in Sprint 0.**

---

### Sprint 1: Backend Schema and Injection (2 weeks)

**Goal:** Make the backend produce and store loop-enabled templates and section-aware data.

| Task | Owner | Description |
|---|---|---|
| Add `sectionKeyMapping` to ResumeTemplate model | Backend | Optional field. Stores per-section key mapping from injection. |
| Redesign PlaceholderInjector | Backend | Add loop wrapping for `repeatable === true` sections. Emit `{{#sectionId}}` / `{{/sectionId}}`. Return `sectionKeyMapping` in result. |
| Update `TemplateProcessingOrchestrator` | Backend | Pass `sectionKeyMapping` through pipeline. Store in `InjectionResult`. |
| Update `processTemplateController` | Backend | Store `sectionKeyMapping` in `ResumeTemplate`. Generate `questions` only from non-repeatable fields. Add `sectionId` and `sectionTitle` to each question. |
| Update `DocxTemplateFiller` | Backend | Accept `sectionKeyMapping`. Expand data per-section for loop rendering. Validate nested/array schema. |
| Update `ResumeService` | Backend | Ensure `doc.setData()` handles nested/array objects correctly. Add logging for loop section rendering. |
| Update `aiService` | Backend | `enhanceResumeFields()` handles repeatable sections: iterates entries, enhances matching fields. |
| Add `POST /api/resume/draft` endpoint | Backend | Lightweight draft save. Does NOT generate DOCX. |
| Update `StudentResume` queries | Backend | Add `schemaVersion` field. Detect v1 vs v2 format on load. |

**Backend Tests:**
- `placeholderInjector.test.ts`: Assert loop tags injected for repeatable sections.
- `docxTemplateFiller.test.ts`: Assert nested data validates and renders correctly.
- `resumeController.test.ts`: Assert new draft endpoint saves nested data.
- `sectionDetector.test.ts`: Assert `repeatable` flag propagates to questions.

**Acceptance Criteria:**
- `POST /api/resume/templates/:id/process` returns a DOCX with loop tags in repeatable sections.
- `GET /api/resume/templates/:id` returns `sectionKeyMapping`.
- `POST /api/resume/draft` saves nested data.
- Existing `POST /api/resume/generate` still works with flat data (backward compat).

---

### Sprint 2: Frontend Form Redesign (2 weeks)

**Goal:** Replace flat form with section-grouped form and repeatable entry lists.

| Task | Owner | Description |
|---|---|---|
| Create `RepeatableSection` component | Frontend | Dynamic entry list with add/remove, min/max enforcement. |
| Update `ResumeForm` | Frontend | Group questions by section using `sectionId`. Render non-repeatable sections as flat field groups. Render repeatable sections using `RepeatableSection`. |
| Update `ResumeForm` state shape | Frontend | Change `formData` from `Record<string, any>` to `FormDataShape` (nested/array). |
| Update `handleChange` / `validate` | Frontend | Navigate nested paths. Validate repeatable entry counts. |
| Update `useAutoSave` | Frontend | Call new `POST /api/resume/draft`. Add deep equality check to avoid redundant saves. |
| Update `resumeApi.ts` | Frontend | Add `saveDraft()` function. Keep `fetchDraft()` and `generateResume()`. |
| Update `FormFieldRenderer` | Frontend | Ensure it works with nested `value` paths. |
| Add `FormDataShape` type | Frontend | TypeScript interface for nested form data. |

**Frontend Tests:**
- `RepeatableSection.test.tsx`: Add/remove entries, min/max enforcement, field updates.
- `ResumeForm.test.tsx`: Render non-repeatable and repeatable sections, submit nested data.
- `resumeApi.test.ts`: Assert `saveDraft` sends nested payload.

**Acceptance Criteria:**
- A template with 1 repeatable section (Projects) and 2 non-repeatable sections (Summary, Skills) renders correctly.
- User can add 3 project entries, fill fields, and see nested `formData`.
- Auto-save sends nested data to backend every 2s after a change.

---

### Sprint 3: Migration and Integration (1.5 weeks)

**Goal:** Connect frontend to new backend, migrate existing drafts, test end-to-end.

| Task | Owner | Description |
|---|---|---|
| Write migration script | Backend | `scripts/migrate-student-resumes.ts` — adds `schemaVersion: 2` to all drafts. Does NOT transform data. |
| Add lazy migration handler | Backend | `getSavedResumeController` detects v1 drafts, returns with `migrated: false` flag. |
| Implement migration banner | Frontend | If draft is v1, show "Start fresh" prompt. |
| End-to-end test suite | Both | Full flow: process template → load form → fill repeatable entries → auto-save → generate DOCX → verify rendered output. |
| Performance test | Backend | Measure render time for templates with 3 repeatable sections, 5 entries each. |
| Edge case testing | Both | Empty arrays, max entries reached, min entries enforcement, special characters in fields. |

**Migration Tasks:**
- Run migration script against staging DB.
- Verify zero data loss.
- Deploy feature flag OFF.
- Enable feature flag for internal beta.
- Monitor error rates and draft save latency.

**Acceptance Criteria:**
- Full end-to-end flow completes without errors for templates with 2 repeatable + 3 non-repeatable sections.
- Generated DOCX contains correct values in all loop iterations.
- Drafts persist and reload correctly.
- Legacy v1 drafts show migration prompt.

---

### Sprint 4: Polish, Rollout, and Documentation (1 week)

**Goal:** Production-ready polish, documentation, and gradual rollout.

| Task | Owner | Description |
|---|---|---|
| Remove feature flags | Both | Make v2 behavior default after 1 week of stable beta. |
| Template authoring guide | Docs | Document loop syntax, section detection rules, repeatable field inference. |
| Admin template validation | Backend | Add optional validation that uploaded DOCX templates have matching loop placeholders for repeatable sections. |
| Error boundary | Frontend | Graceful fallback if section metadata is missing or malformed. |
| Monitoring | Backend | Track: draft save latency, DOCX render time, validation failure rate, migration prompt acceptance rate. |
| Cleanup dead code | Backend | Remove old flat-path code paths after 2 weeks of stable v2. |

**Acceptance Criteria:**
- Feature flag removed. v2 is the only code path.
- All templates in production use loop syntax (or are converted by injector).
- Monitoring dashboards show < 200ms draft save latency, < 2s DOCX generation.
- Documentation covers template authoring, section detection, and troubleshooting.

---

## 15. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Existing DOCX templates lack loop tags | High | High | PlaceholderInjector can inject loop tags during processing. No template authoring required initially. |
| Docxtemplater loop rendering bugs (whitespace, nesting) | Medium | Medium | Sprint 0 experimentation catches known issues. Document workarounds. |
| Data migration from v1 drafts causes confusion | Medium | Low | Lazy migration with clear user prompt. No automatic data transformation. |
| Frontend form complexity grows with nested state | Medium | Medium | Use `useReducer` or Zustand for complex form state. Isolate `RepeatableSection` component. |
| AI enhancement breaks on nested data | Medium | Medium | Update `aiService.enhanceResumeFields()` in Sprint 1. Add integration tests. |
| Performance regression with large collections | Low | Medium | Set `maxEntries` defaults. Measure in Sprint 3. |
| Rollback complexity with mixed v1/v2 drafts | Low | High | Feature flags + lazy migration + normalization layer for rollback. |

---

## 16. Testing Strategy

### 16.1 Backend Tests

| Suite | Coverage |
|---|---|
| `placeholderInjector.test.ts` | Loop injection for repeatable sections. Non-repeatable sections unchanged. `sectionKeyMapping` output. |
| `docxTemplateFiller.test.ts` | Nested data validation. Array entry validation. Loop rendering with docxtemplater. |
| `sectionDetector.test.ts` | `repeatable` flag on known sections. `minEntries`/`maxEntries` propagation. |
| `resumeController.test.ts` | New `/draft` endpoint. `sectionKeyMapping` storage. Question generation excludes repeatable fields. |
| `aiService.test.ts` | Enhancement of nested/array data. |
| `resumeService.test.ts` | `doc.setData()` with nested objects and arrays. |

### 16.2 Frontend Tests

| Suite | Coverage |
|---|---|
| `RepeatableSection.test.tsx` | Add/remove entries. Min/max enforcement. Field value propagation. |
| `ResumeForm.test.tsx` | Non-repeatable section rendering. Repeatable section rendering. Nested `formData` shape. Validation. |
| `resumeApi.test.ts` | `saveDraft` sends nested payload. `fetchDraft` handles v1 and v2 responses. |
| `FormFieldRenderer.test.tsx` | Nested value paths. Error display. |

### 16.3 End-to-End Tests

| Scenario | Steps |
|---|---|
| Non-repeatable template | Upload → Process → Load form → Fill summary/skills → Save draft → Generate DOCX → Verify placeholders filled |
| Repeatable template (Projects) | Upload → Process → Load form → Add 2 projects → Fill fields → Save draft → Generate DOCX → Verify both projects rendered |
| Mixed template | Upload → Process → Load form → Fill summary (flat) + projects (repeatable) → Generate → Verify all sections rendered |
| Draft persistence | Fill form → Auto-save → Refresh page → Load draft → Verify data restored |
| Draft migration | Load v1 draft → Show migration prompt → Start fresh → Verify new draft saved as v2 |
| AI enhancement | Fill fields → Generate with tone → Verify enhanced text in DOCX |

### 16.4 Contract Tests

| Contract | Test |
|---|---|
| `GET /api/resume/templates` | Returns `sections[].repeatable`, `questions[].sectionId` |
| `GET /api/resume/draft` | Returns nested `filledData` for v2, flat for v1 |
| `POST /api/resume/draft` | Accepts nested data, saves, returns `schemaVersion: 2` |
| `POST /api/resume/generate` | Accepts nested data, renders DOCX with loops |
| `POST /api/resume/templates/:id/process` | Returns `sectionKeyMapping`, DOCX with loop tags |

---

## 17. Summary of Changes by Sprint

| Sprint | Backend | Frontend | DB | Duration |
|---|---|---|---|---|
| 0 — Foundation | PlaceholderInjector loop prototype | — | — | 1 week |
| 1 — Backend | Injector redesign, new draft endpoint, schema mapping | — | Optional `sectionKeyMapping`, `schemaVersion` | 2 weeks |
| 2 — Frontend | — | RepeatableSection, ResumeForm redesign, nested state | — | 2 weeks |
| 3 — Migration | Lazy migration handler, normalization | Migration banner, dual-format support | Migration script | 1.5 weeks |
| 4 — Polish | Feature flag removal, cleanup | Feature flag removal, cleanup | — | 1 week |

**Total estimated duration: 7.5 weeks**

**No production code changes in Sprint 0.** Sprint 0 is a spike to validate the docxtemplater loop rendering approach before committing to the full implementation.
