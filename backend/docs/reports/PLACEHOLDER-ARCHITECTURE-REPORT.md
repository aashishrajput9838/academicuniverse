# Placeholder Architecture Report

**Date:** 2026-07-22  
**Scope:** End-to-end data flow from DOCX template → form → draft → document generation  
**Decision:** Recommend one architecture for the Resume Builder placeholder pipeline

---

## 1. Current Architecture (Baseline)

```
DOCX template text runs
        ↓
PlaceholderInjector replaces text with {{field.key}}
        ↓
processTemplateController flattens sections → questions array
        ↓
Frontend renders flat form, collects into formData: Record<string, any>
        ↓
Draft saved as flat object
        ↓
ResumeService.setData(formData) → docxtemplater renders
```

### Problems confirmed in codebase

1. **`sectionDetector.service.ts:55`** — `REPEATABLE_SECTIONS` already identifies experience, education, projects, certifications as repeatable.
2. **`milestone2.types.ts:32`** — `DetectedSection` carries `repeatable`, `maxEntries`, `minEntries`.
3. **`resumeController.ts:361`** — Questions are flattened with `tag: field.key`. Multiple sections produce duplicate tags (e.g., `name` in Projects, Certifications, Research&Publications).
4. **`PlaceholderInjector.getUniqueKey()`** already generates `section_{index}_key` internally to avoid DOCX collisions, but these unique keys are **not exposed** to the frontend. `dataKeyMapping` is computed and discarded.
5. **`ResumeForm.tsx:134`** — React keys collide on `question.tag`.
6. **`formData[question.tag]`** — Later entries overwrite earlier ones with the same tag.

### Data-loss example from runtime payload

```
Projects.name        → formData["name"] = "My Project"
Certifications.name  → formData["name"] = "AWS Certified"    // overwrites Projects.name
Research.name        → formData["name"] = "AI Research"      // overwrites Certifications.name
```

Only the last `name` survives. The generated DOCX fills `{{name}}` with that single value everywhere.

---

## 2. Option Evaluation

### Option A — Globally Unique Placeholders

**Design:** Every placeholder in every DOCX template must be globally unique. Example: `projects_name`, `certifications_name`, `research_name`.

**Backend compatibility:**
- `PlaceholderInjector.getUniqueKey()` already generates `section_{index}_{key}` internally.
- `dataKeyMapping` maps original keys to unique keys, but it is not currently returned to the frontend.
- Requires modifying the injector to always emit namespaced keys, not just when collisions occur.
- Requires updating `ResumeService.processResumeTemplate()` to accept and use a key mapping.

**DOCX template compatibility:**
- Existing templates use `{{name}}`, not `{{projects_name}}`.
- The injector can rewrite existing `{{name}}` runs, so templates don't need to change.
- However, the injected placeholder becomes implementation-leaky (`section_2_name`). Anyone editing the DOCX sees meaningless section indices.

**Draft storage:**
- Flat object works: `{ "section_2_name": "...", "section_0_name": "..." }`.
- But the frontend must understand the mangling scheme to render labels correctly.

**Validation:**
- Validating `section_2_name` requires the frontend to reverse-engineer section/field from the tag.

**Future scalability:**
- Adding a new section type requires regenerating all template keys.
- Collision risk grows linearly with template complexity.
- Not maintainable as the template library scales.

**Repeated sections:**
- **Does not solve the collection problem.** Even with unique keys, each project entry still needs a separate key (`projects_name_0`, `projects_name_1`). The form becomes a flat list of N text inputs with no grouping.

**Implementation complexity:**
- Medium. Modify injector, expose mapping, update frontend to decode keys.
- Every key in the final form becomes opaque.

**Migration cost:**
- Low for backend (injector already does key scoping).
- Medium for frontend (must parse and display namespaced tags).
- High for template maintainability.

**Verdict: REJECTED.** This is a band-aid. It fixes the collision symptom by making every key unique through index-based namespacing, but it:
1. Leaks implementation details (`section_2_name`) into the user-facing form.
2. Does not solve the collection problem for repeatable sections.
3. Makes templates harder to author and debug.

---

### Option B — Namespaced Questions

**Design:** Questions use a namespace prefix derived from the section. Data structure becomes dotted-path or nested. Example form data: `{ "projects.name": "X", "certifications.name": "Y" }` or `{ projects: { name: "X" }, certifications: { name: "Y" } }`.

**Backend compatibility:**
- `PlaceholderInjector` would need to emit `{{projects.name}}` instead of `{{name}}`.
- Docxtemplater natively supports dotted paths: `doc.setData({ projects: { name: "X" } })` fills `{{projects.name}}`.
- `sectionDetector.service.ts` can derive the namespace from `section.title` or `section.id`.

**DOCX template compatibility:**
- Templates would need `{{projects.name}}` placeholders instead of `{{name}}`.
- **Breaking change for existing DOCX templates.** All current templates have `{{name}}`, `{{degree}}`, etc.
- The injector can rewrite existing placeholders to dotted paths, but this requires the injector to know the namespace mapping at write time, which it already does per section.

**Draft storage:**
- Nested JSON is natural: `{ projects: { name: "X" }, certifications: { name: "Y" } }`.
- Draft documents are cleaner and semantically correct.

**Validation:**
- Frontend groups by section, validating `projects.name` as a unit.
- Validation rules on `TemplateField` can carry over to the nested path.

**Future scalability:**
- Adding sections doesn't create key collisions.
- Namespace is section-derived, so it grows with the domain.

