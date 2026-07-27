# Sprint 6 Plan Freeze
## Resume Parser — ResumeConfidenceScorer (Stage 4)

**Sprint:** 6  
**Date:** 2026-07-25  
**Status:** FROZEN  
**Architecture Baseline:** `RESUME-PARSER-ARCHITECTURE.md` v1.6  
**Tag Baseline:** `v0.5.0`

---

## 1. Freeze Summary

Sprint 6 plan has been **APPROVED** with no findings. The plan is now frozen and ready for implementation.

**Senior Plan Review:** APPROVED  
**Findings:** 0  
**Plan Fixes Required:** No  
**Plan Re-review Required:** No

---

## 2. Frozen Architecture Baseline

- **Architecture Version:** v1.6
- **Stage 4 Definition:** Confidence Scoring & Structuring
- **Service:** `ResumeConfidenceScorer` (stateless)
- **Input:** Stage 3 enriched entities and sections
- **Output:** Document confidence score, reviewStatus, confidenceSummary

---

## 3. Frozen Scope

### In Scope (Frozen)

- `ResumeConfidenceScorer` stateless service
- 5-component confidence formula
- Penalty cap application
- `reviewStatus` determination
- Dispatcher `confidence_scoring` handler
- `ResumeConfidenceScored` / `ResumeConfidenceScoringFailed` events
- Confidence metadata generation
- Idempotency guard
- Unit tests (12+)
- Integration tests (3)

### Out of Scope (Frozen)

- DIC integration (Stage 5)
- Canonical model writes (Stage 6)
- Frontend changes
- API changes
- Entity extraction or enhancement logic
- New AI providers or model training
- Retry logic changes

---

## 4. Frozen Acceptance Criteria

1. Document confidence score calculated using 5-component formula
2. Penalty caps applied correctly
3. `reviewStatus` determined based on thresholds
4. Events published with complete payloads
5. Idempotency guard prevents duplicate scoring
6. 12+ tests pass
7. No regressions from Sprint 5 baseline (461 tests)
8. TypeScript compiles cleanly
9. Code review passed
10. Architecture v1.7 changelog updated

---

## 5. Frozen Test Strategy

### Unit Tests (13)

| Test | Target |
|------|--------|
| Section score calculation | Required sections present/absent |
| Entity score calculation | Required entities populated/missing |
| Format score calculation | Valid/invalid values |
| AI agreement score | AI vs heuristic comparison |
| Consistency score | Date ranges, duplicates, aliases |
| Penalty cap application | Error, failedOver, ai-only, missing sections |
| Final score clamping | Values outside [0,1] |
| reviewStatus thresholds | AUTO_APPROVED, PENDING_REVIEW, NEEDS_REINDEX |
| AI agreement fallback | No AI used → equals entityScore |
| Idempotency | Re-dequeue skips if confidenceScore already set |
| Error: no sections | Publishes failure event |
| Error: no entities | Publishes failure event |
| Malformed input handling | Graceful degradation |

### Integration Tests (3)

| Test | Target |
|------|--------|
| End-to-end: Stage 3 → Stage 4 → confidence score | Full async flow |
| Dispatcher routing | `confidence_scoring` stage handled |
| Event publishing | `ResumeConfidenceScored` emitted |

---

## 6. Frozen Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| AI agreement scoring complexity | Medium | Medium | Define clear comparison logic; fallback to entityScore |
| Penalty cap precedence ambiguity | Low | Medium | Document exact precedence in code comments |
| Performance with large entity sets | Medium | Low | Batch processing; avoid nested loops |
| Score calculation errors | Low | High | Comprehensive unit tests; clamp all outputs |
| Retry causes duplicate scoring | Low | Low | Idempotency guard via confidenceScore check |

---

## 7. Frozen Rollback Strategy

If Stage 4 causes issues:
1. Disable `confidence_scoring` routing in dispatcher
2. Jobs will fail and dead-letter after 3 retries
3. No data loss — Stage 3 entities remain in `rawCandidateFields`
4. Rollback to Sprint 5 state: remove `confidence_scoring` case from dispatcher

---

## 8. Implementation Files

### Files to Create

| File | Purpose |
|------|---------|
| `src/services/resume/resumeConfidenceScorer.service.ts` | Stateless confidence scoring service |
| `src/__tests__/resumeConfidenceScorer.service.test.ts` | Unit tests |

### Files to Modify

| File | Changes |
|------|---------|
| `src/shared/services/knowledgeDispatcher.service.ts` | Implement `handleResumeConfidenceScoring()` |
| `src/events/UaipEvents.ts` | Add `ResumeConfidenceScored`, `ResumeConfidenceScoringFailed` |

---

## 9. Next Steps

1. Implement `ResumeConfidenceScorer` service
2. Implement dispatcher handler
3. Add events
4. Write tests
5. Generate implementation report
6. Senior code review
7. Merge and tag `v0.6.0`

---

## 10. Freeze Approval

- **Plan Review:** APPROVED
- **Findings:** 0
- **Freeze Date:** 2026-07-25
- **Status:** FROZEN

---

*Sprint 6 plan frozen on 2026-07-25.*
