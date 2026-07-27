# Sprint 5 Plan
## Resume Parser — ResumeAIEnhancer (Stage 3)

**Sprint:** 5  
**Date:** 2026-07-25  
**Status:** PLANNING — Ready for Review  
**Architecture Baseline:** `RESUME-PARSER-ARCHITECTURE.md` v1.5  
**Tag Baseline:** `v0.4.0`

---

## 1. Objectives

Implement `ResumeAIEnhancer`, Stage 3 of the resume-specific parsing pipeline. This service enhances raw extracted entities from Stage 2 using AI to improve accuracy, fill missing fields, normalize values, and enrich entity data before confidence scoring in Stage 4.

**Outcome:** After Stage 2 extracts entities, `ResumeEntityExtractionListener` enqueues `ResumeAIEnhancerJob` through `KnowledgeQueueService`. The enhancer returns enriched entities with improved confidence and populates `ResumeParseResult.rawCandidateFields`.

---

## 2. Scope

### In Scope

- `ResumeAIEnhancer` stateless service
- AI enhancement of all 8 entity types
- Entity normalization and enrichment
- Null/missing field completion via AI
- Confidence score adjustment
- Dispatcher `ai_enhancement` handler
- `ResumeAIEnhanced` / `ResumeAIEnhancementFailed` events
- Idempotency guard
- Unit tests (12+)

### Out of Scope

- `ResumeConfidenceScorer` (Stage 4)
- DIC integration
- Canonical model writes
- Frontend changes
- API changes
- Entity deduplication (already done in Stage 2)
- New AI providers or model training

---

## 3. Architecture Impact

**Architecture version:** v1.6 (Sprint 5)

### v1.6 Changes

- Added Stage 3: Resume AI Enhancement
- Added `ResumeAIEnhancer` as independent stateless service
- Added AI enrichment rules for 8 entity types
- Added `ResumeAIEnhanced` / `ResumeAIEnhancementFailed` events
- Extended `KnowledgeDispatcher` with `ai_enhancement` stage
- Added entity normalization and enrichment pipeline
- Added confidence score adjustment post-enhancement

---

## 4. Dependencies

| Dependency | Source | Purpose |
|------------|--------|---------|
| `ResumeEntityExtractor` output | Stage 2 | Input: `ResumeParseResult.rawCandidateFields.entities` |
| `ResumeParseResult` | Model | Read/write enriched entities |
| `IAIProvider` / `FailoverAIProvider` | AI layer | AI enrichment fallback |
| `KnowledgeDispatcher` | Infrastructure | Stage routing |
| `KnowledgeQueueService` | Infrastructure | Job enqueue/dequeue |
| `EventBus` / `UaipEvents` | Events | Publish stage outcome |
| `AuditEntry` | Model | Audit logging |

**No new npm dependencies required.**

---

## 5. AI Enhancement Flow

```
Stage 2 completes:
  ResumeParseResult.rawCandidateFields.entities = [...]

Stage 3: ResumeAIEnhancer
  For each entity:
    1. Identify missing fields
    2. Apply normalization rules
    3. If confidence < threshold OR missing critical fields:
       - Invoke AI fallback to enrich/fix entity
    4. Recompute confidence score
    5. Validate enriched entity against schema

After all entities processed:
  - Deduplicate again (AI may introduce new overlaps)
  - Update ResumeParseResult with enriched entities
  - Publish ResumeAIEnhanced or ResumeAIEnhancementFailed
```

---

## 6. Enhancement Rules by Entity Type

### 6.1 Person

| Field | Enhancement |
|-------|-------------|
| `name` | Normalize casing (Title Case) |
| `email` | Validate email format; lowercase |
| `phone` | Normalize to E.164 format if possible |
| `linkedin` | Validate URL format |
| `github` | Validate URL format |
| `summary` | AI can rewrite/condense if present |

### 6.2 Experience

| Field | Enhancement |
|-------|-------------|
| `title` | Normalize title casing; expand abbreviations |
| `company` | Normalize company name casing |
| `startDate` / `endDate` | Normalize to ISO 8601 |
| `current` | Infer from date text if missing |
| `description` | AI can improve grammar/formatting |
| `bullets` | AI can fix typos, expand abbreviations |

### 6.3 Education

| Field | Enhancement |
|-------|-------------|
| `degree` | Expand abbreviations (B.Tech → Bachelor of Technology) |
| `institution` | Normalize university name |
| `startDate` / `endDate` | Normalize to ISO 8601 |
| `gpa` | Convert to 4.0 scale if out of 10 |

