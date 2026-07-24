# Sprint 3 Plan — Senior Engineering Review
## Resume Parser — ResumeSectionDetector

**Date:** 2026-07-24  
**Reviewer:** Kilo  
**Artifact under review:** Sprint 3 Plan (`SPRINT-3-PLAN.md`)  
**Scope:** Planning review only. No code modifications.

---

## Executive Summary

| Dimension | Verdict |
|-----------|---------|
| Scope control | Compliant |
| Architecture compliance | Mostly compliant; 2 gaps |
| Queue flow correctness | ⚠️ Stage routing undefined |
| ResumeSectionDetector design | ⚠️ Schema incomplete |
| AI fallback trigger | Compliant but underspecified |
| Event-driven sequencing | ⚠️ Downstream events not defined |
| Data model design | ⚠️ ResumeSection schema missing |
| Failure handling | ⚠️ Retry/dead-leaf gaps |
| Test strategy | ⚠️ Missing critical test categories |
| Performance | Acceptable |
| Multi-tenant safety | ⚠️ Not explicitly addressed |
| Definition of Done | Incomplete |

**Overall Verdict:** APPROVED WITH FINDINGS

**1 High issue** must be fixed before implementation. **4 Medium issues** should be fixed before implementation. **3 Low issues** are acceptable for v1 but should be tracked.

---

## Critical Issues

None found.

---

## High Issues

### 1. Stage Routing in KnowledgeDispatcher Is Undefined
- **Severity:** High
- **File:** `SPRINT-3-PLAN.md` Section 4 + `src/shared/services/knowledgeDispatcher.service.ts`
- **Explanation:** The plan says "Extend `case 'resume':` to invoke stage handlers (Stage 1: section detection)." However, the current dispatcher routes ALL `domain: 'resume'` jobs to `handleResumeDomain()` — a single stub. There is no mechanism to distinguish Stage 0 (classification), Stage 1 (section detection), Stage 2 (entity extraction), etc. The `KnowledgeJob` model has no `stage` field, and the plan doesn't define a stage-routing strategy.
- **Impact:** When Sprint 3 enqueues `ResumeSectionDetectorJob`, the dispatcher will route it to the same stub that handled the original upload job. Section detection will never execute.
- **Recommendation:** Choose ONE of:
  (a) Add a `stage` field to `KnowledgeJob` payload and route in dispatcher:
  ```ts
  case 'resume':
    const stage = (data as any).stage;
    if (stage === 'section_detection') await this.sectionDetector.handle(...);
    else if (stage === 'entity_extraction') await this.entityExtractor.handle(...);
    // ...
    break;
  ```
  (b) Create separate queue domains: `resume-section`, `resume-entity`, etc.
  (c) Document that `handleResumeDomain` will be replaced by a `ResumeStageRouter` that reads `payload.stage`.
- **Must fix before implementation:** Yes

---

## Medium Issues

### 2. ResumeSection Model Schema Undefined
- **Severity:** Medium
- **File:** `SPRINT-3-PLAN.md` Section 3
- **Explanation:** The plan says "Create `ResumeSection` model" but doesn't define its schema. The architecture v1.3 Section 6 defines the JSON output shape with `title`, `order`, `rawText`, `entities`, `entries`, `repeatable`. The plan only mentions `title`, `startLine`, `endLine`, `rawText`. Without a defined schema, implementation will freeze on design decisions mid-sprint.
- **Recommendation:** Add a `ResumeSection` schema section to the plan before implementation:
  ```ts
  interface ResumeSection {
    title: string;
    order: number;
    startLine: number;
    endLine: number;
    rawText: string;
    entities?: any[];
    entries?: any[];
    repeatable?: boolean;
  }
  ```
- **Must fix before implementation:** No (but strongly recommended)

### 3. Missing `isScanned` Gate in Section Detection Enqueue
- **Severity:** Medium
- **File:** `SPRINT-3-PLAN.md` Section 6
- **Explanation:** Architecture v1.3 Section 2.1 specifies: "Resume parsing proceeds only after OCR text is available for scanned documents." The plan shows the listener enqueuing section detection immediately after classification. It doesn't check `isScanned` from `KnowledgeRecord` or the event payload. For scanned PDFs, section detection would run with empty `rawContent` before OCR completes.
- **Recommendation:** Add a gate check in the plan's data flow:
  ```
  if (knowledgeRecord?.isScanned && !payload.ocrText) return; // wait for OCR_COMPLETED
  ```
- **Must fix before implementation:** No

