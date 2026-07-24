# Sprint 4 Plan — Evidence Report
## Resume Parser — ResumeEntityExtractor (Stage 2)

**Date:** 2026-07-24  
**Reviewer:** Kilo  
**Scope:** Sprint 4 plan evidence

---

## Evidence 1: Architecture Alignment

### Baseline
- **Current Architecture:** v1.4 (Sprint 3 frozen)
- **Plan proposes:** v1.5
- **Commit baseline:** `5905900` (Sprint 3 freeze)
- **Tag baseline:** `v0.3.0`

### Stage Progression

| Stage | Sprint | Status | Output |
|-------|--------|--------|--------|
| Stage 0 | Sprint 2 | FROZEN | `ResumeParseResult` created, classification stored |
| Stage 1 | Sprint 3 | FROZEN | `ResumeParseResult.rawCandidateFields.sections` |
| Stage 2 | Sprint 4 | PLANNING | `ResumeParseResult.rawCandidateFields.{person,experience,education,skills,projects,certifications,achievements,languages}` |

### Routing Compatibility

Plan extends existing `switch(payload.stage)` pattern:
- `case 'section_detection'` — Sprint 3, DONE
- `case 'entity_extraction'` — Sprint 4, THIS SPRINT
- `case 'ai_enhancement'` — Sprint 5, PENDING
- `case 'confidence_scoring'` — Sprint 6, PENDING

This matches the permanent routing architecture established in Sprint 3.

---

## Evidence 2: Input/Output Verification

### Input

Plan specifies:
```
ResumeParseResult.rawCandidateFields.sections
```

**Evidence from Sprint 3 implementation:**
- `knowledgeDispatcher.service.ts:348-351` writes:
  ```ts
  rawCandidateFields: {
    ...((existing as any)?.rawCandidateFields || {}),
    sections: mappedSections,
  }
  ```
- Sections array contains `ResumeSection[]` with `title`, `order`, `startLine`, `endLine`, `rawText`

### Output

Plan specifies 8 entity types:
1. `person`
2. `experience`
3. `education`
4. `skill`
5. `project`
6. `certification`
7. `achievement`
8. `language`

**Evidence from ResumeParseResult model:**
- `rawCandidateFields: { type: Schema.Types.Mixed, default: {} }` — supports any embedded structure
- No separate collections required
- Org isolation via `ResumeParseResult.organizationId`

---

## Evidence 3: Reuse Verification

### Components to Reuse

| Component | Evidence of Existence | Sprint |
|-----------|----------------------|--------|
| `ResumeSectionDetector` | `src/services/resume/resumeSectionDetector.service.ts` | 3 |
| `KnowledgeDispatcher` | `src/shared/services/knowledgeDispatcher.service.ts` | 3 |
| `ResumeParseResult` | `src/models/ResumeParseResult.ts` | 2 |
| `FailoverAIProvider` | `src/core/ai/failover.provider.ts` | 2 |
| `IAIProvider` / `AIConfig` | `src/core/ai/ai.provider.ts` | 2 |
| `KnowledgeQueueService` | `src/shared/services/knowledgeQueue.service.ts` | 2 |
| `KnowledgeJobRepository` | `src/shared/repositories/knowledgeJob.repository.ts` | 2 |
| `UaipEvents` | `src/events/UaipEvents.ts` | 2+3 |
| `AuditEntry` | `src/models/AuditEntry.ts` | 2 |
| `eventBus` | `src/events/EventBus.ts` | 2 |

**No new infrastructure dependencies introduced.**

---

## Evidence 4: Scope Control

### In Scope

| Item | Evidence |
|------|----------|
| ResumeEntityExtractor service | Plan Section 3 |
| ResumeEntity interface | Plan Section 7.2 |
| Unit tests (12+) | Plan Section 10 |
| Integration tests | Plan Section 10 |
| KnowledgeDispatcher handler | Plan Section 4 |
| Event publishing | Plan Section 1, 6 |
| AI fallback | Plan Section 7.4 |
| Idempotency | Plan Section 8, 10 |
| Architecture v1.5 | Plan Section 14 |

### Out of Scope (Explicit Guardrails)

| Item | Evidence |
|------|----------|
| ResumeAIEnhancer | Plan Section 12: ❌ |
| ResumeConfidenceScorer | Plan Section 12: ❌ |
| DIC integration | Plan Section 12: ❌ |
| Canonical model writes | Plan Section 12: ❌ |
| Frontend changes | Plan Section 12: ❌ |
| API changes | Plan Section 5: None |
| NER model training | Plan Section 12: ❌ |