**Repeated sections:**
- **Partially solves the problem.** `projects.name` can hold one value. But a user with 3 projects still cannot represent all three. The form is still a single text input per field.

**Implementation complexity:**
- Medium-high. Frontend form structure changes from flat list to section-grouped form.
- `handleChange` and `validate` must traverse nested paths.
- `formData` shape changes from `Record<string, any>` to nested objects.

**Migration cost:**
- High for frontend (form restructuring).
- Medium for backend (injector rewrite to dotted paths).
- All existing templates must be reprocessed or the injector must rewrite placeholders on the fly.

**Verdict: REJECTED.** This is a necessary stepping stone, but it does not solve the core resume domain problem: collections. A resume needs multiple projects, multiple jobs, multiple degrees. Namespacing alone still produces a form with one input per field.

---

### Option C — Docxtemplater Loops for Repeated Collections

**Design:** The Resume Builder treats the data model as **hierarchical**. Repeatable sections are arrays of objects. Docxtemplater loop syntax renders collections.

```
DOCX template:
  {{#projects}}
  {{name}}
  {{description}}
  {{/projects}}

Frontend form:
  Projects (repeatable)
    [ + Add Project ]
    Entry 1: [name] [description] [tech_stack]
    Entry 2: [name] [description] [tech_stack]

Data sent to backend:
{
  "summary": { "text": "..." },
  "skills": { "items": "..." },
  "projects": [
    { "name": "Project A", "description": "...", "tech_stack": ["React"] },
    { "name": "Project B", "description": "...", "tech_stack": ["Node"] }
  ],
  "certifications": [
    { "name": "AWS", "issuer": "Amazon", "date": "2024" }
  ]
}
```

**Backend compatibility:**
- `sectionDetector.service.ts` already determines `repeatable` per section.
- `ResumeTemplate` model already stores `repeatable`, `maxEntries`, `minEntries`.
- `PlaceholderInjector` must inject loop boundaries for repeatable sections:
  - Before section runs: inject `{{#sectionId}}`
  - After section runs: inject `{{/sectionId}}`
  - Inside section: keep `{{field.key}}` placeholders
- Non-repeatable sections remain flat: `summary.text`, `skills.items`.

**DOCX template compatibility:**
- Existing templates can be updated to use loop syntax for repeated sections.
- For backward compatibility, the injector can wrap repeated section runs in loop tags during processing.
- Non-repeatable sections are unaffected.

**Draft storage:**
- Natural nested/array JSON.
- `StudentResume.filledData` already uses `Schema.Types.Mixed`, so it accepts any shape.

**Validation:**
- Backend validates `minEntries` / `maxEntries` on repeatable sections.
- Frontend enables/disables the "Add Entry" button based on constraints.
- Each entry's fields carry their own `required` and `validation` rules.

**Future scalability:**
- Adding a repeatable section type (e.g., Publications, Awards) requires zero schema changes.
- The form renderer treats any `repeatable: true` section as a dynamic collection.
- Docxtemplater is designed for this pattern.

**Repeated sections:**
- **Fully solved.** Each section entry is an object in an array. No data collisions. `projects[0].name` and `certifications[0].name` are independent values.

**Implementation complexity:**
- Medium-high, but it is the correct work proportional to the domain.
- Changes are localized:
  1. `PlaceholderInjector`: emit `{{#sectionId}}...{{/sectionId}}` for repeatable sections.
  2. Frontend: dynamic section renderer with add/remove for repeatable sections.
  3. Form data shape changes to nested/arrays (the existing `useAutoSave` and `generateResume` pass through unchanged because `formData` is `Record<string, any>`).
  4. `processTemplateController`: questions array may remain for non-repeatable fields, repeatable fields move into section-scoped form data.

**Migration cost:**
- Medium. Existing templates need loop tags injected, but the injector can automate this.
- Frontend form component gets a new `RepeatableSection` wrapper.
- Existing drafts stored as flat objects would need a one-time migration or the backend can accept both formats during a transition period.

**Verdict: RECOMMENDED.** This is the only option that:
1. Eliminates data collisions at the structural level.
2. Aligns with docxtemplater's native loop syntax and best practices.
3. Matches the resume domain (collections of education, experience, projects, certifications).
4. Reuses existing backend metadata (`repeatable`, `minEntries`, `maxEntries`).
5. Provides a path to clean, maintainable template authoring.

---

## 3. Recommendation Summary

| Criterion | Option A | Option B | Option C |
|---|---|---|---|
| No data collisions | Partial | Partial | Full |
| Supports collections | No | No | Yes |
| Backend changes | Low | Medium | Medium |
| Frontend changes | Medium | High | Medium-high |
| DOCX template changes | None required | Required | Required (automated by injector) |
| Existing metadata reuse | Low | Low | High |
| Docxtemplater idioms | No | Partial | Yes |
| Future sections | Fragile | Adequate | Scalable |
| Migration cost | Medium | High | Medium |

**Recommendation: Option C**

The current codebase already encodes the necessary metadata (`repeatable`, section detection). The missing piece is treating repeatable sections as arrays in the frontend form and using docxtemplater loop tags in the generated DOCX. This is the architecturally correct design for a resume builder.

**Phase 1 (immediate):** Implement the React key fix (`question.id`) to resolve the console warning.

**Phase 2 (architecture change):**
- Update `PlaceholderInjector` to wrap repeatable section runs in `{{#sectionId}}...{{/sectionId}}`.
- Update frontend `ResumeForm` to render repeatable sections as dynamic collections.
- Update `processTemplateController` to structure `questions` or section data for collections.
- Keep `tag` for docxtemplater placeholder matching within each collection entry.
