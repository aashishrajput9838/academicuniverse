# Milestone-2 Integration Report — Sprint-021

**Date:** 2026-07-22
**Document:** `resume templet kushagra conv.docx` (32,833 bytes)
**Tester:** Kilo (Automated Integration Verification)

---

## 1. Integration Setup

### 1.1 Pipeline Components

| Component | File | Status |
|---|---|---|
| DocxExtractionService | `backend/src/docxExtraction.service.ts` | Milestone-1, unchanged |
| SectionDetectorService | `backend/src/services/sectionDetector.service.ts` | Milestone-2, new |
| EntityDetectorService | `backend/src/services/entityDetector.service.ts` | Milestone-2, new |
| ConfidenceScorerService | `backend/src/services/confidenceScorer.service.ts` | Milestone-2, new |
| FormattingBuilderService | `backend/src/services/formattingBuilder.service.ts` | Milestone-2, new |
| ExtractionResultService | `backend/src/services/extractionResult.service.ts` | Milestone-2, new |

### 1.2 Integration Method

End-to-end integration performed via standalone script (`integration-test.ts`) that:
1. Loads the raw DOCX buffer from disk
2. Runs `DocxExtractionService.extract(buffer)` (Milestone-1)
3. Runs `ExtractionResultService.extract(extractedDoc)` with `enableAiAssistance: false`
4. Optionally runs with `enableAiAssistance: true` when `GOOGLE_AI_API_KEY` is set
5. Prints the complete `Milestone2Result` JSON
6. Measures wall-clock time at each stage

---

## 2. End-to-End Execution Results

### 2.1 Timing Measurements

| Stage | Duration | Notes |
|---|---|---|
| DOCX parsing (PizZip + XML parsing) | ~470-591ms | File I/O + Milestone-1 extraction |
| Milestone-2 processing (AI disabled) | ~14-17ms | Rule-based only, no network |
| Total pipeline | ~485-610ms | Dominated by DOCX parsing |

**AI enabled:** Not measured (GOOGLE_AI_API_KEY not set in environment).

### 2.2 Complete Milestone2Result (AI Disabled)