### 4. Retry Behavior Underspecified
- **Severity:** Medium
- **File:** `SPRINT-3-PLAN.md` Section 8
- **Explanation:** The plan mentions "Heuristic detection fails → Fallback to AI-only via FailoverAIProvider" but doesn't clarify whether this is:
  - Part of the same job attempt (no retry count increase)
  - A separate retry attempt
  - Whether AI fallback exhaustion triggers `ResumeStageRetry` or goes straight to `ResumeParseDeadLetter`
  
  Architecture v1.3 Section 5.1 specifies exponential backoff 1s/2s/4s for stage retries, but the plan doesn't show how this integrates with the AI fallback trigger.
- **Recommendation:** Clarify in the plan:
  - AI fallback is part of the SAME attempt, not a separate retry
  - If AI providers exhaust, publish `ResumeStageFailed` with `terminal: true`
  - If KnowledgeQueueService retries the job, the detector must check `ResumeParseResult.sectionsDetected` for idempotency
- **Must fix before implementation:** No

### 5. Multi-Tenant Isolation Not Explicitly Addressed
- **Severity:** Medium
- **File:** `SPRINT-3-PLAN.md` Section 7
- **Explanation:** The plan doesn't mention `organizationId` scoping for `ResumeSection` queries or the new model's indexes. While `ResumeParseResult` is scoped by `organizationId`, the new `ResumeSection` model (if created as a separate collection) must also enforce org isolation.
- **Recommendation:** Add to the plan:
  - `ResumeSection` queries must include `organizationId`
  - Index: `{ processingId: 1, organizationId: 1 }`
  - If embedded in `ResumeParseResult.candidateFields`, no additional scoping needed
- **Must fix before implementation:** No

---

## Low Issues

### 6. No Idempotency Test Plan
- **Severity:** Low
- **File:** `SPRINT-3-PLAN.md` Section 9
- **Explanation:** Architecture v1.3 Section 5.4 requires stage idempotency. The plan's test table doesn't include an idempotency test (re-dequeue same job → skip recomputation).
- **Recommendation:** Add test case: "Re-dequeue same section-detection job → ResumeParseResult.sectionsDetected unchanged"
- **Must fix before implementation:** No

### 7. No Performance Target
- **Severity:** Low
- **File:** `SPRINT-3-PLAN.md` Section 10
- **Explanation:** The plan doesn't state a latency target for section detection. Architecture v1.3 Section 8 targets `< 5s` for section detection.
- **Recommendation:** Add to plan: "Section detection must complete within 5s for resumes < 5 pages"
- **Must fix before implementation:** No

### 8. Missing Integration Test
- **Severity:** Low
- **File:** `SPRINT-3-PLAN.md` Section 9
- **Explanation:** The plan lists one integration test but doesn't cover the full async chain: `Parsed` → classification → enqueue → dispatcher → section detection → ResumeParseResult update → ResumeSectionDetected event.
- **Recommendation:** Add integration test: "End-to-end: upload resume → classify → enqueue section detector → dispatcher routes → sections stored in candidateFields"
- **Must fix before implementation:** No

---

## Architecture Compliance Verification

| Architecture Requirement | Plan Status | Evidence |
|--------------------------|-------------|----------|
| Stage 1 runs as async job via KnowledgeQueueService | ✅ Planned | Section 6 Data Flow |
| Heuristic rules: heading style, font, regex, layout, spacing | ✅ Planned | Section 7.1 |
| Required-section AI fallback trigger | ✅ Planned | Section 7.2 |
| AI fallback output: same JSON array format | ⚠️ Underspecified | No output schema defined |
| Provider chain: FailoverAIProvider → Gemini → OpenRouter → RuleEngine | ✅ Planned | Section 7.2 |
| Stage retry with backoff | ⚠️ Gap | Section 8 lacks retry details |
| Idempotency via ResumeParseResult check | ⚠️ Missing | Not in plan |
| Terminal failure → NEEDS_REINDEX | ✅ Planned | Section 8 |
| Event publication on success/failure | ✅ Planned | Section 6 |
| organizationId scoping | ⚠️ Not explicit | Section 7 |

---

## Scope Control Review

| In Scope (Sprint 3) | Status |
|---------------------|--------|
| ResumeSectionDetector service | ✅ Planned |
| ResumeSection model | ✅ Planned |
| Unit tests | ✅ Planned |
| KnowledgeDispatcher Stage 1 handler | ✅ Planned |
| Listener enqueue for section detector | ✅ Planned |
| UaipEvents extensions | ✅ Planned |

| Out of Scope (Sprint 3) | Status |
|--------------------------|--------|
| ResumeEntityExtractor | ✅ Guarded |
| ResumeAIEnhancer | ✅ Guarded |
| ResumeConfidenceScorer | ✅ Guarded |
| DIC integration | ✅ Guarded |
| Canonical model writes | ✅ Guarded |
| Frontend changes | ✅ Guarded |
| Performance optimization | ✅ Guarded |