### 6.4 Skill

| Field | Enhancement |
|-------|-------------|
| `name` | Normalize to canonical form (JS → JavaScript) |
| `category` | AI can infer category if missing |
| `proficiency` | AI can infer from context if missing |

### 6.5 Project

| Field | Enhancement |
|-------|-------------|
| `name` | Normalize casing |
| `description` | AI can improve grammar/formatting |
| `techStack` | Normalize tool names; expand abbreviations |

### 6.6 Certification

| Field | Enhancement |
|-------|-------------|
| `title` | Normalize certification name |
| `issuer` | Normalize issuer name |
| `issueDate` / `expiryDate` | Normalize to ISO 8601 |
| `credentialId` | Validate format if present |

### 6.7 Achievement

| Field | Enhancement |
|-------|-------------|
| `title` | Normalize casing |
| `description` | AI can improve formatting |
| `date` | Normalize to ISO 8601 |

### 6.8 Language

| Field | Enhancement |
|-------|-------------|
| `name` | Normalize language name |
| `proficiency` | Normalize to standard values (native, fluent, conversational, basic) |

---

## 7. AI Fallback Trigger

Trigger conditions for AI enhancement:
- Entity confidence < 0.7
- Critical field missing (e.g., experience without company, education without institution)
- Field value fails validation (e.g., invalid email, malformed date)
- Normalization ambiguity (e.g., degree abbreviation could expand multiple ways)

**AI fallback is inside the SAME queue attempt.** It does not consume a retry.

### AI Prompt Template

```
You are a resume entity enhancer. Improve the following entity by filling missing fields, normalizing values, and correcting errors.

Entity type: {type}
Current data:
{currentData}

Expected schema for this entity type:
{expectedSchema}

Return ONLY a valid JSON object with the improved entity:
{
  "type": "experience",
  "data": {
    "title": "Senior Backend Engineer",
    "company": "TechCorp Inc.",
    ...
  },
  "confidence": 0.9
}

Rules:
- Preserve existing correct values
- Normalize dates to ISO 8601 (YYYY-MM-DD)
- Normalize names to Title Case
- Do NOT invent data not present in the original entity
- If no improvements possible, return the original entity unchanged
```

---

## 8. Event Contracts

### ResumeAIEnhanced

Published when Stage 3 completes successfully.

```ts
interface ResumeAIEnhancedPayload extends UaipEventPayload {
  processingId: string;
  entitiesEnhanced: number;
  strategy: 'normalized' | 'normalized+ai' | 'ai-only';
  aiFallbackUsed: boolean;
  entityTypes: string[];
  confidenceSummary: {
    before: { min: number; max: number; average: number };
    after: { min: number; max: number; average: number };
    improved: number;
    degraded: number;
  };
  reviewStatus: 'AUTO_APPROVED' | 'PENDING_REVIEW' | 'NEEDS_REINDEX';
  timestamp: Date;
  correlationId?: string;
}
```

### ResumeAIEnhancementFailed

Published when Stage 3 fails after all retries.

```ts
interface ResumeAIEnhancementFailedPayload extends UaipEventPayload {
  processingId: string;
  errorMessage: string;
  reason: 'no_entities' | 'ai_exhausted' | 'malformed_response' | 'unknown';
  timestamp: Date;
  correlationId?: string;
}
```

---

## 9. Error Handling

| Failure Mode | Behavior |
|--------------|----------|
| No entities in `ResumeParseResult` | Use `rawCandidateFields.rawContent` fallback; if still empty, publish `ResumeAIEnhancementFailed` with `NEEDS_REINDEX` |
| AI providers exhausted | Publish `ResumeAIEnhancementFailed`, set `reviewStatus: 'NEEDS_REINDEX'` |
| Invalid enriched entity from AI | Log warning, skip malformed entity, keep original |
| Queue retry | Stage checks `ResumeParseResult.aiEnhanced` for idempotency; if already set, skip recomputation |
| Partial enhancement failure | Publish `ResumeAIEnhanced` with warning; set `reviewStatus: 'PENDING_REVIEW'` |

### Retry Semantics

- Backoff: 1s, 2s, 4s
- Max attempts: 3
- AI fallback is NOT a retry — it's part of the same attempt
- If the entire stage fails after all retries, `ResumeParseDeadLetter` is published

---

## 10. Multi-Tenant Safety

- Entities remain embedded in `ResumeParseResult.rawCandidateFields`
- No separate collection needed
- Org isolation inherited from parent `ResumeParseResult.organizationId`
- All queries scope by `processingId` + `organizationId`