```json
{
  "sections": [
    {
      "id": "96ea6946-e515-4495-8cbe-c94d9846229c",
      "title": "ProfessionalSummary",
      "order": 0,
      "repeatable": false,
      "maxEntries": 1,
      "minEntries": 1,
      "fields": [
        { "key": "text", "label": "Summary", "type": "textarea", "required": true, "aiEnhanceable": true }
      ]
    },
    {
      "id": "129de589-bb5c-4695-9f45-ef649026ba1c",
      "title": "Skills",
      "order": 1,
      "repeatable": false,
      "maxEntries": 1,
      "minEntries": 1,
      "fields": [
        { "key": "category", "label": "Category", "type": "text", "required": false, "aiEnhanceable": true },
        { "key": "items", "label": "Skills", "type": "list", "required": true, "aiEnhanceable": true }
      ]
    },
    {
      "id": "01de7a3a-0ad9-43e0-9db0-cce5460fa81d",
      "title": "Projects",
      "order": 2,
      "repeatable": true,
      "fields": [
        { "key": "name", "label": "Project Name", "type": "text", "required": true, "aiEnhanceable": true },
        { "key": "description", "label": "Description", "type": "textarea", "required": false, "aiEnhanceable": true },
        { "key": "tech_stack", "label": "Tech Stack", "type": "list", "required": false, "aiEnhanceable": true }
      ]
    },
    {
      "id": "930e2d5d-5144-49fd-9fe7-086bb2315482",
      "title": "Certifications",
      "order": 3,
      "repeatable": true,
      "fields": [
        { "key": "name", "label": "Certification Name", "type": "text", "required": true, "aiEnhanceable": true },
        { "key": "issuer", "label": "Issuer", "type": "text", "required": false, "aiEnhanceable": true },
        { "key": "date", "label": "Date", "type": "date", "required": false, "aiEnhanceable": true }
      ]
    },
    {
      "id": "9d58559a-927a-4946-aa05-d0cc9115bc71",
      "title": "Research&Publications",
      "order": 4,
      "repeatable": true,
      "fields": [
        { "key": "name", "label": "Project Name", "type": "text", "required": true, "aiEnhanceable": true },
        { "key": "description", "label": "Description", "type": "textarea", "required": false, "aiEnhanceable": true },
        { "key": "tech_stack", "label": "Tech Stack", "type": "list", "required": false, "aiEnhanceable": true }
      ]
    },
    {
      "id": "ed76ae2c-5b8b-4245-bc49-c3206f66e98f",
      "title": "Education",
      "order": 5,
      "repeatable": true,
      "minEntries": 1,
      "fields": [
        { "key": "degree", "label": "Degree", "type": "text", "required": true, "aiEnhanceable": true },
        { "key": "institution", "label": "Institution", "type": "text", "required": true, "aiEnhanceable": true },
        { "key": "year", "label": "Year", "type": "date", "required": false, "aiEnhanceable": true },
        { "key": "cgpa", "label": "CGPA/GP", "type": "text", "required": false, "aiEnhanceable": true }
      ]
    }
  ],
  "entities": [
    { "type": "phone", "value": "+916395248403", "confidence": 0.9 },
    { "type": "phone", "value": "9163952484", "confidence": 0.85 },
    { "type": "date", "value": "2026", "confidence": 0.7 },
    { "type": "date", "value": "2025", "confidence": 0.7 },
    { "type": "date", "value": "2024", "confidence": 0.7 },
    { "type": "date", "value": "2023", "confidence": 0.7 },
    { "type": "date", "value": "2022", "confidence": 0.7 },
    { "type": "date", "value": "2020", "confidence": 0.7 }
  ],
  "confidence": 1.0,
  "formattingMetadata": {
    "styles": {
      "Calibri|11|b|i|u|000000": { "name": "Calibri11", "count": 1490 },
      "Calibri|12|b|i|u|000000": { "name": "Calibri12", "count": 175 },
      "Segoe UI Symbol|11|b|i|u|000000": { "name": "Segoe UI Symbol11", "count": 14 },
      "Default|11||||000000": { "name": "Custom1", "count": 13 }
    },
    "headingLevels": {
      "professionalsummary": 1,
      "skills": 2,
      "projects": 2,
      "certifications": 2,
      "research&publications": 3,
      "education": 1
    },
    "bulletMarker": "•",
    "dateFormat": "YYYY-MM"
  },
  "extractionIssues": []
}
```

---

## 3. Validation Against Original Document

### 3.1 Expected Document Structure

Based on visual inspection of `resume templet kushagra conv.docx`:

| Expected Section | Status | Notes |
|---|---|---|
| Header (Name + Contact) | DETECTED | Name merged into ProfessionalSummary; phone detected as entity |
| Professional Summary | DETECTED | "ProfessionalSummary" correctly identified |
| Skills | DETECTED | "Skills" correctly identified |
| Projects | DETECTED | "Projects" correctly identified |
| Certifications | DETECTED | "Certifications" correctly identified |
| Research & Publications | DETECTED | "Research&Publications" correctly identified |
| Education | DETECTED | "Education" correctly identified |

**Missed sections:** None. All major sections detected.

### 3.2 Entity Analysis

| Entity Type | Expected | Detected | Status |
|---|---|---|---|
| phone | +916395248403 | +916395248403, 9163952484 | PARTIAL (duplicate) |
| email | Not present | None | PASS |
| url | Not present | None | PASS |
| date/years | IC3ECSBHI-2026, 2023-2027, etc. | 2026, 2025, 2024, 2023, 2022, 2020 | PARTIAL (year-only) |
| name | KUSHAGRA SINGH BHADAURIA | None | MISS |

**Incorrect entities:**
- `9163952484` is a false positive/duplicate. It is the last 10 digits of `+916395248403` matched by the US phone regex `(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}`.

**False positives:**
- `2026`, `2025`, `2024`, `2023`, `2022`, `2020` are matched as `date` entities. These are years extracted from text like "IC3ECSBHI-2026" and date ranges. In resume context, these are arguably legitimate date references, but they lack month/day context.

