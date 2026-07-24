# Placeholder-First Architecture — Technical Design

**Date**: 2026-07-24  
**Decision**: Adopt Architecture B (Placeholder-First) as the production design.  
**Status**: Design phase — no implementation code yet.

---

## 1. Current State Analysis

### 1.1 What already works
| Component | Evidence | Reuse in new architecture |
|-----------|----------|---------------------------|
| `DocxTemplateFiller` (`docxTemplateFiller.service.ts`) | Loads DOCX → docxtemplater → `doc.setData()` → `doc.render()` → mammoth HTML. Tested and working. | **Core generation path.** Becomes the standard fill path for all placeholder-first templates. |
| `ResumeService.processResumeTemplate` (`resumeService.ts:16-74`) | Fetches template from Firebase Storage, applies docxtemplater, generates DOCX + HTML preview. | **Generation entrypoint.** Remains the student-facing generation API. |
| `ResumeDataService.validate` (`resumeData.service.ts`) | Validates student data against `TemplateField[]` schema (required, regex, type, length). | **Data validation.** Reused for student-side validation before generation. |
| `ResumeTemplate` Mongoose model | Stores `templateName`, `type`, `target`, `fileUrl`, `organizationId`, `uploadedBy`, `sections`, `questions`, `originalFileUrl`, `confidence`, `reviewed`. | **Template metadata store.** Extended with new fields for processing mode and validation state. |
| `uploadTemplateController` (`resumeController.ts:29-143`) | Handles faculty upload, role check, Firebase Storage upload, DB save. Contains disabled "interactive mappings" code that does string replacement on XML. | **Upload endpoint.** Extended to run validation and return a structured report. |
| `HeadingDetector` / `SectionDetector` | Detects sections from keywords, bold formatting, title case. | **Upload-time assistant.** Repurposed to warn faculty if sections are detected but no matching placeholders are found. |

### 1.2 What is deprecated
| Component | Action |
|-----------|--------|
| `PlaceholderInjector` | **Frozen.** No new features. Only critical bugs (data corruption, crashes) may be fixed. |
| `DocxTemplateGenerator` | **Deprecated.** Its only job was regenerating DOCX after injection. docxtemplater handles rendering internally. |
| `TemplateProcessingOrchestrator` | **Deprecated.** Its pipeline (extract → detect → inject → generate) is replaced by validate → store. |
| `ResumeGenerationOrchestrator` | **Deprecated.** Its pipeline (extract → inject → generate → fill) is replaced by a direct fill using `ResumeService`. |
| `processTemplateController` | **Deprecated endpoint.** Will be removed in Phase 4. |
| Auto-injection debug paths (`PLACEHOLDER_INJECTOR_DEBUG`, `C:/Users/.../Temp/kilo`) | **Removed.** These are developer-only debugging artifacts. |

---

## 2. Canonical Resume Schema

The validator checks placeholder names against a canonical schema. This schema is derived from the existing `FIELD_INFERENCE` map in `sectionDetector.service.ts` and the `TemplateField` type in `milestone2.types.ts`.

```typescript
export interface CanonicalField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'email' | 'phone' | 'url' | 'select' | 'list';
  required: boolean;
  section: string;
  aliases: string[];       // accepted alternative spellings
  suggestions: string[];   // common typos mapped to this key
}
```

### 2.1 Canonical sections and fields

| Section | Field Key | Label | Type | Required | Aliases | Common Typos |
|---------|-----------|-------|------|----------|---------|--------------|
| summary | text | Summary | textarea | true | summary_text, about_me, profile | summry, abt, prof |
| skills | items | Skills | list | true | skills_list, technical_skills | skill, skiils, skilss |
| skills | category | Category | text | false | skill_category | catgory |
| experience | company | Company | text | true | company_name, employer | compny, comp |
| experience | role | Role | text | true | job_title, position | roll, roel, positon |
| experience | duration | Duration | text | false | employment_duration, dates | duratn |
| experience | responsibilities | Responsibilities | textarea | false | desc, description, duties | responsibilty |
| education | degree | Degree | text | true | qualification, course | degre, degre |
| education | institution | Institution | text | true | school, college, university | inst, insitution |
| education | year | Year | date | false | graduation_year, yop | yer, yr |
| education | cgpa | CGPA/GPA | text | false | gpa, cgpa_score | cgpa_score |
| projects | name | Project Name | text | true | project_name | proj_name |
| projects | description | Description | textarea | false | project_desc, details | descr |
| projects | tech_stack | Tech Stack | list | false | technologies, tools | tech |
| certifications | name | Certification Name | text | true | cert_name | cert |
| certifications | issuer | Issuer | text | false | issuing_body, authority | issusr |
| certifications | date | Date | date | false | cert_date, issue_date | dt |
| personal | name | Name | text | true | full_name, candidate_name | nam |
| personal | email | Email | email | true | email_id, mail | e_mail |
| personal | phone | Phone | phone | true | phone_number, mobile, contact | ph, mob |
| personal | url | URL | url | false | website, linkedin, github | link |

