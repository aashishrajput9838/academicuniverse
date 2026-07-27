# Sprint 7 Plan — Evidence Report
## Resume Parser — DIC Integration & Canonical Model Writes (Stages 5-6)

**Date:** 2026-07-25  
**Reviewer:** Kilo  
**Scope:** Sprint 7 plan evidence

---

## Evidence 1: Objectives and Scope

### Objective
Implement Stage 5 (DIC Integration) and Stage 6 (Canonical Model Writes) to complete the resume parsing pipeline.

### Scope Verification

| In-Scope Item | Status |
|---------------|--------|
| DIC Integration service | Planned |
| Canonical Write service | Planned |
| DIC routing logic | Planned |
| Canonical model mapping | Planned |
| Person deduplication | Planned |
| Dispatcher handlers | Planned |
| Events (4 new) | Planned |
| Idempotency guards | Planned |
| Unit tests (12+) | Planned |
| Integration tests (3) | Planned |

| Out-of-Scope Item | Status |
|-------------------|--------|
| DIC UI implementation | Guarded |
| Frontend changes | Guarded |
| API changes for DIC | Guarded |
| New canonical models | Guarded |
| Person matching algorithm redesign | Guarded |
| OCR/parsing changes | Guarded |

**Verdict:** ✅ SCOPE DEFINED

---

## Evidence 2: Architecture Alignment

### Baseline
- Previous: Architecture v1.7 (Sprint 6)
- Planned: v1.8 (Sprint 7)

### Stage Progression

| Stage | Sprint | Status |
|-------|--------|--------|
| Stage 0 | Sprint 2 | DONE |
| Stage 1 | Sprint 3 | DONE |
| Stage 2 | Sprint 4 | DONE |
| Stage 3 | Sprint 5 | DONE |
| Stage 4 | Sprint 6 | DONE |
| Stage 5 | Sprint 7 | PLANNING |
| Stage 6 | Sprint 7 | PLANNING |

### Routing Compatibility

Plan extends existing routing:
- `case 'section_detection'` — Sprint 3, DONE
- `case 'entity_extraction'` — Sprint 4, DONE
- `case 'ai_enhancement'` — Sprint 5, DONE
- `case 'confidence_scoring'` — Sprint 6, DONE
- `case 'dic_integration'` — Sprint 7, THIS SPRINT
- `case 'canonical_write'` — Sprint 7, THIS SPRINT

**Verdict:** ✅ ARCHITECTURE ALIGNED

---

## Evidence 3: Stage 5 and Stage 6 Separation

### Stage 5 Owns
- DIC routing based on `reviewStatus`
- Auto-approval flow
- Human review queue management
- Re-upload flow
- DIC event handling

### Stage 6 Owns
- Canonical model mapping
- Person deduplication
- Idempotent writes
- Record creation/update

### Stage 5 → Stage 6 Flow

| Condition | Stage 5 Action | Stage 6 Trigger |
|-----------|---------------|----------------|
| `AUTO_APPROVED` | Auto-approve in DIC, enqueue Stage 6 | Immediate |
| `PENDING_REVIEW` | Add to DIC queue | On human approval |
| `NEEDS_REINDEX` | Notify user | None until re-upload |

**Verdict:** ✅ BOUNDARIES CLEAR

---

## Evidence 4: Person Deduplication Strategy

### Multi-Signal Matching

| Signal | Algorithm | Threshold | Weight |
|--------|-----------|-----------|--------|
| email | Exact match (lowercase) | exact | Deterministic |
| phone | Exact match (E.164) | exact | Deterministic |
| name+jaro | Jaro-Winkler | >= 0.92 | Soft |
| institution | Fuzzy match | >= 0.85 | Soft |

### Decision Logic
- Deterministic match → reuse existing Person
- Soft match → create ResumePersonSuggestion for DIC review
- No match → create new Person

**Verdict:** ✅ DEDUPLICATION STRATEGY SOUND

---

## Evidence 5: Canonical Model Mapping

### Mapping Defined

| Resume Entity | Canonical Model |
|---------------|-----------------|
| person (HEADER) | Person |
| experience entries | ExperienceRecord |
| education entries | AcademicRecord |
| skill entries | SkillEvidence |
| certification entries | CertificateRecord |
| project entries | CareerRecord |
| achievement entries | CareerRecord |
| language entries | Person (languages field) |

### Idempotency
- Checks `ResumeParseResult.canonicalWrittenAt`
- Uses `processingId` as idempotency key

**Verdict:** ✅ MAPPING COMPLETE

---

## Evidence 6: Event Contracts

### 4 New Events Defined

1. `ResumeDICRouted` — Stage 5 success
2. `ResumeDICRoutingFailed` — Stage 5 failure
3. `ResumeCanonicalWritten` — Stage 6 success
4. `ResumeCanonicalWriteFailed` — Stage 6 failure

### Payloads Complete
All events include: `processingId`, `timestamp`, `correlationId?`, plus event-specific fields.

**Verdict:** ✅ EVENT CONTRACTS DEFINED

---

## Evidence 7: Error Handling and Retry

| Parameter | Value |
|-----------|-------|
| Backoff | 1s, 2s, 4s |
| Max attempts | 3 |
| Dead-letter | ResumeParseDeadLetter |

### Error Modes
- DIC unavailable → retry, then NEEDS_REINDEX
- Person dedup ambiguous → ResumePersonSuggestion
- Write validation error → rollback, retry
- Duplicate write → idempotency guard

**Verdict:** ✅ ERROR HANDLING COMPLETE

---

## Evidence 8: Test Strategy

### Unit Tests (14 planned)
- 6 DIC routing tests
- 6 canonical write tests
- 2 person deduplication tests

### Integration Tests (3 planned)
- Stage 4 → Stage 5 → Stage 6 end-to-end
- Dispatcher routing
- Event publishing

**Verdict:** ✅ TEST STRATEGY COMPLETE

---

## Evidence 9: Risks Mitigated

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Person dedup false positives | Medium | High | Multi-signal; DIC override |
| Canonical model drift | Low | Medium | Validate against interfaces |
| DIC coupling | Medium | Medium | Thin adapter pattern |
| Write performance | Medium | Low | Batch + connection pooling |
| Partial write failure | Low | High | Transactional + rollback |

**Verdict:** ✅ RISKS MITIGATED

---

## Evidence 10: No New Dependencies

Plan Section 4 states:
> No new npm dependencies required.

Verified: Uses existing DIC service, canonical models, EventBus.

**Verdict:** ✅ NO NEW DEPENDENCIES

---

## Conclusion

Sprint 7 plan is complete, defining both Stage 5 and Stage 6 with clear boundaries, proper error handling, and comprehensive test strategy. Ready for senior plan review.

**Verdict:** READY FOR SENIOR PLAN REVIEW

---

*End of Sprint 7 Plan Evidence*
*Generated: 2026-07-25*
