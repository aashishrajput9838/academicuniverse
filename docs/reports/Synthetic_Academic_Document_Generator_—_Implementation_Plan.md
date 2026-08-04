# Synthetic Academic Document Generator — Implementation Plan

## Overview

Build a fully independent module (`benchmarks/synthetic-generator/`) that generates realistic synthetic academic PDFs with perfect ground truth, integrates with the existing Dataset Manager, and provides both CLI and Web UI.

## Key Technical Decisions

| Decision | Choice | Rationale |
|:---|:---|:---|
| PDF Generation | `pdf-lib` (pure TS/JS) | No native bindings, full drawing API |
| Seeded PRNG | Custom Mulberry32 | Deterministic, zero-dependency |
| Integration Point | Write to `benchmarks/dataset/RAW/` | Existing `DatasetManagerService` auto-scans this folder |
| Quality Simulation | PDF-level transforms (rotation, opacity, grayscale) | No image processing deps needed |
| CLI | `commander` (already in deps) | Consistent with existing CLI pattern |
| API | Next.js Route Handler `/api/synthetic/generate` | Decouples UI from backend |
| UI | New page `/dashboard/student/synthetic-generator` | Independent page |

---

## Directory Structure

```
benchmarks/synthetic-generator/
├── types/syntheticGenerator.types.ts
├── core/
│   ├── seededRandom.ts               # Mulberry32 PRNG
│   ├── dataFabricator.ts             # Student/course/date data pools
│   └── templateEngine.ts             # 4 fictional university templates
├── generators/
│   ├── marksheetGenerator.ts
│   ├── certificateGenerator.ts       # All 5 certificate subtypes
│   ├── transcriptGenerator.ts
│   ├── timetableGenerator.ts
│   ├── admitCardGenerator.ts
│   ├── feeReceiptGenerator.ts
│   └── studentIdGenerator.ts
├── pipeline/
│   ├── groundTruthBuilder.ts
│   ├── manifestBuilder.ts
│   ├── qualityChecker.ts
│   └── syntheticPipeline.ts          # Main orchestrator
├── cli/syntheticCli.ts
├── tests/syntheticGenerator.test.ts
└── docs/
    ├── DEVELOPER_GUIDE.md
    ├── USER_GUIDE.md
    └── REPRODUCIBILITY_GUIDE.md

app/dashboard/student/synthetic-generator/page.tsx
app/api/synthetic/generate/route.ts
```

---

## University Templates (Fictional)

| ID | Name | Color | Style |
|:---|:---|:---|:---|
| A | Vivekananda Technical University | Navy `#1a2e5a` | Formal serif, ruled header |
| B | Sri Ramanujan Institute of Technology | Emerald `#0d5e3f` | Modern sans, gradient bar |
| C | National Institute of Eng. & Sciences | Crimson `#8b0000` | Classic triple-border |
| D | Indira Gandhi College of Engineering | Purple `#4b0082` | Contemporary diagonal accent |

---

## Document Types & Ground Truth Fields

| Type | Category | Key GT Fields |
|:---|:---|:---|
| Semester Marksheet | MARKSHEET | name, roll, semester, sgpa, cgpa, courseMarks[] |
| Consolidated Transcript | TRANSCRIPT | name, roll, allSemesters[], cgpa, degree |
| Degree Certificate | CERTIFICATE | name, roll, degree, issueDate, cgpa |
| Provisional Certificate | CERTIFICATE | name, roll, degree, branch |
| Workshop Certificate | WORKSHOP_CERTIFICATE | name, workshopTitle, duration, organizer |
| Internship Certificate | INTERNSHIP_CERTIFICATE | name, company, role, duration |
| Hackathon Certificate | HACKATHON_CERTIFICATE | name, eventName, position, organizer |
| Class Timetable | TIMETABLE | semester, branch, schedule[][] |
| Exam Timetable | EXAM_TIMETABLE | semester, examSchedule[] |
| Admit Card | ADMIT_CARD | name, roll, examCenter, subjects[] |
| Fee Receipt | FEE_RECEIPT | name, roll, amount, feeType, paymentDate |
| Student ID | STUDENT_ID | name, roll, branch, batch, validUntil |

---

## Quality Levels

| Level | PDF Effect | Default % |
|:---|:---|:---:|
| HIGH | Clean PDF | 50% |
| MEDIUM | Slight rotation ±1° | 25% |
| LOW | Rotation ±3°, contrast reduction | 15% |
| SCANNED | Grayscale, ±2° rotation, texture layer | 10% |

---

## Reproducibility

```
SyntheticPipeline(seed=42, count=100) → identical dataset every time
```

---

## Files to Create

### Core Infrastructure
- `[NEW] types/syntheticGenerator.types.ts` — All domain types
- `[NEW] core/seededRandom.ts` — Mulberry32 PRNG
- `[NEW] core/dataFabricator.ts` — 100+ names, 20+ courses, grade tables
- `[NEW] core/templateEngine.ts` — 4 template definitions

### Document Generators
- `[NEW] generators/marksheetGenerator.ts`
- `[NEW] generators/certificateGenerator.ts`
- `[NEW] generators/transcriptGenerator.ts`
- `[NEW] generators/timetableGenerator.ts`
- `[NEW] generators/admitCardGenerator.ts`
- `[NEW] generators/feeReceiptGenerator.ts`
- `[NEW] generators/studentIdGenerator.ts`

### Pipeline
- `[NEW] pipeline/groundTruthBuilder.ts`
- `[NEW] pipeline/manifestBuilder.ts`
- `[NEW] pipeline/qualityChecker.ts`
- `[NEW] pipeline/syntheticPipeline.ts`

### CLI + UI
- `[NEW] cli/syntheticCli.ts`
- `[NEW] app/api/synthetic/generate/route.ts`
- `[NEW] app/dashboard/student/synthetic-generator/page.tsx`

### Tests + Docs
- `[NEW] tests/syntheticGenerator.test.ts`
- `[NEW] docs/DEVELOPER_GUIDE.md`
- `[NEW] docs/USER_GUIDE.md`
- `[NEW] docs/REPRODUCIBILITY_GUIDE.md`

### Modified
- `[MODIFY] benchmarks/package.json` — Add `pdf-lib` + synthetic scripts

---

## Integration Flow

```
UI → POST /api/synthetic/generate
       ↓
SyntheticPipeline.run(config)
       ↓
  Per document: Fabricate → Template → PDF → GT JSON
       ↓
  Write to synthetic-dataset/documents/ + ground-truth/
       ↓
  Copy to benchmarks/dataset/RAW/
       ↓
  DatasetManagerService.processRawDataset()  [EXISTING, UNMODIFIED]
       ↓
  Documents appear in Dataset Dashboard immediately
```

> [!IMPORTANT]
> `pdf-lib` will be installed as a new dependency in `benchmarks/package.json`.
> All other code is new — no existing modules are modified.