### 2.2 Reserved / system placeholders
These are not user fields but may appear in templates and must be preserved.

| Placeholder | Purpose |
|-------------|---------|
| `{{#sectionName}}` … `{{/sectionName}}` | docxtemplater loop syntax for repeatable sections |
| `{{#each sectionName}}` … `{{/each}}` | alternative loop syntax |
| `{{?sectionName}}` … `{{/sectionName}}` | conditional syntax |
| `{{pageNumber}}` | page numbering |
| `{{date}}` | current date |

These are **not** validated as missing fields. They are tolerated but not counted as logical resume fields.

---

## 3. PlaceholderValidator Service Design

### 3.1 Location
`src/services/placeholderValidator.service.ts`

### 3.2 Public interface

```typescript
export interface ExtractedPlaceholder {
  raw: string;           // exact text including braces, e.g. "{{degree}}"
  key: string;           // inside braces, e.g. "degree"
  location: string;      // pathString from XML, e.g. "p[2]/r[0]/t[0]"
  context: string;       // surrounding 80 chars of text
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: 'MISSING' | 'DUPLICATE' | 'UNKNOWN' | 'MISSPELLED' | 'RESERVED_CONFLICT' | 'STYLE_MISMATCH';
  placeholder: string;
  message: string;
  suggestion?: string;
  location?: string;
}

export interface ValidationReport {
  valid: boolean;
  placeholders: ExtractedPlaceholder[];
  issues: ValidationIssue[];
  summary: {
    total: number;
    unique: number;
    duplicates: number;
    missingRequired: string[];
    unknown: string[];
    misspelled: string[];
    reservedConflicts: string[];
  };
  sections: DetectedSection[];   // from HeadingDetector, for context
}

export class PlaceholderValidator {
  validate(buffer: Buffer): Promise<ValidationReport>;
}
```

### 3.3 Validation algorithm

1. **Extract placeholders**
   - Parse `word/document.xml` from DOCX ZIP using PizZip.
   - Scan all `<w:t>` text nodes with regex `/\{\{([^}]+)\}\}/g`.
   - Record `raw`, `key`, and the `pathString` location.
   - Record 80 chars of surrounding text for each match as `context`.

2. **Deduplicate**
   - Group extracted keys by lowercase normalized form.
   - Flag any key that appears more than once with `DUPLICATE`.
   - Example: `{{degree}}` in p[2] and `{{Degree}}` in p[5] → duplicate with suggestion to standardize casing.

3. **Classify each key**
   - Look up the normalized key in the canonical schema.
   - If found: mark as `KNOWN`.
   - If not found: run typo detection.
     - Levenshtein distance ≤ 2 against canonical keys → flag `MISSPELLED` with suggestion.
     - Example: `{{degre}}` → `MISSPELLED: Did you mean {{degree}}?`
   - If not found and no typo match → flag `UNKNOWN`.

4. **Check required coverage**
   - For every canonical field marked `required: true`, check if a matching placeholder exists.
   - Missing required fields → flag `MISSING` with severity `error`.
   - Missing optional fields → flag `MISSING` with severity `warning` or `info`.

5. **Reserved-word conflict check**
   - If a placeholder matches a reserved word (`sectionName`, `each`, `pageNumber`, `date`), flag `RESERVED_CONFLICT` with explanation.

6. **Style mismatch check**
   - Run `HeadingDetector` on the document.
   - For every detected section, check if the section title semantically corresponds to a placeholder in the template.
   - Example: section "Education" detected, but no `{{degree}}`/`{{institution}}`/`{{year}}` found → `WARNING: Section "Education" detected but no matching placeholders found.`
   - This is advisory only (`info` severity), not blocking.

7. **Build report**
   - Assemble `ValidationReport` with full placeholder list, issues, and summary counts.
   - `valid = true` only when no `error`-severity issues exist.

### 3.4 Design decisions and rationale

