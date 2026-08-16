# Schema Alignment Report
# Ground Truth vs Model Schema vs Evaluator Schema Analysis

---

## 1. Schema Comparison Matrix

The table below maps all fields present across the Ground Truth, the Model Prompt Schema, and the Evaluation Engine:

| Field Name (Snake / Camel) | Ground Truth Schema | Model Schema | Evaluator Evaluates? | Status / Discrepancy |
|---|---|---|---|---|
| `student_name` / `studentName` | ✅ Present | ✅ Included | ✅ Yes | Matched (F1 = 76.1%) |
| `roll_number` / `rollNumber` | ✅ Present | ✅ Included | ✅ Yes | Matched (F1 = 76.4%) |
| `enrollment_number` / `enrollmentNumber` | ✅ Present | ✅ Included | ✅ Yes | Matched (F1 = 75.8%) |
| `degree_name` / `degreeName` | ✅ Present | ✅ Included | ✅ Yes | Matched (F1 = 75.8%) |
| `branch_name` / `branchName` | ✅ Present | ✅ Included | ✅ Yes | Matched (F1 = 75.8%) |
| `batch_years` / `batchYears` | ✅ Present | ✅ Included | ✅ Yes | Matched (F1 = 75.8%) |
| `cgpa` / `cgpa` | ✅ Present | ✅ Included | ✅ Yes | Matched (F1 = 75.8%) |
| `issue_date` / `issueDate` | ✅ Present | ✅ Included | ✅ Yes | Matched (F1 = 75.8%) |
| `university_name` / `universityName` | ✅ Present | ✅ Included | ✅ Yes | Matched (F1 = 75.8%) |
| `university_code` / `universityCode` | ✅ Present | ✅ Included | ✅ Yes | Matched (F1 = 75.8%) |
| `father_name` / `fatherName` | ✅ Present | ❌ **Omitted** | ✅ Yes | **360/360 MISSING (0% F1)** |
| `mother_name` / `motherName` | ✅ Present | ❌ **Omitted** | ✅ Yes | **360/360 MISSING (0% F1)** |
| `date_of_birth` / `dateOfBirth` | ✅ Present | ❌ **Omitted** | ✅ Yes | **360/360 MISSING (0% F1)** |
| `email` / `email` | ✅ Present | ❌ **Omitted** | ✅ Yes | **360/360 MISSING (0% F1)** |
| `phone` / `phone` | ✅ Present | ❌ **Omitted** | ✅ Yes | **360/360 MISSING (0% F1)** |
| `blood_group` / `bloodGroup` | ✅ Present | ❌ **Omitted** | ✅ Yes | **360/360 MISSING (0% F1)** |
| `university_tagline` / `universityTagline` | ✅ Present | ❌ **Omitted** | ✅ Yes | **360/360 MISSING (0% F1)** |
| `document_type` / `documentType` | ✅ Present | ❌ **Omitted** | ✅ Yes | **351/360 MISSING (Contaminated)** |
| `semester_records[].course_marks[]` | ✅ Present (18,000) | ❌ **Omitted** | ✅ Yes | **18,000/18,000 MISSING (0% F1)** |

---

## 2. Quantitative Mismatch Summary

1. **Total Ground Truth Fields Evaluated**: 24,480 total comparisons across 360 samples.
2. **Schema-Covered Scalar Fields**: 3,600 comparisons (10 fields × 360 samples).
3. **Omitted GT Scalar Fields**: 2,880 comparisons (8 fields × 360 samples).
4. **Omitted Marksheet Subject Array Attributes**: 18,000 comparisons (120 marksheets × ~40 subjects × 3 fields + index alignment).
5. **Guaranteed Failure Rate due to Schema Mismatch**: **85.29% of all evaluated fields** (20,880 out of 24,480) are guaranteed to fail with 0% F1 because the model was never instructed to extract them.

---

## 3. Investigation of `documentType` Contamination (Task 5 Verification)

- **Location**: [`AdbgGroundTruthAdapter.ts` line 87](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/adapters/AdbgGroundTruthAdapter.ts#L87)
  ```typescript
  if (rawGt.document_type) extractedFields['document_type'] = rawGt.document_type;
  ```
- **Why**: The GT adapter mistakenly treats `document_type` (which is the document category classification label) as a key-value entity field inside `extractedFields`.
- **Effect**: The model returns `documentCategory: "STUDENT_ID"` at the root JSON object level, rather than inside `extractedEntities.document_type`.
- **Failure Count**: Causes **351 MISSING field failures** (out of 360 samples), producing a 2.5% F1 score for `documentType`.
- **Correction**: Delete line 87 in `AdbgGroundTruthAdapter.ts`. Category classification accuracy is already evaluated separately by `CategoryEvaluator.evaluateCategoryMatch()`.

---

## 4. Aligned Unified Schema Proposal

To achieve complete alignment between Ground Truth, Model Vision Prompt, and Evaluator, the unified schema for scalar extraction is established as follows:

```json
{
  "documentCategory": "CERTIFICATE | MARKSHEET | STUDENT_ID",
  "confidenceScore": 0.95,
  "extractedEntities": {
    "student_name": "string",
    "roll_number": "string",
    "enrollment_number": "string",
    "degree_name": "string",
    "branch_name": "string",
    "batch_years": "string",
    "father_name": "string",
    "mother_name": "string",
    "date_of_birth": "string",
    "email": "string",
    "phone": "string",
    "blood_group": "string",
    "university_name": "string",
    "university_code": "string",
    "university_tagline": "string",
    "cgpa": "string",
    "issue_date": "string"
  }
}
```

By adding `father_name`, `mother_name`, `date_of_birth`, `email`, `phone`, `blood_group`, and `university_tagline` to the prompt schema and removing `document_type` from `extractedFields`, the Ground Truth and Model schemas become **100% aligned**.
