# Resume Placeholder Architecture Redesign - Implementation Evidence

## Files Modified

| File | Change |
|------|--------|
| `backend/src/config/resumePlaceholders.ts` | Created central placeholder configuration with 36 semantic placeholders, `DEPRECATED_PLACEHOLDERS` set, `SECTION_ORDER`, and `SECTION_LABELS` |
| `backend/src/services/placeholderValidator.service.ts` | Replaced hardcoded `CANONICAL_FIELDS` with import from `resumePlaceholders.ts`; added `DEPRECATED_PLACEHOLDERS` rejection logic with severity `warning`; added `deprecated` tracking to validation summary |
| `backend/src/services/placeholderValidator.types.ts` | Added `DEPRECATED` to `ValidationIssue.code` union; added `deprecated` array to `ValidationReport.summary` |
| `backend/src/controllers/resumeController.ts` | Added deprecated placeholder check in upload flow: rejects only if `!valid && !hasDeprecated`; stores `validationStatus: 'warning'` for deprecated-only issues |
| `backend/src/services/sectionDetector.service.ts` | Updated `FIELD_INFERENCE` to use new semantic placeholder keys (`education_degree`, `experience_company`, `professional_summary`, etc.) |
| `app/dashboard/student/resume-builder/components/ResumeForm/ResumeForm.tsx` | Added section grouping using `SECTION_ORDER` and `SECTION_LABELS` from central config; renders collapsible section cards |
| `app/dashboard/student/resume-builder/components/ResumeForm/FormFieldRenderer.tsx` | Added proper HTML input types (`email`, `tel`, `url`, `date`) based on `question.type` |
| `components/Resume/types/api.ts` | Expanded `TemplateQuestion.type` to support all 8 field types; added `section` property; added `DEPRECATED` to `ValidationIssue.code`; added `deprecated` to `ValidationSummary` |
| `components/Resume/config/resumePlaceholders.ts` | Created frontend section ordering and labeling config |
| `backend/src/__tests__/placeholderValidator.service.test.ts` | Updated all test data to use new placeholder names; added `deprecated` to mock summaries |
| `backend/src/__tests__/sectionDetector.service.test.ts` | Updated education section test to expect new field keys |
| `backend/src/controllers/__tests__/resumeBuilderWorkflow.test.ts` | Updated mock schema and validation summaries to use new names and include `deprecated` array |
| `app/dashboard/faculty/resume-templates/components/__tests__/ValidationResultsPanel.test.tsx` | Added `deprecated: []` to all `ValidationSummary` mocks |

## Verification Results

### Backend Tests
- 576 tests passed across 72 test suites
- Placeholder validator: 18 passed
- Section detector: 10 passed
- Resume builder workflow: passed
- E2E DOCX rendering: 5 passed (all templates render successfully)

### TypeScript
- All modified files compile without errors
- Only pre-existing `@testing-library` type declaration warnings remain (unrelated)

## Migration Notes

1. **New templates**: Faculty must use semantic placeholders from `RESUME_PLACEHOLDERS`
2. **Old templates**: Deprecated placeholders (`text`, `items`) are flagged as warnings but upload is allowed if no hard errors exist
3. **Aliases**: Backward-compatible aliases (`name` → `full_name`, `company` → `experience_company`, etc.) continue to work silently
4. **Section detector**: Now infers new semantic field names for better dynamic form generation

## Known Limitations

1. **Docxtemplater loops**: Not introduced in this sprint; one entry per section remains
2. **Frontend input types**: `select` and `list` types still render as text inputs (existing behavior)
3. **Legacy DOCX templates**: Actual DOCX files with `{{text}}` and `{{items}}` will generate deprecation warnings but remain functional