| Decision | Rationale |
|----------|-----------|
| Extract from actual `<w:t>` nodes, not reconstructed text | Avoids XML-entity confusion (e.g., `&amp;`). Ensures placeholders in headers, footers, text boxes, and tables are discovered if they exist in XML. |
| Case-sensitive keys with case-insensitive duplicate detection | Faculty may write `{{Degree}}` and `{{degree}}`. Both are valid in docxtemplater but are confusing. Duplicate detection normalizes case and warns. |
| Levenshtein distance ≤ 2 for typos | Catches common typos (`degre`, `institustion`, `skils`) without false-positive matches on short strings. |
| Reserved word check | Prevents faculty from accidentally creating placeholders that collide with docxtemplater loop/condition syntax. |
| Style mismatch is advisory, not blocking | Faculty may intentionally use a section without a placeholder (static content). Do not block upload. |

---

## 4. Faculty Upload Workflow (Placeholder-First)

### 4.1 End-to-end flow

```
Faculty (Web UI)
    │
    ▼
POST /api/resume/upload-template
    │  - multipart: DOCX file
    │  - body: templateName, type, target
    │
    ▼
Backend: PlaceholderValidator.validate(buffer)
    │
    ├── Parse DOCX XML
    ├── Extract {{placeholders}}
    ├── Classify keys (known / misspelled / unknown / duplicate / reserved)
    ├── Check required coverage
    ├── Run HeadingDetector for style-mismatch warnings
    │
    ▼
Validation Report
    │
    ├── errors.length > 0  ──► 400 Bad Request
    │       Body: { valid: false, errors: [...], suggestions: [...] }
    │       UI: Show inline errors with "Fix template" guidance
    │
    └── errors.length === 0  ──► 201 Created
            Body: {
              valid: true,
              placeholders: [...],
              summary: {...},
              sections: [...],
              templateUrl: "...",
              message: "Template validated successfully"
            }
            Actions:
              1. Store original DOCX in Firebase Storage
              2. Save ResumeTemplate record (processingMode: 'placeholder-first')
              3. Return template metadata to UI
```

### 4.2 Faculty UI flow

| Step | Faculty Action | System Response |
|------|---------------|-----------------|
| 1 | Opens "Upload Template" page | Shows form: template name, type, target, file picker, inline help text explaining `{{placeholder}}` syntax. |
| 2 | Selects a DOCX file | Client shows file name and size. |
| 3 | Clicks **Validate Template** | Client uploads to `POST /api/resume/validate-template` (dry-run). Backend runs `PlaceholderValidator` and returns report without saving. |
| 4a | Report has errors | UI shows blocking errors in red: `{{degre}}` is misspelled — did you mean `{{degree}}?`; missing required placeholders: `{{name}}`, `{{email}}`. Faculty edits DOCX in Word and re-validates. |
| 4b | Report has warnings | UI shows warnings in yellow: `Style mismatch: section "Education" detected but no placeholders found.` Faculty can choose to ignore or fix. |
| 4c | Report is clean | UI shows green success: `12 placeholders found. All required fields covered.` |
| 5 | Clicks **Upload Template** | Client sends `POST /api/resume/upload-template`. Backend re-validates (server always re-validates; client validation is UX-only). On success, template is stored. |
| 6 | Template list updates | Faculty sees new template in list with badge: `Validated` or `Placeholder-first`. |

### 4.3 Inline help content

The upload page must include:

> **Structured Template Guide**
>
> Use Word to insert placeholders directly into your template. Placeholders are wrapped in double curly braces:
>
> ```
> {{name}}
> {{email}}
> {{phone}}
> {{summary}}
> {{skills}}
> {{experience}}
> {{education}}
> {{projects}}
> ```
>
> For list fields, use the singular form. The system will repeat the section automatically:
>
> ```
> {{#experience}}
> {{company}} — {{role}} ({{duration}})
> {{/experience}}
> ```
>
> **Supported sections:** Summary, Skills, Experience, Education, Projects, Certifications.  
> **Required placeholders:** `{{name}}`, `{{email}}`, `{{phone}}`, `{{summary}}`, `{{skills}}`, `{{experience}}`, `{{education}}`.  
> **Do NOT use** `{{sectionName}}`, `{{each}}`, `{{?sectionName}}` as field names — these are reserved by the template engine.

---

## 5. API Contracts

### 5.1 New / modified endpoints

