# Evaluator Trace Report
# End-to-End Evaluation & Flattening Pipeline Trace
# AU DIC Benchmark Evaluation Framework

---

## 1. Single Sample Complete Execution Trace (`DOC-00DFAED9_clean`)

### Step 1: Ground Truth Loading
- **File**: [`backend/src/benchmark/adapters/AdbgGroundTruthAdapter.ts`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/adapters/AdbgGroundTruthAdapter.ts) (lines 33–119)
- **Function**: `loadGroundTruth(gtPath, baseDir)`
- **GT Input**: `groundtruth/DOC-00DFAED9_clean.json`
- **Output Data**:
  - `extractedFields`: `{ student_name: "Aryan Bhat", roll_number: "2019CE000744", ... }`
  - `subjects`: Array of 40 objects `[{ code: "MA101", name: "Engineering Mathematics I", credits: 4, grade: "B", gradePoints: 6, term: "Semester 1", gradingStatus: "Graded" }, ...]`

### Step 2: Prediction Generation
- **File**: [`backend/src/benchmark/adapters/AuDicPredictionAdapter.ts`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/adapters/AuDicPredictionAdapter.ts) (lines 27–156)
- **Function**: `predict(sample, baseDatasetDir)`
- **Output Data**:
  - `extractedEntities`: `{ student_name: "Aryan Bhat", roll_number: "2019CE000744", ... }`
  - `candidateFields.subjects`: Array of 40 objects `[{ code: "MA101", name: "Engineering Mathematics I", credits: 4, grade: "B", gradePoints: 6, ... }, ...]`

### Step 3: Filtering & Normalization (The Disappearance Step)
- **File**: [`backend/src/benchmark/evaluators/FieldLevelEvaluator.ts`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/evaluators/FieldLevelEvaluator.ts) (lines 37–47)
- **Function**: `evaluateSample()`
- **Trace**:
  1. Instantiates `cleanRawPred` with `extractedEntities`.
  2. Loops over `candidateFields`. Checks `typeof v === 'string'`.
  3. Because `candidateFields.subjects` is an `Array`, `cleanRawPred['subjects']` is NOT assigned.
  4. `CanonicalNormalizer.normalizeFields(cleanRawPred)` returns `canonicalPred` with `canonicalPred.subjects = undefined`.

### Step 4: Flattening & Comparison
- **File**: [`backend/src/benchmark/evaluators/FieldLevelEvaluator.ts`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/evaluators/FieldLevelEvaluator.ts) (lines 64–66)
- **File**: [`backend/src/benchmark/comparators/SubjectArrayComparator.ts`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/comparators/SubjectArrayComparator.ts) (lines 24–59)
- **Trace**:
  1. `actualSubjects = canonicalPred.subjects || []` -> `[]`.
  2. `SubjectArrayComparator.compareSubjects(groundTruth.subjects, [])` is called.
  3. `exp.length = 40`, `act.length = 0`.
  4. Loop runs for `i = 0` to `39`:
     - `ExactMatchComparator.compareField("subject[i].code", "MA101", undefined)` -> `matched: false`, `cer: 1.0`, `wer: 1.0`
     - `ExactMatchComparator.compareField("subject[i].grade", "B", undefined)` -> `matched: false`, `cer: 1.0`, `wer: 1.0`
     - `ExactMatchComparator.compareField("subject[i].credits", 4, undefined)` -> `matched: false`, `cer: 1.0`, `wer: 1.0`
  5. Pushes 120 failed comparison details into `discrepancies`.

### Step 5: Metric Aggregation
- **File**: [`backend/src/benchmark/evaluators/FieldLevelEvaluator.ts`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/evaluators/FieldLevelEvaluator.ts) (lines 74–85)
- **Result**: `totalFields = 137`, `matchedFields = 17`. `Recall = 17 / 137 = 12.41%`, `F1 = 22.08%`.

---

## 2. Flattening Pipeline Analysis

- **Functions Responsible**:
  1. `FieldLevelEvaluator.evaluateSample()` (lines 38–48)
  2. `SubjectArrayComparator.compareSubjects()` (lines 46–59)
- **Flattening Mechanism**:
  - Subjects are flattened into indexed keys of the form:
    - `subject[i].code`
    - `subject[i].grade`
    - `subject[i].credits`
- **Positional Mapping Limitation**: `SubjectArrayComparator` uses strict positional index matching (`exp[i]` vs `act[i]`).
  - If subject #2 is missing from prediction, all subsequent items (subjects #3 to #40) shift by 1 index, causing a cascade of positional false negatives for all remaining subjects!
  - No set-based or code-keyed matching is currently performed.