**No scope creep detected.**

---

## Evidence 5: Statelessness

Plan specifies:
> `ResumeEntityExtractor` as independent stateless service

**Evidence from Sprint 3 pattern:**
- `ResumeSectionDetector` is stateless: zero DB/event/queue dependencies
- Constructor accepts `IAIProvider` only
- Method signature: `extract(params: { sections, rawText, mimeType }): Promise<Entity[]>`
- No side effects

**Expected pattern for Sprint 4:**
- Same constructor injection pattern
- Same pure-function approach
- Same event-driven orchestration via dispatcher/listener

---

## Evidence 6: Error Handling

### Plan Error Modes

| Failure Mode | Behavior |
|--------------|----------|
| No sections in ResumeParseResult | Use rawContent fallback |
| AI providers exhausted | Publish failure, set NEEDS_REINDEX |
| Invalid AI response | Log warning, skip malformed, continue heuristics |
| Queue retry | Idempotency via entitiesExtracted > 0 |
| Partial extraction failure | Publish success with warning, PENDING_REVIEW |

**Evidence from Sprint 3 implementation:**
- Same error handling pattern in `handleResumeSectionDetection`
- `try/catch` with `AuditEntry.create` for failures
- `eventBus.publish` for stage completion/failure
- Idempotency via `ResumeParseResult.findOne` check

**Pattern consistency verified.**

---

## Evidence 7: Multi-Tenant Safety

Plan specifies:
> Entities are **embedded** in `ResumeParseResult.rawCandidateFields`

**Evidence:**
- `ResumeParseResult` scoped by `organizationId` (Mongoose index: `organizationId: 1, reviewStatus: 1`)
- All queries include `processingId` + `organizationId`
- No separate entity collections
- No cross-tenant data exposure vectors

**Multi-tenant isolation maintained per Sprint 2/3 pattern.**

---

## Evidence 8: Test Plan Adequacy

### Unit Tests

Plan specifies 12+ unit tests covering:
- Each entity type extraction (8 tests)
- AI fallback trigger and response validation (2 tests)
- Idempotency (1 test)
- Error handling: no sections, AI exhausted (2+ tests)

**Comparison with Sprint 3 baseline:**
- Sprint 3 detector: 9 unit tests
- Sprint 3 dispatcher: 4 unit tests
- Sprint 3 listener: 8 unit tests
- Total Sprint 3: 21 tests

**Sprint 4 plan: 12+ tests is adequate for Stage 2 complexity.**

### Integration Tests

Plan specifies 4 integration tests:
- End-to-end: Stage 1 → Stage 2
- OCR gate + full pipeline
- Multi-tenant isolation
- Performance benchmark (< 5s)

**Matches Sprint 3 integration test pattern.**

---

## Evidence 9: Definition of Done

Plan specifies 15 DoD items:

| # | DoD Item | Status |
|---|----------|--------|
| 1 | ResumeEntityExtractor service created and unit tested | Planned |
| 2 | ResumeEntity interface defined | Planned |
| 3 | ResumeParseResult updated | Planned |
| 4 | KnowledgeDispatcher handler implemented | Planned |
| 5 | UaipEvents extended | Planned |
| 6 | Idempotency guard implemented | Planned |
| 7 | AI fallback implemented | Planned |
| 8 | Confidence per entity assigned | Planned |
| 9 | Error handling + retry semantics tested | Planned |
| 10 | 12+ new tests pass | Planned |
| 11 | No regressions (baseline: 418) | Planned |
| 12 | TypeScript compiles cleanly | Planned |
| 13 | Architecture v1.5 changelog updated | Planned |
| 14 | Code review passed | Planned |
| 15 | Merge to main | Planned |

**All DoD items are verifiable and measurable.**

---

## Evidence 10: Dependencies

Plan specifies:
> No new npm dependencies required

**Verification:**
- Uses `FailoverAIProvider` (already in codebase)
- Uses regex utilities (already in codebase)
- No new AI providers or parsing libraries required
- Consistent with Sprint 3 dependency approach

---

## Conclusion

Sprint 4 plan is complete, aligned with existing architecture, properly scoped, and follows the established Sprint 3 patterns. Ready for implementation upon review approval.

---

*End of Sprint 4 Plan Evidence*
*Generated: 2026-07-24*
