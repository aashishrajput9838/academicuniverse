# React Key Investigation Report

**Date:** 2026-07-23  
**Symptom:** React console warning: `Encountered two children with the same key, "name"`  
**Stack trace points to:** `ResumeForm.tsx:133`  
**Status:** Root cause unproven — requires runtime bundle inspection

---

## 1. Code Changes Applied

### Backend (`resumeController.ts:361-368`)
Questions now include a unique `id`:
```typescript
const questions = result.milestone2Result.sections.flatMap((section: any) =>
  section.fields.map((field: any) => ({
    id: `${section.id}_${field.key}`,   // e.g. "bae3bbbb-e950-41f8-a366-a69bf3498848_name"
    tag: field.key,
    question: field.label,
    type: field.type === 'textarea' ? 'textarea' : 'text',
    aiEnhanceable: field.aiEnhanceable || false,
  }))
);
```

### Frontend (`ResumeForm.tsx:134`)
The map uses the new `id` as the React key:
```tsx
{template.questions.map((question) => (
  <FormFieldRenderer
    key={question.id}
    question={question}
    ...
  />
))}
```

### Frontend type (`api.ts:47`)
`TemplateQuestion` now declares `id: string`.

---

## 2. Component Tree Audit

All components rendered inside `ResumeForm` were inspected for internal `.map()` calls or array rendering:

| Component | File | Renders Array? | Key Strategy |
|---|---|---|---|
| `ResumeForm` | `ResumeForm.tsx` | Yes — `template.questions.map(...)` | `question.id` |
| `FormFieldRenderer` | `FormFieldRenderer.tsx` | No | N/A |
| `FormSection` | `FormSection.tsx` | No (renders `children`) | N/A |
| `FormNavigation` | `FormNavigation.tsx` | No | N/A |
| `DraftIndicator` | `DraftIndicator.tsx` | No | N/A |
| `ResumeSkeleton` | `ResumeSkeleton.tsx` | Yes — `Array.from({length: count}).map(...)` | `key={i}` (unique indices) |
| `useAutoSave` | `useAutoSave.ts` | No (hook, no JSX) | N/A |

**Only one map uses question-derived keys:** `ResumeForm.tsx:145` (`template.questions.map(...)`).

---

## 3. Duplicate-id Analysis (Static)

The backend generates `id` as:
```
${section.id}_${field.key}
```

Where:
- `section.id` = UUID v4 (guaranteed unique per section)
- `field.key` = semantic placeholder token, e.g. `"name"`, `"description"`

**Example runtime ids:**
- `bae3bbbb-e950-41f8-a366-a69bf3498848_name`
- `39a8a4cd-5ef5-4bcc-9d81-4ab1f3bd7750_name` (different section, same field key)
- `bae3bbbb-e950-41f8-a366-a69bf3498848_description`

**Conclusion:** Static analysis confirms `id` values are guaranteed unique across a single template processing run. Duplicate `id` values can only occur if the same `section.id` is reused for multiple sections, which the `SectionDetectorService` prevents via `mergedTitles` deduplication and UUID generation.

---

## 4. Duplicate-tag Analysis (Static)

`tag` is derived from `field.key`. Multiple sections can share the same `field.key`:

| Section | Field key | tag |
|---|---|---|
| Projects | `name` | `name` |
| Certifications | `name` | `name` |
| Research&Publications | `name` | `name` |

**Conclusion:** Duplicate `tag` values are expected and intentional. The React key was changed from `question.tag` to `question.id` specifically to address this.

---

## 5. Runtime Payload Contract

Before rendering, `ResumeForm` expects `template.questions` to look like:
```json
[
  {
    "id": "bae3bbbb-e950-41f8-a366-a69bf3498848_name",
    "tag": "name",
    "question": "Project Name",
    "type": "text",
    "aiEnhanceable": true
  },
  {
    "id": "39a8a4cd-5ef5-4bcc-9d81-4ab1f3bd7750_name",
    "tag": "name",
    "question": "Certification Name",
    "type": "text",
    "aiEnhanceable": true
  }
]
```

With this shape, `key={question.id}` produces unique keys: `bae3bbbb-..._name` and `39a8a4cd-..._name`.

---

## 6. Exact Warning Location

The stack trace pinpoints:
```
at <unknown> (ResumeForm.tsx:133:13)
at Array.map (<anonymous>:null:null)
at ResumeForm (ResumeForm.tsx:132:31)
```

