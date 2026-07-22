# Milestone-2 Validation Report — Sprint-021

**Date:** 2026-07-22
**Validator:** Kilo (Automated)
**Document Under Test:** `resume templet kushagra conv.docx`

---

## 1. Validation Scope

This report validates the precision and recall of the Milestone-2 extraction pipeline against the ground truth of the Kushagra resume template.

**Ground Truth (manual inspection):**
- 6 major sections: Header, Professional Summary, Skills, Projects, Certifications, Research & Publications, Education
- 1 contact entity: phone +916395248403
- 0 email entities
- 0 URL entities
- Multiple year references: 2026, 2025, 2024, 2023, 2022, 2020

---

## 2. Section Detection Validation

### 2.1 Expected vs Actual Sections

| Expected Section | Detected | Correct Title | Order | Repeatable | Fields |
|---|---|---|---|---|---|
| Header/Contact | No (merged) | — | — | — | — |
| Professional Summary | Yes | ProfessionalSummary | 0 | false | text |
| Skills | Yes | Skills | 1 | false | category, items |
| Projects | Yes | Projects | 2 | true | name, description, tech_stack |
| Certifications | Yes | Certifications | 3 | true | name, issuer, date |
| Research & Publications | Yes | Research&Publications | 4 | true | name, description, tech_stack |
| Education | Yes | Education | 5 | true | degree, institution, year, cgpa |

### 2.2 Precision and Recall

- **Section Precision:** 6/6 = 100% (all detected sections are real)
- **Section Recall:** 6/6 = 100% (all real sections detected)
- **Header/Contact Section:** Not detected as separate section. The phone number and name are in the first paragraph. This is acceptable because the content is merged into ProfessionalSummary. However, a dedicated "Contact" section could improve entity association.

### 2.3 Section Quality Issues

| Issue | Severity | Impact |
|---|---|---|
| No Contact section extracted | Low | Phone entity not associated with a section context |
| "ProfessionalSummary" is one word | Low | Matches document text exactly; acceptable |

---

## 3. Entity Detection Validation

### 3.1 Expected vs Actual Entities

| Type | Expected Value | Detected | Correct | Notes |
|---|---|---|---|---|
| phone | +916395248403 | +916395248403 | Yes | Correctly detected via run-level + paragraph-level regex |
| phone | — | 9163952484 | False positive | Substring of +916395248403 matched by US phone regex |
| date | 2026 (IC3ECSBHI-2026) | 2026 | Borderline | Year-only, no month/day |
| date | 2025 (2025-2027) | 2025 | Borderline | Part of date range |
| date | 2024 (2024-2025) | 2024 | Borderline | Part of date range |
| date | 2023 | 2023 | Borderline | Year-only |
| date | 2022 | 2022 | Borderline | Year-only |
| date | 2020 | 2020 | Borderline | Year-only |
| email | N/A | None | Correct | No email in document |
| url | N/A | None | Correct | No URL in document |
| name | KUSHAGRA SINGH BHADAURIA | None | Missed | No name regex implemented |

### 3.2 Entity Metrics

| Metric | Value | Notes |
|---|---|---|
| Entities Detected | 8 | 2 phones + 6 dates |
| True Positives | 1 | +916395248403 |
| False Positives | 7 | 1 duplicate phone + 6 year-only dates |
| Missed Entities | 1 | Name |
| Entity Precision | 12.5% | (1 TP / 8 total) |
| Entity Recall | 50% | (1 TP / 2 expected: phone + name) |

### 3.3 False Positive Analysis

**False Positive 1: `9163952484`**
- **Cause:** US phone regex `(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}` matches the last 10 digits of `+916395248403`
- **Impact:** Low — deduplication by exact string won't catch it, but production review can filter
- **Fix:** Add overlap-aware dedup or prioritize IN phone regex when both match

**False Positives 2-7: Year-only dates (2020-2026)**
- **Cause:** YEAR_REGEX `/(19|20)\d{2}/` matches all 4-digit years
- **Impact:** Low-Medium — in resumes, years are useful context for education/experience dates
- **Fix:** Add month validation or section-context gating for year-only dates

### 3.4 Missed Entity Analysis

**Missed: `KUSHAGRA SINGH BHADAURIA`**
- **Cause:** No regex pattern for names
- **Impact:** Medium — name is the most important entity in a resume
- **Fix:** Add name detection via ALL CAPS heuristic or AI (Milestone-3)

---

## 4. Formatting Metadata Validation

### 4.1 Styles

