# Sprint 6 Plan
## Resume Parser — ResumeConfidenceScorer (Stage 4)

**Sprint:** 6  
**Date:** 2026-07-25  
**Status:** PLANNING — Ready for Review  
**Architecture Baseline:** `RESUME-PARSER-ARCHITECTURE.md` v1.6  
**Tag Baseline:** `v0.5.0`

---

## 1. Objectives

Implement `ResumeConfidenceScorer`, Stage 4 of the resume-specific parsing pipeline. This service computes the final document-level confidence score, applies penalty caps, determines `reviewStatus`, and emits confidence metadata. It is the last processing stage before DIC review and canonical model writes.

**Outcome:** After Stage 3 enriches entities, `ResumeAIEnhancementListener` enqueues `ResumeConfidenceScorerJob` through `KnowledgeQueueService`. The scorer returns a final confidence score, `reviewStatus`, and structured metadata, then publishes `ResumeConfidenceScored` or `ResumeConfidenceScoringFailed`.

---

## 2. Scope

### In Scope

- `ResumeConfidenceScorer` stateless service
- 5-component confidence formula implementation
- Penalty cap application
- `reviewStatus` determination
- Dispatcher `confidence_scoring` handler
- `ResumeConfidenceScored` / `ResumeConfidenceScoringFailed` events
- Confidence metadata generation
- Idempotency guard
- Unit tests (12+)
- Integration tests (3)

### Out of Scope

- DIC integration (Stage 5)
- Canonical model writes (Stage 6)
- Frontend changes
- API changes
- Entity extraction or enhancement logic
- New AI providers or model training
- Retry logic changes

---

## 3. Architecture Impact

**Architecture version:** v1.7 (Sprint 6)

### v1.7 Changes

- Added Stage 4: Confidence Scoring
- Added `ResumeConfidenceScorer` as independent stateless service
- Added 5-component confidence formula
- Added penalty cap rules
- Added `ResumeConfidenceScored` / `ResumeConfidenceScoringFailed` events
- Extended `KnowledgeDispatcher` with `confidence_scoring` stage
- Added `confidenceSummary` field to `ResumeParseResult` for downstream consumers

---

## 4. Dependencies

| Dependency | Source | Purpose |
|------------|--------|---------|
| `ResumeParseResult.rawCandidateFields` | Stage 3 | Input: sections, entities, metadata |
| `ResumeParseResult` fields | Model | Read strategies, flags, issues |
| `IAIProvider` / `FailoverAIProvider` | AI layer | AI agreement scoring fallback |
| `KnowledgeDispatcher` | Infrastructure | Stage routing |
| `KnowledgeQueueService` | Infrastructure | Job enqueue/dequeue |
| `EventBus` / `UaipEvents` | Events | Publish stage outcome |
| `AuditEntry` | Model | Audit logging |

**No new npm dependencies required.**

---

## 5. Stage 4 Responsibilities

### Only Stage 4 Owns

- Document-level `confidenceScore` computation
- Penalty cap application
- `reviewStatus` determination
- Confidence metadata generation
- `confidenceSummary` persistence

### Stage 4 Does NOT Own

- Entity extraction (Stage 2)
- Entity enhancement/normalization (Stage 3)
- Section detection (Stage 1)
- Classification (Stage 0)
- DIC integration (Stage 5)
- Canonical writes (Stage 6)

---

## 6. Inputs and Outputs

### Input

```ts
interface ResumeConfidenceScorerInput {
  processingId: string;
  rawCandidateFields: {
    sections: Array<{
      title: string;
      order: number;
      entities: any[];
      entries?: any[];
    }>;
    entities: ResumeEntity[];
    person?: Record<string, any>;
    experience?: Record<string, any>[];
    education?: Record<string, any>[];
    skills?: Record<string, any>[];
    projects?: Record<string, any>[];
    certifications?: Record<string, any>[];
    achievements?: Record<string, any>[];
    languages?: Record<string, any>[];
  };
  sectionDetectionStrategy: string;
  entityExtractionStrategy: string;
  aiProviderUsed: string;
  failedOver: boolean;
  extractionIssues: Array<{
    severity: string;
    code: string;
    message: string;
    section?: string;
  }>;
}
```

### Output

```ts
interface ResumeConfidenceScorerOutput {
  confidenceScore: number;
  reviewStatus: 'AUTO_APPROVED' | 'PENDING_REVIEW' | 'NEEDS_REINDEX';
  strategy: 'heuristic' | 'heuristic+ai' | 'ai-only';
  aiFallbackUsed: boolean;
  confidenceSummary: {
    sectionScore: number;
    entityScore: number;
    formatScore: number;
    aiAgreementScore: number;
    consistencyScore: number;
    rawScore: number;
    penaltyCap: number;
    finalScore: number;
  };
  improvements: {
    fieldsNormalized: number;
    fieldsCorrected: number;
  };
}
```