| Method | Route | Auth | Purpose | Request | Response |
|--------|-------|------|---------|---------|----------|
| POST | `/api/resume/validate-template` | Faculty / Admin | Dry-run validation without saving | multipart: `file`; body: `templateName`, `type`, `target` | `ValidationReport` |
| POST | `/api/resume/upload-template` | Faculty / Admin | Upload + validate + save | multipart: `file`; body: `templateName`, `type`, `target` | `ResumeTemplate` + `ValidationReport` |
| GET | `/api/resume/templates/:id/validation` | Faculty / Admin | Re-fetch validation report for existing template | — | `ValidationReport` |
| PUT | `/api/resume/templates/:id/revalidate` | Faculty / Admin | Re-run validation on stored template | — | `ValidationReport` |
| PUT | `/api/resume/templates/:id/convert` | Faculty / Admin | Convert legacy auto-injected template to structured | body: `{ fileBuffer: base64 }` | `ResumeTemplate` |

### 5.2 Validation report response shape

```typescript
{
  valid: boolean,
  placeholders: [
    {
      raw: "{{degree}}",
      key: "degree",
      location: "p[2]/r[0]/t[0]",
      context: "BS Computer Science, MIT, 2020"
    }
  ],
  issues: [
    {
      severity: "error",
      code: "MISSING",
      placeholder: "{{name}}",
      message: "Required field 'name' is missing from template",
      suggestion: "Add {{name}} to the header of your template"
    },
    {
      severity: "warning",
      code: "MISSPELLED",
      placeholder: "{{degre}}",
      message: "Placeholder 'degre' is misspelled",
      suggestion: "Did you mean {{degree}}?"
    }
  ],
  summary: {
    total: 12,
    unique: 10,
    duplicates: 2,
    missingRequired: ["name", "email"],
    unknown: ["foo"],
    misspelled: ["degre"],
    reservedConflicts: []
  },
  sections: [
    {
      id: "s1",
      title: "Education",
      order: 0,
      headingParagraphIndex: 1,
      fields: ["degree", "institution", "year", "cgpa"]
    }
  ]
}
```

### 5.3 Upload response changes

The existing `uploadTemplateController` response is extended:

```typescript
{
  success: true,
  data: {
    _id: "...",
    templateName: "...",
    type: "global",
    target: "",
    fileUrl: "...",
    organizationId: "...",
    processingMode: "placeholder-first",   // NEW
    validationStatus: "valid",             // NEW
    validationReport: { ... },             // NEW
    sections: [ ... ],                     // preserved from legacy if available
    questions: [ ... ],                    // derived from placeholders
    createdAt: "...",
    updatedAt: "..."
  },
  message: "Resume template uploaded successfully"
}
```

### 5.4 process-template controller behavior

`processTemplateController` (`resumeController.ts:347-446`) is modified to support both modes:

```typescript
if (template.processingMode === 'placeholder-first') {
  // New path: template already has placeholders.
  // 1. Re-run PlaceholderValidator on stored file.
  // 2. If valid, return template metadata + validation report.
  // 3. Do NOT run TemplateProcessingOrchestrator.
  // 4. Do NOT generate a new fileUrl.
} else if (template.processingMode === 'auto-inject') {
  // Legacy path: run existing TemplateProcessingOrchestrator.
  // Marked as deprecated in response.
}
```

---

## 6. Database Changes

### 6.1 ResumeTemplate schema additions

Add the following fields to the existing `ResumeTemplate` Mongoose schema (`src/models/ResumeTemplate.ts`).

```typescript
processingMode: {
  type: String,
  enum: ['auto-inject', 'placeholder-first'],
  default: 'auto-inject',
  required: true,
  index: true
},

validationStatus: {
  type: String,
  enum: ['pending', 'valid', 'invalid', 'deprecated'],
  default: 'pending',
  required: true,
  index: true
},

validationReport: {
  valid: { type: Boolean, default: false },
  placeholders: [
    {
      raw: String,
      key: String,
      location: String,
      context: String
    }
  ],
  issues: [
    {
      severity: { type: String, enum: ['error', 'warning', 'info'] },
      code: String,
      placeholder: String,
      message: String,
      suggestion: String,
      location: String
    }
  ],
  summary: {
    total: { type: Number, default: 0 },
    unique: { type: Number, default: 0 },
    duplicates: { type: Number, default: 0 },
    missingRequired: [String],
    unknown: [String],
    misspelled: [String],
    reservedConflicts: [String]
  }
}
```