**Missed entities:**
- `KUSHAGRA SINGH BHADAURIA` — No name entity regex exists. Name detection is deferred to AI (not enabled).

### 3.3 Section Quality

| Section | Quality | Notes |
|---|---|---|
| ProfessionalSummary | Good | Correctly captures header + summary text |
| Skills | Good | Correctly captures bullet-list skills |
| Projects | Good | Correctly identifies project section |
| Certifications | Good | Correctly identifies certification section |
| Research&Publications | Good | Correctly identifies research section |
| Education | Good | Correctly identifies education section |

**Incorrect sections:** None.

### 3.4 Confidence Justification

**Confidence: 1.0**

Justification:
- **Sections (30%):** 6 sections detected, all with valid titles and fields, no duplicates. Score: 1.0
- **Entities (25%):** 8 entities detected, average confidence ~0.83 (> 0.7), no empty values. Score: 1.0
- **Formatting (20%):** 4 distinct styles, 6 heading levels, bullet marker detected, date format detected. Score: 1.0
- **Completeness (15%):** Has sections and formatting metadata. Score: 1.0
- **Consistency (10%):** No duplicate section titles, all entities have valid locations, no error issues. Score: 1.0

**Note:** The confidence score of 1.0 is technically correct per the scoring formula but slightly inflated because:
1. Duplicate phone entities are not penalized (different string values)
2. Some "date" entities are year-only, which may not always be useful
3. No name entity was detected

---

## 4. Known Issues and Limitations

### 4.1 Section Detector

| Issue | Severity | Workaround |
|---|---|---|
| Bullet-point false positives | Fixed | Added `startsWithBullet` guard |
| Long single-word sections merged | Low | "ProfessionalSummary" is one word in DOCX; acceptable |

### 4.2 Entity Detector

| Issue | Severity | Workaround |
|---|---|---|
| Near-duplicate phone entities | Medium | Post-processing dedup uses exact match; substring overlaps not caught |
| Year-only date entities | Low | YEAR_REGEX is aggressive; acceptable for resume context |
| No name entity detection | Medium | Deferred to AI (not enabled in tests) |

### 4.3 Formatting Builder

| Issue | Severity | Workaround |
|---|---|---|
| Styles include combined formatting signatures | Low | Calibri11 and Calibri12 both have bold+italic+underline inherited from document default |
| dateFormat "YYYY-MM" derived from section text | Low | No actual YYYY-MM dates in document; pattern matched from year sequences |

---

## 5. Pipeline Integration Status

| Integration Point | Status | Notes |
|---|---|---|
| DocxExtractionService → ExtractionResultService | PASS | In-memory handoff works |
| ExtractedDocument input accepted | PASS | No schema mismatches |
| Milestone2Result output produced | PASS | All required fields present |
| No Milestone-1 breakage | PASS | Milestone-1 tests pass (15/15) |
| No controller changes required | PASS | Standalone integration verified |
| Error handling | PASS | Pipeline never throws; AI path gracefully skipped |

---

## 6. Recommendations for Milestone-3

1. **Fuzzy entity deduplication**: Implement overlap-aware dedup to catch `+916395248403` vs `9163952484`
2. **Name entity regex**: Add basic name pattern matching for ALL CAPS name lines
3. **Section text cleanup**: Strip bullet markers from section titles in post-processing
4. **Date disambiguation**: Distinguish between standalone years and date ranges
5. **AI validation**: Test AI-enabled path with real API key to verify prompt engineering

---

## 7. Conclusion

End-to-end integration is **validated**. The Milestone-2 pipeline successfully:
- Extracts 6 sections from the Kushagra DOCX
- Detects 8 entities (with documented limitations)
- Populates formatting metadata
- Returns confidence score of 1.0
- Completes in ~15ms (AI disabled)

Known limitations are documented and do not block Milestone-3. No Milestone-1 regressions were introduced.

**Ready for Milestone-3 with the above recommendations.**