---

## 7. Scoring Formula

### 7.1 Component Scores

| Component | Weight | Calculation |
|-----------|--------|-------------|
| `sectionScore` | 30% | Required sections present and correctly ordered: `HEADER`, `EXPERIENCE`, `EDUCATION`, `SKILLS` |
| `entityScore` | 25% | Required entities populated per section; no empty required values |
| `formatScore` | 20% | Extracted values match expected patterns |
| `aiAgreementScore` | 15% | If AI enhancement used, heuristic and AI agree; if no AI, equals `entityScore` |
| `consistencyScore` | 10% | Logical date ranges, no duplicates, skill aliases resolve |

### 7.2 Weighted Sum

```
rawScore = (sectionScore * 0.30) +
           (entityScore   * 0.25) +
           (formatScore   * 0.20) +
           (aiAgreementScore * 0.15) +
           (consistencyScore * 0.10)
```

### 7.3 Penalty Caps

| Condition | Cap | Rationale |
|-----------|-----|-----------|
| Any `extractionIssue` with `severity === 'error'` | `0.5` | Hard stop: structural failure |
| `failedOver === true` | `0.85` | Reduced trust in AI-dependent extractions |
| `sectionDetectionStrategy === 'ai-only'` | `0.80` | Heuristic baseline failed |
| Missing `HEADER` section | Entity score capped at `0.5` | Anchor for person identification |
| Required section missing | `0.60` | Critical business data absent |

**Precedence:** Apply the most restrictive cap.

### 7.4 Final Calculation

```
penaltyCaps = [
  hasError           ? 0.50 : 1.0,
  failedOver         ? 0.85 : 1.0,
  aiOnlyDetection    ? 0.80 : 1.0,
  missingHeader      ? 0.50 : 1.0,
  missingRequiredSec ? 0.60 : 1.0
]
finalScore = rawScore * Math.min(...penaltyCaps)
finalScore = Math.max(0.0, Math.min(1.0, finalScore))
```

### 7.5 Thresholds

| Final Score | `reviewStatus` | Behavior |
|-------------|----------------|----------|
| `>= 0.85` | `AUTO_APPROVED` | DIC auto-approves; canonical write proceeds |
| `0.60 - 0.84` | `PENDING_REVIEW` | Human review required |
| `< 0.60` | `NEEDS_REINDEX` | Re-upload requested |

---

## 8. AI Agreement Scoring

When Stage 3 used AI enhancement:
- Compare heuristic entities vs AI-enhanced entities
- Agreement = percentage of entities where type, value, and section match
- If no AI was used, `aiAgreementScore = entityScore` (neutral)

---

## 9. Event Contracts

### ResumeConfidenceScored

Published when Stage 4 completes successfully.

```ts
interface ResumeConfidenceScoredPayload extends UaipEventPayload {
  processingId: string;
  confidenceScore: number;
  reviewStatus: 'AUTO_APPROVED' | 'PENDING_REVIEW' | 'NEEDS_REINDEX';
  strategy: 'heuristic' | 'heuristic+ai' | 'ai-only';
  aiFallbackUsed: boolean;
  confidenceSummary: {
    sectionScore: number;
    entityScore: number;
    formatScore: number;
    aiAgreementScore: number;
    consistencyScore: number;
    rawScore: number;
    penaltyCap: number;
    finalScore: number;
  };
  improvements: {
    fieldsNormalized: number;
    fieldsCorrected: number;
  };
  timestamp: Date;
  correlationId?: string;
}
```

### ResumeConfidenceScoringFailed

Published when Stage 4 fails after all retries.

```ts
interface ResumeConfidenceScoringFailedPayload extends UaipEventPayload {
  processingId: string;
  errorMessage: string;
  reason: 'no_sections' | 'no_entities' | 'ai_exhausted' | 'malformed_response' | 'unknown';
  timestamp: Date;
  correlationId?: string;
}
```

---

## 10. Error Handling

| Failure Mode | Behavior |
|--------------|----------|
| No sections in `rawCandidateFields` | Publish `ResumeConfidenceScoringFailed` with `NEEDS_REINDEX` |
| No entities in `rawCandidateFields` | Publish `ResumeConfidenceScoringFailed` with `NEEDS_REINDEX` |
| AI providers exhausted | Graceful degradation to heuristic-only scoring |
| Invalid score calculation | Clamp to `[0.0, 1.0]`, log warning |
| Queue retry | Stage checks `ResumeParseResult.confidenceScore` for idempotency; if already set, skip recomputation |

### Retry Semantics

- Backoff: 1s, 2s, 4s
- Max attempts: 3
- AI fallback is NOT a retry — it's part of the same attempt
- If the entire stage fails after all retries, `ResumeParseDeadLetter` is published