### 6.2 Migration script

Existing templates have no `processingMode` or `validationReport`. Run a one-time migration:

```javascript
// migration.js — run once via mongosh or a Mongoose migration tool
db.resumetemplates.updateMany(
  { processingMode: { $exists: false } },
  {
    $set: {
      processingMode: 'auto-inject',
      validationStatus: 'deprecated',
      validationReport: { valid: false, placeholders: [], issues: [], summary: {} }
    }
  }
);
```

After migration:
- All legacy templates are explicitly tagged `auto-inject` / `deprecated`.
- New uploads default to `placeholder-first`.
- Admin can re-process legacy templates via `/revalidate` or `/convert`.

---

## 7. PlaceholderValidator Implementation Plan (Pseudocode)

No implementation code in this document. The following is the algorithmic plan only.

### 7.1 Class structure

```
src/services/placeholderValidator.service.ts
├── class PlaceholderValidator
│   ├── constructor(private readonly canonicalSchema: CanonicalField[])
│   ├── validate(buffer: Buffer): Promise<ValidationReport>
│   ├── private extractPlaceholders(xml: string): ExtractedPlaceholder[]
│   ├── private classifyKeys(keys: string[]): Map<string, ClassificationResult>
│   ├── private detectTypos(key: string): string | null
│   ├── private checkRequiredCoverage(keys: Set<string>): ValidationIssue[]
│   ├── private checkReservedConflicts(keys: Set<string>): ValidationIssue[]
│   └── private checkStyleMismatch(doc: ExtractedDocument, keys: Set<string>): ValidationIssue[]
```

### 7.2 Key algorithms

**Typo detection**
- Pre-build a map of canonical keys → lowercase.
- For each unknown key, compute Levenshtein distance against all canonical keys.
- If minimum distance ≤ 2 and the unknown key length ≥ 3, suggest the closest match.
- Example: `degrs` vs `degree` → distance 2 → suggest `degree`.

**Duplicate detection**
- Normalize each extracted key to lowercase.
- Group by normalized form.
- Any group with size > 1 is a duplicate.
- Report each duplicate with the locations where it appears.

**Required coverage**
- Iterate `canonicalSchema.filter(f => f.required)`.
- For each required field, check if `normalizedKeySet.has(field.key)`.
- If missing, emit `MISSING` error with suggestion to add the placeholder to the appropriate section.

**Style mismatch**
- Run `HeadingDetector.findHeadingCandidates(document)`.
- For each detected section, check if any extracted placeholder key belongs to that section's field group.
- If a section is detected but has zero matching placeholders, emit `info`-level warning.
- This is advisory — faculty may intentionally have static section headers.

---

## 8. Frontend Changes

### 8.1 Upload page updates

| Component | Change |
|-----------|--------|
| Template upload form | Add helper text: "This template must contain `{{placeholders}}` in Word." Add a **Validate Template** button that runs client-side extraction (same regex on uploaded file) for instant feedback before server upload. |
| Validation results panel | New component: shows extracted placeholders as tags, errors as red alerts, warnings as yellow alerts, suggestions as clickable links (e.g., "Add `{{name}}` to header"). |
| Template list | Add `processingMode` and `validationStatus` badges. Legacy auto-injected templates show a yellow "Legacy" badge with a "Convert to Structured" action. |
| Template detail page | Show validation report on load: placeholders found, sections detected, missing fields, suggestions. |

### 8.2 Client-side pre-validation

Implement a lightweight client-side validator that runs before upload:

1. Read the DOCX file as ArrayBuffer.
2. Wrap in PizZip (or unzip-mini) in the browser.
3. Read `word/document.xml` as text.
4. Apply regex `/\{\{([^}]+)\}\}/g`.
5. Highlight matches inline and show validation summary.

This reduces round-trips and improves faculty UX. The server still re-validates for security.

---

## 9. Migration Strategy

### 9.1 Phase 1: Dual-path validation (Weeks 1-2)

- Deploy `PlaceholderValidator` as a new service.
- Add `POST /api/resume/validate-template` endpoint.
- Modify `uploadTemplateController` to:
  - Accept uploads as before.
  - Run `PlaceholderValidator`.
  - Save `processingMode: 'placeholder-first'` and `validationReport` to DB.
  - Return validation report alongside template metadata.
- **No changes to generation path.** `ResumeService` continues to fill templates directly.
- **No breaking changes.** Existing templates continue to work.

### 9.2 Phase 2: Upload-time enforcement (Weeks 3-4)