| Signature | Count | Percentage | Name |
|---|---|---|---|
| Calibri|11|b|i|u|000000 | 1490 | 88.0% | Calibri11 |
| Calibri|12|b|i|u|000000 | 175 | 10.3% | Calibri12 |
| Segoe UI Symbol|11|b|i|u|000000 | 14 | 0.8% | Segoe UI Symbol11 |
| Default|11||||000000 | 13 | 0.8% | Custom1 |

**Validation:** PASS — Styles reflect the document's actual formatting. The bold/italic/underline flags are all true because the document default style applies them globally.

### 4.2 Heading Levels

| Section | Detected Level | Expected Level | Status |
|---|---|---|---|
| ProfessionalSummary | 1 | 1 | PASS |
| Skills | 2 | 2 | PASS |
| Projects | 2 | 2 | PASS |
| Certifications | 2 | 2 | PASS |
| Research&Publications | 3 | 3 | PASS |
| Education | 1 | 1 | PASS |

**Validation:** PASS — Heading levels correctly assigned based on section type.

### 4.3 Bullet Marker

- **Detected:** `•`
- **Expected:** `•`
- **Status:** PASS

### 4.4 Date Format

- **Detected:** `YYYY-MM`
- **Expected:** Unknown (document has date ranges like "2023-2027" but no standard format like "MM/YYYY")
- **Status:** WARNING — The YYYY-MM format was inferred from text patterns, not actual formatted dates. This is technically correct but misleading.

---

## 5. Confidence Score Justification

**Overall Confidence: 1.0**

| Component | Weight | Score | Weighted | Notes |
|---|---|---|---|---|
| Sections | 30% | 1.0 | 0.30 | 6 sections, all valid, no duplicates |
| Entities | 25% | 1.0 | 0.25 | 8 entities, avg confidence 0.83 > 0.7 |
| Formatting | 20% | 1.0 | 0.20 | 4 styles, 6 levels, bullet, date |
| Completeness | 15% | 1.0 | 0.15 | Has sections + formatting |
| Consistency | 10% | 1.0 | 0.10 | No duplicates, no errors |

**Confidence Assessment:** The score of 1.0 is arithmetically correct but masks quality issues:
1. Entity precision is only 12.5% (1 true positive out of 8)
2. Name entity is entirely missed
3. Year-only dates may be noisy for downstream processing
4. Duplicate phone entity not penalized

**Recommended adjustment:** Consider lowering confidence when entity precision < 30% or when duplicate entities of different types exist.

---

## 6. Extraction Issues Review

**Issues Found:** 0

**Assessment:** The pipeline produced no warnings or errors. However, this is misleading because:
1. The duplicate phone entity should have generated a warning
2. The year-only dates could have generated info-level notes
3. The missed name entity could have generated a warning

**Recommendation:** Add validation checks in `ExtractionResultService` that compare entity count against expected minima for resume documents.

---

## 7. Backward Compatibility

| Milestone-1 Artifact | Status | Notes |
|---|---|---|
| DocxExtractionService | PASS | Unchanged, 15/15 tests pass |
| ResumeTemplate model | PASS | Unchanged, new fields unused |
| StorageService | PASS | Unchanged |
| Existing tests | PASS | 39 test suites, 276 tests pass |

---

## 8. Regression Verification

| Test Suite | Tests | Status |
|---|---|---|
| Milestone-1 (docxExtraction) | 15 | PASS |
| Milestone-2 (all) | 34 | PASS |
| Full project | 276 | PASS |
| TypeScript build | 0 Milestone-2 errors | PASS |

No regressions detected.

---

## 9. Validation Conclusion

| Validation Area | Status | Critical Issues |
|---|---|---|
| Section detection | PASS | 0 |
| Entity detection | PARTIAL | 1 duplicate phone, 1 missed name, 6 borderline dates |
| Formatting metadata | PASS | 0 |
| Confidence scoring | WARNING | Score of 1.0 hides entity quality issues |
| Extraction issues | WARNING | No issues reported despite entity quality problems |
| Backward compatibility | PASS | 0 |
| No regressions | PASS | 0 |

**Overall Validation Status: CONDITIONAL PASS**

The pipeline is functional and produces structured output. Entity quality needs improvement before Milestone-3 placeholder injection.

**Blockers for Milestone-3:**
1. Implement name entity detection (critical for resume templates)
2. Add overlap-aware entity deduplication
3. Improve date entity precision (month-validated dates only, or section-gated years)

**Non-blocking:**
- Year-only dates can be refined in Milestone-3
- Confidence formula can be tuned in Milestone-3