---

## 11. Interfaces

### ResumeAIEnhancerInput

```ts
interface ResumeAIEnhancerInput {
  entities: ResumeEntity[];
  rawText?: string;
}
```

### ResumeAIEnhancerOutput

```ts
interface ResumeAIEnhancerOutput {
  entities: ResumeEntity[];
  strategy: 'normalized' | 'normalized+ai' | 'ai-only';
  aiFallbackUsed: boolean;
  improvements: {
    fieldsAdded: number;
    fieldsNormalized: number;
    fieldsCorrected: number;
  };
}
```

---

## 12. Implementation Files

### Files to Create

| File | Purpose |
|------|---------|
| `src/services/resume/resumeAIEnhancer.service.ts` | Stateless AI enhancement service |
| `src/__tests__/resumeAIEnhancer.service.test.ts` | Unit tests |

### Files to Modify

| File | Changes |
|------|---------|
| `src/shared/services/knowledgeDispatcher.service.ts` | Implement `handleResumeAIEnhancement()` |
| `src/events/UaipEvents.ts` | Add `ResumeAIEnhanced`, `ResumeAIEnhancementFailed` |
| `backend/RESUME-PARSER-ARCHITECTURE.md` | Update changelog to v1.6 |

---

## 13. Testing Strategy

### Unit Tests (12+)

| Test | Target |
|------|--------|
| Person field normalization | Name, email, phone normalized |
| Experience date normalization | Dates converted to ISO 8601 |
| Education degree expansion | Abbreviations expanded |
| Skill name normalization | JS → JavaScript |
| AI enrichment trigger | Mock provider called when confidence < 0.7 |
| AI enrichment response | Validated against schema |
| Missing field completion | Null fields filled by AI |
| Idempotency | Re-dequeue skips if already enhanced |
| Error: no entities | Publishes failure event |
| Error: AI exhaustion | Publishes failure with NEEDS_REINDEX |
| Confidence adjustment | Scores recomputed after enhancement |
| Malformed AI response | Original entity preserved |

### Integration Tests

| Test | Target |
|------|--------|
| End-to-end: Stage 2 → Stage 3 → enriched entities | Full async flow |
| Multi-tenant isolation | Org scoping verified |
| Performance: enhancement < 5s for 50 entities | Latency benchmark |

---

## 14. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| AI over-enhancement (invents data) | Medium | High | Strict prompt + runtime validation |
| Entity schema drift | Low | Medium | Validation against expected schema |
| Performance degradation with many entities | Medium | Low | Batch processing + timeout |
| AI provider unavailable | Low | Medium | Graceful fallback to normalized-only |
| Retry causes duplicate enhancement | Low | Low | Idempotency guard |

---

## 15. Acceptance Criteria

1. All 8 entity types can be enhanced via AI
2. Normalization rules applied consistently
3. Missing fields completed when AI is confident
4. Confidence scores adjusted based on enrichment quality
5. Events published with complete payloads
6. Idempotency guard prevents duplicate enhancement
7. 12+ tests pass
8. No regressions from Sprint 4 baseline (437 tests)
9. TypeScript compiles cleanly
10. Code review passed

---

## 16. Definition of Done

- [ ] `ResumeAIEnhancer` service created and unit tested (12+ tests)
- [ ] Enhancement rules implemented for all 8 entity types
- [ ] AI fallback implemented via `FailoverAIProvider`
- [ ] Confidence adjustment implemented
- [ ] Dispatcher `ai_enhancement` handler implemented
- [ ] `UaipEvents` extended with `ResumeAIEnhanced`, `ResumeAIEnhancementFailed`
- [ ] Idempotency guard implemented
- [ ] Error handling + retry semantics tested
- [ ] 12+ new tests pass
- [ ] No regressions (baseline: 437 tests)
- [ ] TypeScript compiles cleanly
- [ ] Architecture v1.6 changelog updated
- [ ] Code review passed
- [ ] Merge to `main`

---

## 17. Migration Impact

- No database schema changes required
- No migration scripts needed
- Backward compatible with existing `ResumeParseResult` documents
- New stage is opt-in via queue routing

---

## 18. Rollback Strategy

If Stage 3 causes issues:
1. Disable `ai_enhancement` routing in dispatcher
2. Jobs will fail and dead-letter after 3 retries
3. No data loss — Stage 2 entities remain in `rawCandidateFields`
4. Rollback to Sprint 4 state: remove `ai_enhancement` case from dispatcher

---

*Sprint 5 plan ready for review on 2026-07-25.*