- In `uploadTemplateController`, block upload if `validationReport.valid === false` and `severity === 'error'`.
- Return 400 with structured error body.
- Faculty must fix the template before upload succeeds.
- Warnings remain non-blocking.

### 9.3 Phase 3: Template migration tooling (Weeks 5-8)

- Add `POST /api/resume/templates/:id/convert` endpoint.
- Faculty uploads a new DOCX to replace a legacy template.
- System runs validation, stores new file, flips `processingMode` to `placeholder-first`.
- Add batch migration endpoint for admins: scan all `auto-inject` templates, attempt re-validation, report pass/fail counts.
- Add faculty-facing "Convert to Structured" button in template management UI.

### 9.4 Phase 4: Deprecate auto-injection (Weeks 9-12)

- Set deprecation date (90 days).
- Show banner on upload page for templates still using `auto-inject`.
- After deprecation date:
  - Remove `PlaceholderInjector`, `DocxTemplateGenerator`, `TemplateProcessingOrchestrator`, `ResumeGenerationOrchestrator`.
  - Remove `processTemplateController` endpoint.
  - Remove `originalFileUrl` field (no longer needed).
  - Remove heading-detection and section-detection from the generation path. Keep them only for `PlaceholderValidator` style-mismatch warnings.
- Running a one-time migration script to set all remaining `auto-inject` templates to `deprecated` status.

---

## 10. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Faculty resistance to new template format | Medium | High | Provide sample templates, inline help, conversion tool, and gradual deprecation timeline. |
| Existing templates have no placeholders | High | Medium | Dual-path upload lets legacy templates continue working during transition. |
| Validation false positives (misspelled known fields) | Low | Medium | Whitelist organization-specific aliases; allow faculty to override validation with "I know what I'm doing" toggle. |
| docxtemplater syntax confusion (`{{#each}}` vs `{{field}}`) | Medium | High | Inline help and reserved-word detection; provide template cookbook. |
| Performance of validation on large DOCX | Low | Low | Validation is single-pass XML scan + regex. For 200KB DOCX, <50ms. |
| Firebase Storage download failures during re-validation | Low | Medium | Cache validation report in DB; only re-validate on explicit request or file change. |

---

## 11. Open Questions (Design Review)

These are decisions that should be confirmed before implementation:

1. **Should the validator reject templates with no placeholders at all?**  
   Recommendation: Yes, reject with error. A template with zero placeholders cannot be filled.

2. **Should faculty be allowed to use custom section names?**  
   Recommendation: Yes, but aliases must be registered in the canonical schema. Unknown section names generate a warning, not an error.

3. **Should `sections` and `questions` be regenerated on every upload, or preserved from the template?**  
   Recommendation: Regenerate from detected placeholders. This ensures they stay in sync with the actual template content.

4. **Should the system support nested placeholders (e.g., `{{experience[0].company}}`)?**  
   Recommendation: No, not in Phase 1. Stick to flat placeholders. docxtemplater loop syntax handles repetition; dot-notation can be added in a later phase.

5. **Should validation be synchronous or async (queued)?**  
   Recommendation: Synchronous for templates < 5MB. For larger files or batch admin operations, add a simple queue. Keep the happy path synchronous for UX.

---

## 12. Summary

| Aspect | Decision |
|--------|----------|
| **Architecture** | Placeholder-first. Faculty-authored placeholders, backend validates. |
| **New service** | `PlaceholderValidator` — extracts, classifies, and reports on placeholders in DOCX XML. |
| **New DB fields** | `processingMode`, `validationStatus`, `validationReport` on `ResumeTemplate`. |
| **New endpoints** | `/validate-template`, `/templates/:id/validation`, `/templates/:id/revalidate`, `/templates/:id/convert` |
| **Frozen components** | `PlaceholderInjector` (critical bugs only), `TemplateProcessingOrchestrator`, `ResumeGenerationOrchestrator`, `processTemplateController` |
| **Reused components** | `DocxTemplateFiller`, `ResumeService`, `ResumeDataService`, `HeadingDetector`/`SectionDetector` (for style-mismatch warnings), `ResumeTemplate` model (extended) |
| **Migration** | 4 phases over ~12 weeks, zero downtime, backward-compatible. Legacy templates continue working until explicitly migrated or deprecated. |
| **Production readiness** | High. Eliminates XML mutation layer, relies on docxtemplater's proven rendering contract, and gives faculty direct control over template content. |