No scope creep detected.

---

## Queue Flow Review

### Current State (Sprint 2)

```
Upload → KnowledgeJob (domain: 'resume')
  → KnowledgeDispatcher case 'resume'
    → handleResumeDomain() STUB
```

### Planned State (Sprint 3)

```
Classification → KnowledgeJob (domain: 'resume', payload.stage: 'section_detection')
  → KnowledgeDispatcher case 'resume'
    → Stage 1 handler (undefined)
      → ResumeSectionDetector.detect()
```

### Gap

The dispatcher has no way to route `stage: 'section_detection'` differently from the upload job. This is the **High #1** finding above.

---

## Failure Handling Review

| Failure Mode | Plan Behavior | Architecture Requirement | Gap |
|--------------|---------------|--------------------------|-----|
| rawContent missing | Publish `ResumeSectionDetectionFailed`, `NEEDS_REINDEX` | ✅ Compliant | None |
| Heuristic fails | Fallback to AI-only | ✅ Compliant | Retry semantics undefined |
| AI providers exhausted | Publish `ResumeSectionDetectionFailed`, `NEEDS_REINDEX` | ✅ Compliant | Should this trigger `ResumeStageFailed` first? |
| No sections detected | Publish `ResumeSectionDetectionFailed` | ✅ Compliant | None |
| Queue retry | Not specified | Exponential 1s/2s/4s | ⚠️ Gap |

---

## Test Strategy Review

| Test Category | Planned | Architecture Requirement | Gap |
|---------------|---------|--------------------------|-----|
| Unit: well-structured resume | ✅ | ✅ | None |
| Unit: missing required section → AI fallback | ✅ | ✅ | None |
| Unit: plain text → GENERAL section | ✅ | ✅ | None |
| Unit: regex patterns | ✅ | ✅ | None |
| Unit: AI fallback invocation | ✅ | ✅ | None |
| Integration: full async flow | ✅ | ✅ | Missing queue/dispatcher mocking |
| Idempotency | ❌ | Required | Missing |
| Retry/dead-letter | ❌ | Required | Missing |
| Multi-tenant isolation | ❌ | Required | Missing |
| AI fallback failure path | ❌ | Required | Missing |

---

## Performance Review

| Concern | Plan Addresses? | Notes |
|---------|-----------------|-------|
| Section detection latency < 5s | ❌ | No target stated |
| Large resume memory | ❌ | No mention of streaming or chunking |
| AI fallback latency | ❌ | No timeout specified for FailoverAIProvider |
| Queue polling overhead | ✅ | Inherited from KnowledgeQueueService |

---

## Definition of Done Review

| DoD Item | Present? | Notes |
|----------|----------|-------|
| ResumeSectionDetector created and tested | ✅ | |
| ResumeSection model with indexes | ✅ | Schema missing |
| KnowledgeDispatcher Stage 1 handler | ✅ | Routing undefined |
| Listener enqueues section-detector job | ✅ | |
| UaipEvents extended | ✅ | |
| All new tests pass | ✅ | Missing categories |
| TypeScript clean | ✅ | |
| Architecture v1.4 changelog | ✅ | |
| Code review passed | ✅ | |
| Merge to main | ✅ | |
| **Idempotency tested** | ❌ | Required by architecture |
| **Retry/dead-letter tested** | ❌ | Required by architecture |
| **Multi-tenant isolation verified** | ❌ | Required |
| **Performance benchmarks met** | ❌ | Required |

---

## Verdict

### APPROVED WITH FINDINGS

Sprint 3 plan is well-structured, scope-controlled, and mostly compliant with architecture v1.3. However, **1 High issue must be resolved before implementation**:

1. **Stage routing mechanism** — Define how the dispatcher distinguishes section-detection jobs from other resume jobs. Without this, the queue cannot route Stage 1 correctly.

**4 Medium issues should be resolved before implementation**:
2. **ResumeSection schema** — Define the full schema including `order`, `entities`, `entries`, `repeatable`
3. **`isScanned` gate** — Add OCR-aware gating in the listener's enqueue logic
4. **Retry semantics** — Clarify AI fallback vs queue retry interaction
5. **Multi-tenant scoping** — Explicitly state `organizationId` requirements for new queries

**3 Low issues** are acceptable for v1 but should be tracked:
6. Add idempotency test
7. Add performance target
8. Add integration test covering full async chain

**No critical issues. No scope creep. No security red flags.**

---

*Review completed. No code was modified.*
