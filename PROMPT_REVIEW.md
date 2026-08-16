# Prompt Review
# AuDicPredictionAdapter — systemInstruction + prompt
# Extracted from AuDicPredictionAdapter.ts

---

## The Exact Prompt Sent to the Model

### System Instruction

```
You are a document intelligence engine for a student growth tracking SaaS called Academic Universe.
Analyze the document summary and return a valid JSON object with ALL fields extracted.
ALLOWED_CATEGORIES: CERTIFICATE, MARKSHEET, TRANSCRIPT, RESUME, IDENTITY_CARD, STUDENT_ID, ACADEMIC_TIMETABLE
Schema:
{
  "documentCategory": string,
  "confidenceScore": number,
  "summary": string,
  "extractedEntities": {
    "student_name": string,
    "roll_number": string,
    "enrollment_number": string,
    "degree_name": string,
    "branch_name": string,
    "batch_years": string,
    "cgpa": string,
    "issue_date": string,
    "university_name": string,
    "university_code": string
  },
  "suggestedModule": string,
  "primaryTargetModule": { "id": string, "name": string, "confidence": number, "reason": string },
  "secondaryTargetModules": [],
  "candidateFields": object
}
ALLOWED_MODULE_IDS:
- id: "certificates", name: "Certificates"
- id: "academic-records", name: "Academic Records"
...
```

### User Message

```
Analyze document:
Document ID: DOC-00DFAED9_clean
Document Type: student_id
Quality Profile: clean
student_name: Aryan Bhat
roll_number: 2019CE000744
enrollment_number: EN201900744
degree_name: Bachelor of Technology in Civil Engineering
branch_name: Civil Engineering
batch_years: 2019 - 2023
cgpa: 6.8
issue_date: 2023-07-24
university_name: Vivekananda Technical University
university_code: VTU
```

---

## Prompt Analysis

### Issue 1 — CRITICAL: The Prompt Asks for Vision Analysis of Text

The system says "Analyze the document summary" but the user message contains the ground truth field values directly. The task is reformatting, not extraction. There is no document image URI, no base64 image, no OCR output to interpret. The model is being asked to parse text it already has.

**Effect**: The model trivially succeeds on categories and the 10 provided fields. This has no bearing on real document intelligence.

### Issue 2 — CRITICAL: candidateFields Schema Is Completely Unconstrained

```json
"candidateFields": object
```

The word `object` provides no type guidance. The model is left to invent the format. This directly causes the corruption described in RC3 of the root cause analysis, where the model annotates candidateFields values with `{value, confidence}` objects on approximately 24% of calls.

**Fix required**: Either remove `candidateFields` from the schema entirely, or strictly define it as `"candidateFields": { [key: string]: string }` and enforce string values only.

### Issue 3 — MAJOR: Schema Is Asking for Fields Not Covered by Input

The schema requests `extractedEntities` with 10 fields. The user message only provides those 10 fields. But the GT has 17+ fields. The prompt never asks the model to extract father_name, mother_name, DOB, email, phone, blood_group, etc. These fields are in GT but not in the schema and not in the input.

**Effect**: These 7 fields will always be missing from predictions. 2,520 guaranteed MISSING failures per run.

### Issue 4 — MAJOR: Confidence Score Has No Defined Scale

```
"confidenceScore": number
```

No range specified. The model returns values in inconsistent scales:
- Some samples: `0.95` (fraction scale)
- Some samples: `100` (percentage scale)
- Some samples: `85` (percentage scale)

**Measured**: `averageConfidence = 14.98` in metrics.json — a nonsensical value for a 0–1 metric. The confidence calculation code treats these as fractions, so a value of `100` becomes wildly overconfident.

**Effect**: All confidence-based analysis is invalid. The `overconfidenceGap` = 14.98 is not meaningful.

**Fix**: Constrain in prompt: `"confidenceScore": number between 0.0 and 1.0`

### Issue 5 — MODERATE: ALLOWED_CATEGORIES Contains Categories Not in Ground Truth

```
ALLOWED_CATEGORIES: CERTIFICATE, MARKSHEET, TRANSCRIPT, RESUME, IDENTITY_CARD, STUDENT_ID, ACADEMIC_TIMETABLE
```

But the GT only has three categories: `certificate`, `marksheet`, `student_id`. The model maps these to `CERTIFICATE`, `MARKSHEET`, `STUDENT_ID` correctly for category classification (100% accuracy). However, `IDENTITY_CARD` is also a plausible output for `student_id` documents, creating ambiguity.

The category mapping in `CategoryEvaluator` handles this via an alias map, but the breadth of ALLOWED_CATEGORIES is wider than the dataset.

### Issue 6 — MINOR: "summary" Field Has No Specification

```
"summary": string
```

The model generates arbitrary summaries. These are never evaluated. The field is never used in any comparison. It adds tokens to every response (8192 max_tokens) with no value.

**Fix**: Remove `summary` from the schema or specify it as `""` to reduce response size.

### Issue 7 — MINOR: The Module List Adds Unnecessary Tokens

```
ALLOWED_MODULE_IDS:
- id: "certificates", name: "Certificates"
- id: "academic-records", name: "Academic Records"
...
```

This data is appended to every single prompt even though module routing is irrelevant to extraction accuracy. On a free-tier Groq account with TPM limits, every token matters.

---

## Prompt Effectiveness Assessment

| Criterion | Assessment |
|---|---|
| Is the prompt too long? | Moderate. Module list adds unnecessary tokens. |
| Is important information buried? | N/A — input is structured text, not a document |
| Are instructions ambiguous? | Yes — `candidateFields: object` has no type constraint |
| Is JSON schema too complex? | Yes — summary, primaryTargetModule, secondaryTargetModules, suggestedModule are all irrelevant noise for extraction |
| Does the model ignore required fields? | No — it extracts all 10 schema fields reliably |
| Are few-shot examples needed? | Not for the current (text reformatting) task. Would be needed for real image extraction |
| Are extraction rules conflicting? | No direct conflicts |

---

## Rewrite Recommendation

**Evidence basis**: The prompt rewrite below is justified by the 24.2% `candidateFields` corruption rate (714 events). The only change that would measurably improve the current benchmark without architectural changes is:

1. Remove `candidateFields` or constrain its type
2. Add scale constraint for confidenceScore
3. Remove summary, suggestedModule, primaryTargetModule, secondaryTargetModules

**Estimated F1 improvement from prompt fix alone**: +2.9 pp (eliminates RC3 corruption on 714 fields)

```
You are a document field extraction engine. Extract ALL fields from the document data below.
Return ONLY a JSON object matching this exact schema. All values must be plain strings.
{
  "documentCategory": "CERTIFICATE" | "MARKSHEET" | "STUDENT_ID",
  "confidenceScore": <number 0.0–1.0>,
  "extractedEntities": {
    "student_name": <string or "">,
    "roll_number": <string or "">,
    "enrollment_number": <string or "">,
    "degree_name": <string or "">,
    "branch_name": <string or "">,
    "batch_years": <string or "">,
    "cgpa": <string or "">,
    "issue_date": <string or "">,
    "university_name": <string or "">,
    "university_code": <string or "">
  }
}
No nested objects. No confidence annotations inside extractedEntities. No extra keys.
```

**Note**: This prompt rewrite alone will not improve real document intelligence. The fundamental architectural problem (no image processing) must be addressed separately. See ARCHITECTURE_RECOMMENDATIONS.md.
