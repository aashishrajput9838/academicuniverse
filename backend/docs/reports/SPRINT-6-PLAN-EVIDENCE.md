# Sprint 6 Plan — Evidence Report
## Resume Parser — ResumeConfidenceScorer (Stage 4)

**Date:** 2026-07-25  
**Reviewer:** Kilo  
**Scope:** Sprint 6 plan evidence

---

## Evidence 1: Objective and Scope

### Objective
Implement `ResumeConfidenceScorer`, Stage 4 of the resume-specific parsing pipeline. Compute final document confidence, apply penalties, determine `reviewStatus`.

### Scope Verification

| In-Scope Item | Status |
|---------------|--------|
| ResumeConfidenceScorer service | Planned |
| 5-component confidence formula | Planned |
| Penalty caps | Planned |
| reviewStatus determination | Planned |
| Dispatcher confidence_scoring handler | Planned |
| ResumeConfidenceScored event | Planned |
| ResumeConfidenceScoringFailed event | Planned |
| Idempotency guard | Planned |
| Tests (12+) | Planned |

| Out-of-Scope Item | Status |
|-------------------|--------|
| DIC integration | Guarded |
| Canonical model writes | Guarded |
| Frontend changes | Guarded |
| API changes | Guarded |
| Entity extraction/enhancement | Guarded |
| New AI providers | Guarded |

---

## Evidence 2: Architecture Alignment

### Baseline
- Previous: Architecture v1.6 (Sprint 5)
- Planned: v1.7 (Sprint 6)

### Stage Progression

| Stage | Sprint | Status |
|-------|--------|--------|
| Stage 0 | Sprint 2 | DONE |
| Stage 1 | Sprint 3 | DONE |
| Stage 2 | Sprint 4 | DONE |
| Stage 3 | Sprint 5 | DONE |
| Stage 4 | Sprint 6 | PLANNING |

### Routing Compatibility

Plan extends existing routing:
- `case 'section_detection'` — Sprint 3, DONE
- `case 'entity_extraction'` — Sprint 4, DONE
- `case 'ai_enhancement'` — Sprint 5, DONE
- `case 'confidence_scoring'` — Sprint 6, THIS SPRINT
- `case 'dic_integration'` — Sprint 7, PENDING

---

## Evidence 3: Scoring Formula

### 5 Components (from Architecture Section 4)

| Component | Weight | Plan Reference |
|-----------|--------|----------------|
| sectionScore | 30% | Section 7.1 |
| entityScore | 25% | Section 7.1 |
| formatScore | 20% | Section 7.1 |
| aiAgreementScore | 15% | Section 7.1 |
| consistencyScore | 10% | Section 7.1 |

### Penalty Caps (from Architecture Section 4.2)

| Condition | Cap | Plan Reference |
|-----------|-----|----------------|
| extractionIssue error | 0.5 | Section 7.3 |
| failedOver | 0.85 | Section 7.3 |
| ai-only detection | 0.80 | Section 7.3 |
| missing HEADER | 0.5 | Section 7.3 |
| missing required section | 0.60 | Section 7.3 |

### Thresholds (from Architecture Section 4.3)

| Score | reviewStatus | Plan Reference |
|-------|--------------|----------------|
| >= 0.85 | AUTO_APPROVED | Section 7.5 |
| 0.60-0.84 | PENDING_REVIEW | Section 7.5 |
| < 0.60 | NEEDS_REINDEX | Section 7.5 |

---

## Evidence 4: Event Contracts

### ResumeConfidenceScoredPayload

Plan Section 9 defines:
- `processingId`, `confidenceScore`, `reviewStatus`, `strategy`, `aiFallbackUsed`
- `confidenceSummary` with all 5 component scores + raw + penalty + final
- `improvements`, `timestamp`, `correlationId`

### ResumeConfidenceScoringFailedPayload

Plan Section 9 defines:
- `processingId`, `errorMessage`, `reason`, `timestamp`, `correlationId`
- Reason enum: `'no_sections' | 'no_entities' | 'ai_exhausted' | 'malformed_response' | 'unknown'`

---

## Evidence 5: Error Handling and Retry

### Error Modes

Plan Section 10 defines:
- No sections → failure event
- No entities → failure event
- AI exhaustion → graceful degradation
- Invalid score → clamp + log
- Queue retry → idempotency guard

### Retry Semantics

- Backoff: 1s, 2s, 4s
- Max attempts: 3
- AI fallback NOT a retry
- Dead-letter after max retries

---

## Evidence 6: Multi-Tenant Isolation

Plan Section 11:
- Queries scope by `processingId`
- `organizationId` inherited from parent
- No separate collection needed

---

## Evidence 7: Test Strategy

### Unit Tests (13 planned)

Plan Section 14 lists 13 unit tests covering:
- Component score calculations
- Penalty cap application
- Final score clamping
- reviewStatus thresholds
- AI agreement scoring
- Idempotency
- Error handling

### Integration Tests (3 planned)

- Stage 3 → Stage 4 end-to-end
- Dispatcher routing
- Event publishing

---

## Evidence 8: Interfaces

### ResumeConfidenceScorerInput
- `processingId`, `rawCandidateFields`, `sectionDetectionStrategy`, `entityExtractionStrategy`, `aiProviderUsed`, `failedOver`, `extractionIssues`

### ResumeConfidenceScorerOutput
- `confidenceScore`, `reviewStatus`, `strategy`, `aiFallbackUsed`, `confidenceSummary`, `improvements`

---

## Evidence 9: Stage Boundaries

### Input from Stage 3

| Stage 3 Output | Stage 4 Input | Used For |
|----------------|---------------|----------|
| `rawCandidateFields.entities` | Entity list | entityScore, consistencyScore |
| `rawCandidateFields.sections` | Section list | sectionScore |
| `entityExtractionStrategy` | Strategy field | aiAgreementScore |
| `sectionDetectionStrategy` | Strategy field | Penalty cap |
| `failedOver` | Boolean flag | Penalty cap |
| `extractionIssues` | Issue array | Penalty cap |

### Output to Stage 5

| Stage 4 Output | Stage 5 Input | Used For |
|----------------|---------------|----------|
| `confidenceScore` | Document confidence | DIC routing |
| `reviewStatus` | Review queue | DIC workflow |
| `confidenceSummary` | Analytics | Monitoring |

---

## Evidence 10: No New Dependencies

Plan Section 4 states:
> No new npm dependencies required. Uses existing `FailoverAIProvider`.

Verified: No new external libraries mentioned.

---

## Evidence 11: Rollback Strategy

Plan Section 19 defines rollback:
1. Disable `confidence_scoring` routing
2. Jobs dead-letter after 3 retries
3. No data loss — Stage 3 entities preserved
4. Remove dispatcher case to revert

---

## Evidence 12: Definition of Done

Plan Section 17 lists 14 DoD items:
1. Service created and tested
2. 5-component formula implemented
3. Penalty caps implemented
4. reviewStatus determination
5. Dispatcher handler
6. Events extended
7. Idempotency guard
8. Error handling tested
9. 12+ tests pass
10. No regressions
11. TypeScript clean
12. Architecture v1.7 updated
13. Code review passed
14. Merge to main

---

## Conclusion

Sprint 6 plan is complete, aligned with existing architecture v1.6, properly scoped, and follows established patterns from Sprints 1–5. Ready for senior plan review.

**Verdict:** READY FOR SENIOR PLAN REVIEW

---

*End of Sprint 6 Plan Evidence*
*Generated: 2026-07-25*