In the current source:
- **Line 145** (was 132 before debug logging): `{template.questions.map((question) => (`
- **Line 147** (was 133 before debug logging): `<FormFieldRenderer`
- **Line 148** (was 134 before debug logging): `key={question.id}`

**No other `.map()` in the render path uses a question-derived key.**

---

## 7. Why the Warning Persists: Plausible Causes

### Cause A: Stale Frontend Bundle (Most Likely)

Next.js with Turbopack can serve cached JS. The browser may not have picked up the updated `key={question.id}`. The warning text references `name`, which is the OLD `question.tag` value. If the bundle still contains `key={question.tag}`, React will warn with `name`.

**Verification:**
- Inspect `app/dashboard/student/resume-builder/components/ResumeForm/ResumeForm.tsx` in browser DevTools Sources panel.
- Confirm the mapped key expression is `question.id`, not `question.tag`.
- Hard-refresh the page (`Ctrl+Shift+R` / `Cmd+Shift+R`).
- Restart `next dev` if HMR is stuck.

### Cause B: Old Template Data in Database

If the `ResumeTemplate` document in MongoDB was processed BEFORE the `id` field was added to `questions`, then `question.id` is `undefined`.

With `key={undefined}`, React falls back to array index. Index-based keys do not produce a "same key" warning. However, if the frontend state is stale and the DOM is not reconciling correctly, React 19's error overlay may surface a stale warning from a previous render.

**Verification:**
- Add temporary `console.log('[DEBUG] questions:', JSON.stringify(template.questions, null, 2))` in `ResumeForm`.
- Check if `id` is present and unique in the browser console.

### Cause C: Duplicate `section.id` in a Single Template

If somehow the same `section.id` appears in two different `DetectedSection` objects within one template, then two fields with the same `field.key` would generate duplicate `id` values (e.g., `same-uuid_name` twice).

This is unlikely given `SectionDetectorService` uses `uuidv4()` per section and deduplicates titles, but it is not mathematically impossible if `milestone2Result.sections` is manually constructed or mutated elsewhere.

**Verification:**
- Log `result.milestone2Result.sections.map(s => s.id)` during `processTemplateController`.
- Check for duplicates.

---

## 8. Root-Cause Determination

| Evidence | Finding |
|---|---|
| Stack trace line | Points to `ResumeForm.tsx:133` (`FormFieldRenderer` call inside `questions.map`) |
| Warning key value | `name` — matches `question.tag`, not `question.id` |
| Code on disk | `key={question.id}` is present at line 134 |
| Nested components | None render arrays with question-derived keys |
| Backend id generation | Guaranteed unique per section UUID |
| Old code path | `question.tag` would produce exactly this warning |

**Working hypothesis:** The frontend is executing a stale bundle that still contains `key={question.tag}`. The warning message `name` is inconsistent with the current source code's `question.id`.

**This hypothesis is NOT YET PROVEN.** It requires:
1. Confirming the browser is executing the updated source (DevTools Sources panel).
2. Confirming `template.questions` contains unique `id` values (browser console).
3. Confirming no duplicate `id` values exist in the runtime payload.

---

## 9. Recommended Investigation Steps

1. **Hard refresh** the browser to clear Next.js/Turbopack cache.
2. **Restart** `next dev` if the warning persists after refresh.
3. **Add temporary logging** in `ResumeForm.tsx`:
   ```tsx
   useEffect(() => {
     console.log('[DEBUG] questions:', JSON.stringify(template.questions, null, 2));
     console.log('[DEBUG] duplicate ids:', template.questions.filter((q, i, arr) => arr.findIndex(x => x.id === q.id) !== i));
   }, [template.questions]);
   ```
4. **Inspect DevTools Sources** to verify the executed code contains `key={question.id}`.
5. **Re-process the template** (`POST /api/resume/templates/:id/process`) to ensure the `questions` array in MongoDB includes the `id` field.
6. If the warning still says `name` after all of the above, capture the **exact mapped array render output** from React DevTools Components panel.

---

## 10. Summary

- **Exact component:** `ResumeForm` (`ResumeForm.tsx:145-148`)
- **Exact line:** The `key={question.id}` prop on `<FormFieldRenderer>` inside `template.questions.map(...)`
- **Nested component check:** None of the child components render additional arrays with question-derived keys.
- **Duplicate id analysis:** Statistically impossible with current UUID-based `section.id` unless sections are manually duplicated.
- **Duplicate tag analysis:** Expected and present — `name`, `description`, `tech_stack` appear in multiple sections.
- **Root cause:** Unproven. Most likely stale frontend bundle. Requires runtime verification of the executed source and the `template.questions` payload.