---

## 11. Multi-Tenant Safety

- All reads/writes scope by `processingId`
- `organizationId` inherited from parent `ResumeParseResult`
- No separate collection needed
- All queries include `organizationId` filter

---

## 12. Interfaces

### ResumeConfidenceScorerInput

```ts
interface ResumeConfidenceScorerInput {
  processingId: string;
  rawCandidateFields: Record<string, any>;
  sectionDetectionStrategy: string;
  entityExtractionStrategy: string;
  aiProviderUsed: string;
  failedOver: boolean;
  extractionIssues: Array<{
    severity: string;
    code: string;
    message: string;
    section?: string;
  }>;
}
```

### ResumeConfidenceScorerOutput

```ts
interface ResumeConfidenceScorerOutput {
  confidenceScore: number;
  reviewStatus: 'AUTO_APPROVED' | 'PENDING_REVIEW' | 'NEEDS_REINDEX';
  strategy: 'heuristic' | 'heuristic+ai' | 'ai-only';
  aiFallbackUsed: boolean;
  confidenceSummary: {
    sectionScore: number;
    entityScore: number;
    formatScore: number;
    aiAgreementScore: number;
    consistencyScore: number;
    rawScore: number;
    penaltyCap: number;
    finalScore: number;
  };
  improvements: {
    fieldsNormalized: number;
    fieldsCorrected: number;
  };
}
```

---

## 13. Implementation Files

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

## 14. Testing Strategy

### Unit Tests (12+)

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

### Integration Tests

| Test | Target |
|------|--------|
| End-to-end: Stage 3 → Stage 4 → confidence score | Full async flow |
| Dispatcher routing | `confidence_scoring` stage handled |
| Event publishing | `ResumeConfidenceScored` emitted |

---

## 15. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| AI agreement scoring complexity | Medium | Medium | Define clear comparison logic; fallback to entityScore |
| Penalty cap precedence ambiguity | Low | Medium | Document exact precedence in code comments |
| Performance with large entity sets | Medium | Low | Batch processing; avoid nested loops |
| Score calculation errors | Low | High | Comprehensive unit tests; clamp all outputs |
| Retry causes duplicate scoring | Low | Low | Idempotency guard via confidenceScore check |

---

## 16. Acceptance Criteria

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

## 17. Definition of Done

- [ ] `ResumeConfidenceScorer` service created and unit tested (12+ tests)
- [ ] 5-component formula implemented
- [ ] Penalty caps implemented
- [ ] `reviewStatus` determination implemented
- [ ] Dispatcher `confidence_scoring` handler implemented
- [ ] `UaipEvents` extended with `ResumeConfidenceScored`, `ResumeConfidenceScoringFailed`
- [ ] Idempotency guard implemented
- [ ] Error handling + retry semantics tested
- [ ] 12+ new tests pass
- [ ] No regressions (baseline: 461 tests)
- [ ] TypeScript compiles cleanly
- [ ] Architecture v1.7 changelog updated
- [ ] Code review passed
- [ ] Merge to `main`

---

## 18. Migration Impact

- No database schema changes required
- Backward compatible with existing `ResumeParseResult` documents
- New stage is opt-in via queue routing
- `confidenceScore` field already exists in model

---

## 19. Rollback Strategy

If Stage 4 causes issues:
1. Disable `confidence_scoring` routing in dispatcher
2. Jobs will fail and dead-letter after 3 retries
3. No data loss — Stage 3 entities remain in `rawCandidateFields`
4. Rollback to Sprint 5 state: remove `confidence_scoring` case from dispatcher

---

## 20. Sprint Boundaries

### Stage 3 Output → Stage 4 Input

| Stage 3 Output | Stage 4 Input | Used For |
|----------------|---------------|----------|
| `rawCandidateFields.entities` | Entity list | `entityScore`, `consistencyScore` |
| `rawCandidateFields.sections` | Section list | `sectionScore` |
| `entityExtractionStrategy` | Strategy field | `aiAgreementScore` |
| `sectionDetectionStrategy` | Strategy field | Penalty cap |
| `failedOver` | Boolean flag | Penalty cap |
| `extractionIssues` | Issue array | Penalty cap |
| `aiProviderUsed` | Provider name | Metadata |

### Stage 4 Output → Stage 5 Input

| Stage 4 Output | Stage 5 Input | Used For |
|----------------|---------------|----------|
| `confidenceScore` | Document confidence | DIC routing |
| `reviewStatus` | Review queue | DIC workflow |
| `confidenceSummary` | Analytics | Monitoring |
| `extractionIssues` | Issue tracking | DIC UI |

---

*Sprint 6 plan ready for review on 2026-07-25.*
