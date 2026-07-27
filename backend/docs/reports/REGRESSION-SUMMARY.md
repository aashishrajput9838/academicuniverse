# Regression Summary (PRG-001)

**Date:** 2026-07-22
**Gate:** Production Readiness Gate (PRG-001)
**Purpose:** Verify no regressions in Milestone-1, Milestone-2, or Milestone-3 after expanded real dataset validation

---

## 1. Executive Summary

Full regression suite was executed after PRG-001 real dataset validation. All tests pass with 0 failures.

**Status: PASS**

---

## 2. Test Suite Results

| Metric | Value |
|---|---|
| Total test suites | 42 |
| Total tests | 294 |
| Passed | 294 |
| Failed | 0 |
| Test duration | ~20.1s |

---

## 3. Milestone Coverage

### 3.1 Milestone-1 Tests

| Test Suite | Tests | Status |
|---|---|---|
| docxExtraction.service.test.ts | 15 | PASS |
| docxExtraction.service.regression.test.ts | 2 | PASS |
| parserService.test.ts | 4 | PASS |
| ParserFactory.test.ts | 3 | PASS |
| ExcelParser.test.ts | 4 | PASS |
| TxtParser.test.ts | 3 | PASS |
| PdfParser.test.ts | 4 | PASS |
| ImageParser.test.ts | 3 | PASS |
| CsvParser.test.ts | 3 | PASS |

### 3.2 Milestone-2 Tests

| Test Suite | Tests | Status |
|---|---|---|
| sectionDetector.service.test.ts | 8 | PASS |
| entityDetector.service.test.ts | 7 | PASS |
| confidenceScorer.service.test.ts | 4 | PASS |
| formattingBuilder.service.test.ts | 4 | PASS |
| PipelineOrchestrator.test.ts | 3 | PASS |
| ExtractionResultService.test.ts | 2 | PASS |

### 3.3 Milestone-3 Tests

| Test Suite | Tests | Status |
|---|---|---|
| placeholderInjector.service.test.ts | 6 | PASS |
| docxTemplateGenerator.service.test.ts | 3 | PASS |
| templateProcessingOrchestrator.service.test.ts | 3 | PASS |

### 3.4 Other Tests

| Test Suite | Tests | Status |
|---|---|---|
| documentDeletion.test.ts | 2 | PASS |
| ezone-scraper.regression.test.ts | 1 | PASS |
| skillEvidence.repository.test.ts | 2 | PASS |
| OCRService.test.ts | 3 | PASS |
| timetableHelper.test.ts | 1 | PASS |
| academicRecordController.test.ts | 6 | PASS |

---

## 4. No Regressions Detected

| Milestone | Modified | Status |
|---|---|---|
| Milestone-1 | No | PASS |
| Milestone-2 | No | PASS |
| Milestone-3 | No | PASS |

No existing functionality was modified during PRG-001 execution.

---

## 5. Conclusion

**Regression Status: PASS**

All 294 tests pass. No regressions in Milestone-1, Milestone-2, or Milestone-3.
