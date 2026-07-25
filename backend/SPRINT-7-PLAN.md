# Sprint 7 Plan
## Resume Parser — DIC Integration & Canonical Model Writes (Stages 5-6)

**Sprint:** 7  
**Date:** 2026-07-25  
**Status:** PLANNING — Fixes Applied  
**Architecture Baseline:** `RESUME-PARSER-ARCHITECTURE.md` v1.7  
**Tag Baseline:** `v0.6.0`

---

## 1. Objectives

Implement the final two stages of the resume-specific parsing pipeline:

- **Stage 5:** DIC Integration — route `ResumeParseResult` documents to the Document Intelligence Center based on `reviewStatus`, handle auto-approval, human review queue, and re-upload flows.
- **Stage 6:** Canonical Model Writes — write approved resume data to existing canonical Mongoose models (`Person`, `ExperienceRecord`, `AcademicRecord`, `SkillEvidence`, `CertificateRecord`, `CareerRecord`) with idempotency and person deduplication.

**Outcome:** After Stage 4 computes confidence, Stage 5 routes the document to DIC. Upon human approval or auto-approval, Stage 6 writes structured resume data to canonical collections, completing the resume parsing pipeline.

---

## 2. Scope

### In Scope

- Stage 5: DIC Integration
  - `ResumeParseResult` → DIC routing based on `reviewStatus`
  - Auto-approval flow for `AUTO_APPROVED`
  - Human review queue for `PENDING_REVIEW`
  - Re-upload flow for `NEEDS_REINDEX`
  - DIC approval/rejection event handling
  - DIC routing metadata
- Stage 6: Canonical Model Writes
  - Person deduplication before write
  - Mapping resume entities → canonical models
  - Idempotent writes via `processingId` check
  - `ResumeParseResult` status update after write
  - Event publishing on completion/failure
- Dispatcher `dic_integration` and `canonical_write` handlers
- `ResumeDICRouted` / `ResumeDICRoutingFailed` events
- `ResumeCanonicalWritten` / `ResumeCanonicalWriteFailed` events
- Idempotency guards
- Unit tests (12+)
- Integration tests (3)

### Out of Scope

- DIC UI implementation
- Frontend changes
- API changes for DIC module
- New canonical models
- Person matching algorithm redesign
- OCR or parsing logic changes

---

## 3. Architecture Impact

**Architecture version:** v1.8 (Sprint 7)

### v1.8 Changes

- Added Stage 5: DIC Integration
- Added Stage 6: Canonical Model Writes
- Added resume-specific DIC routing logic
- Added person deduplication strategy for resumes
- Added canonical model mapping rules
- Added `ResumeDICRouted`, `ResumeDICRoutingFailed`, `ResumeCanonicalWritten`, `ResumeCanonicalWriteFailed` events
- Extended `KnowledgeDispatcher` with `dic_integration` and `canonical_write` stages
- Added `ResumeParseResult.dicRoutedAt` and `ResumeParseResult.canonicalWrittenAt` timestamps

---

## 4. Dependencies

| Dependency | Source | Purpose |
|------------|--------|---------|
| `ResumeParseResult` | Stage 4 | Input: confidenceScore, reviewStatus, rawCandidateFields |
| `KnowledgeRecord` | Generic pipeline | Read candidateFields for canonical writes |
| `DocumentIntelligenceService` | Existing DIC module | DIC routing and status updates |
| `Person` model | Canonical | Person deduplication and writes |
| `ExperienceRecord` model | Canonical | Experience writes |
| `AcademicRecord` model | Canonical | Education writes |
| `SkillEvidence` model | Canonical | Skill writes |
| `CertificateRecord` model | Canonical | Certification writes |
| `CareerRecord` model | Canonical | Project writes |
| `EventBus` / `UaipEvents` | Events | Publish stage outcomes |
| `AuditEntry` | Model | Audit logging |

**No new npm dependencies required.**

---

## 5. Stage 5: DIC Integration

### Responsibilities

- Subscribe to `ResumeParseCompleted` event from Stage 4
- Read `ResumeParseResult` documents by `reviewStatus`
- Route documents to DIC queues:
  - `AUTO_APPROVED` → direct canonical write queue (Stage 6)
  - `PENDING_REVIEW` → DIC human review queue
  - `NEEDS_REINDEX` → notification + re-upload flow
- Handle DIC reviewer actions:
  - `APPROVED` → enqueue Stage 6
  - `REJECTED` → update `ResumeParseResult.reviewStatus`, notify user
  - `ROLLBACK` → reset to `PENDING_REVIEW`
- Emit DIC routing events

### Input

```ts
interface DicIntegrationInput {
  processingId: string;
  organizationId: string;
  reviewStatus: 'AUTO_APPROVED' | 'PENDING_REVIEW' | 'NEEDS_REINDEX';
  confidenceScore: number;
  rawCandidateFields: Record<string, any>;
  extractionIssues: Array<{ severity: string; code: string; message: string }>;
}
```

### Output

```ts
interface DicIntegrationOutput {
  routedToDIC: boolean;
  dicDocumentId?: string;
  action: 'auto_approved' | 'queued_review' | 'needs_reindex' | 'approved' | 'rejected' | 'rollback';
}
```

### DIC Routing Rules

| `reviewStatus` | Action | Next Stage |
|----------------|--------|-----------|
| `AUTO_APPROVED` | Auto-approve in DIC, enqueue canonical write | Stage 6 immediately |
| `PENDING_REVIEW` | Add to DIC review queue | Stage 6 on human approval |
| `NEEDS_REINDEX` | Notify user, request re-upload | None until re-upload |

---

## 6. Stage 6: Canonical Model Writes

### Responsibilities

- Map resume entities to canonical Mongoose models
- Perform person deduplication before writes
- Write data idempotently using `processingId` guard
- Update `ResumeParseResult` after successful writes
- Emit completion/failure events

### Canonical Model Mapping

| Resume Entity | Canonical Model | Mapping |
|---------------|-----------------|---------|
| `person` (HEADER) | `Person` | name, email, phone, linkedin, github |
| `experience` entries | `ExperienceRecord` | title, company, startDate, endDate, description |
| `education` entries | `AcademicRecord` | degree, institution, startDate, endDate, gpa |
| `skill` entries | `SkillEvidence` | name, category, proficiency |
| `certification` entries | `CertificateRecord` | title, issuer, issueDate, expiryDate |
| `project` entries | `CareerRecord` | name, description, techStack |
| `achievement` entries | `CareerRecord` | title, description, date |
| `language` entries | `Person` (languages field) | name, proficiency |

### Person Deduplication Strategy

Before creating a new `Person`, compute multi-signal matches within the same `organizationId`:

| Signal | Algorithm | Threshold |
|--------|-----------|-----------|
| `email` | Exact match (lowercase normalized) | exact |
| `phone` | Exact match (E.164 normalized) | exact |
| `name+jaro` | Jaro-Winkler on `primaryName` | `>= 0.92` |
| `institution` | Fuzzy match on existing `AcademicRecord` institution names | `>= 0.85` |

**Decision formula:**

```ts
const emailMatch = normalizeEmail(rawEmail) === normalizeEmail(existingEmail);
const phoneMatch = normalizePhone(rawPhone) === normalizePhone(existingPhone);
const nameScore = jaroWinkler(rawName, existingName);
const institutionScore = jaroWinkler(rawInstitution, existingInstitution);

const isDuplicate =
  emailMatch ||
  phoneMatch ||
  (nameScore >= 0.92 &&
    (emailMatch || phoneMatch || institutionScore >= 0.85));
```

**If duplicate:**
- Reuse existing `Person`
- Create `ResumePersonSuggestion` for audit/override with `matchConfidence`, `matchBasis`, `isNewPerson = false`

**If not duplicate:**
- Create new `Person`
- Create `ResumePersonSuggestion` with `isNewPerson = true`

### Idempotency

- Each canonical write checks `ResumeParseResult.canonicalWrittenAt`
- If already set, skip recomputation
- Uses existing `processingId` as idempotency key

### Input

```ts
interface CanonicalWriteInput {
  processingId: string;
  organizationId: string;
  userId: string;
  personId?: string;
  rawCandidateFields: Record<string, any>;
  reviewStatus: string;
  confidenceScore: number;
}
```

### Output

```ts
interface CanonicalWriteOutput {
  success: boolean;
  personId?: string;
  recordsWritten: number;
  recordsSkipped: number;
  strategy: 'new_person' | 'existing_person' | 'merged';
}
```

---

## 7. Event Contracts

### ResumeDICRouted

```ts
interface ResumeDICRoutedPayload extends UaipEventPayload {
  processingId: string;
  action: 'auto_approved' | 'queued_review' | 'needs_reindex';
  dicDocumentId?: string;
  timestamp: Date;
  correlationId?: string;
}
```

### ResumeDICRoutingFailed

```ts
interface ResumeDICRoutingFailedPayload extends UaipEventPayload {
  processingId: string;
  errorMessage: string;
  reason: 'dic_unavailable' | 'invalid_status' | 'unknown';
  timestamp: Date;
  correlationId?: string;
}
```

### ResumeCanonicalWritten

```ts
interface ResumeCanonicalWrittenPayload extends UaipEventPayload {
  processingId: string;
  personId: string;
  recordsWritten: number;
  recordsSkipped: number;
  strategy: 'new_person' | 'existing_person' | 'merged';
  timestamp: Date;
  correlationId?: string;
}
```

### ResumeCanonicalWriteFailed

```ts
interface ResumeCanonicalWriteFailedPayload extends UaipEventPayload {
  processingId: string;
  errorMessage: string;
  reason: 'person_dedup_failed' | 'write_error' | 'validation_error' | 'unknown';
  timestamp: Date;
  correlationId?: string;
}
```

---

## 8. Error Handling

| Failure Mode | Behavior |
|--------------|----------|
| DIC unavailable | Retry with backoff; if exhausted, mark `NEEDS_REINDEX` |
| Person deduplication ambiguous | Create `ResumePersonSuggestion`, route to DIC |
| Canonical write validation error | Rollback transaction, log error, retry |
| Duplicate canonical write | Idempotency guard skips recomputation |
| Queue retry | Stage checks `ResumeParseResult.dicRoutedAt` / `canonicalWrittenAt` for idempotency |

### Retry Semantics

- Backoff: 1s, 2s, 4s
- Max attempts: 3
- DIC and canonical writes are retryable
- If exhausted, `ResumeParseDeadLetter` is published

---

## 9. Multi-Tenant Safety

- All reads/writes scope by `processingId` + `organizationId`
- Person deduplication scoped to `organizationId`
- No cross-tenant data leakage

---

## 10. Interfaces

### DicIntegrationService

```ts
interface DicIntegrationInput {
  processingId: string;
  organizationId: string;
  reviewStatus: string;
  confidenceScore: number;
  rawCandidateFields: Record<string, any>;
  extractionIssues: Array<{ severity: string; code: string; message: string }>;
}

interface DicIntegrationOutput {
  routedToDIC: boolean;
  dicDocumentId?: string;
  action: 'auto_approved' | 'queued_review' | 'needs_reindex' | 'approved' | 'rejected' | 'rollback';
}
```

### CanonicalWriteService

```ts
interface CanonicalWriteInput {
  processingId: string;
  organizationId: string;
  userId: string;
  personId?: string;
  rawCandidateFields: Record<string, any>;
  reviewStatus: string;
  confidenceScore: number;
}

interface CanonicalWriteOutput {
  success: boolean;
  personId?: string;
  recordsWritten: number;
  recordsSkipped: number;
  strategy: 'new_person' | 'existing_person' | 'merged';
}
```

---

## 11. Implementation Files

### Files to Create

| File | Purpose |
|------|---------|
| `src/services/resume/dicIntegration.service.ts` | Stage 5: DIC routing service |
| `src/services/resume/canonicalWrite.service.ts` | Stage 6: Canonical model write service |
| `src/__tests__/dicIntegration.service.test.ts` | Unit tests for Stage 5 |
| `src/__tests__/canonicalWrite.service.test.ts` | Unit tests for Stage 6 |

### Files to Modify

| File | Changes |
|------|---------|
| `src/shared/services/knowledgeDispatcher.service.ts` | Implement `handleResumeDicIntegration()` and `handleResumeCanonicalWrite()` |
| `src/events/UaipEvents.ts` | Add 4 new events |
| `src/models/ResumeParseResult.ts` | Add `dicRoutedAt`, `canonicalWrittenAt`, `dicDocumentId` |
| `src/models/ResumePersonSuggestion.ts` | Update/extend if needed |

---

## 12. Testing Strategy

### Unit Tests (12+)

| Test | Target |
|------|--------|
| DIC routing: AUTO_APPROVED | Enqueues Stage 6 immediately |
| DIC routing: PENDING_REVIEW | Adds to DIC review queue |
| DIC routing: NEEDS_REINDEX | Notifies user, no Stage 6 enqueue |
| DIC event emission | Correct event published |
| Person deduplication: email match | Reuses existing Person |
| Person deduplication: phone match | Reuses existing Person |
| Person deduplication: name+institution match | Reuses existing Person per architecture formula |
| Canonical write: Person | Person created/updated correctly |
| Canonical write: ExperienceRecord | Experience entries written |
| Canonical write: AcademicRecord | Education entries written |
| Canonical write: SkillEvidence | Skills normalized and written |
| Idempotency: re-dequeue | Skips if already written |
| Error: DIC unavailable | Publishes failure event |
| Error: write validation | Publishes failure event |

### Integration Tests (3)

| Test | Target |
|------|--------|
| End-to-end: Stage 4 → Stage 5 → Stage 6 | Full async flow |
| Dispatcher routing | `dic_integration` and `canonical_write` stages handled |
| Event publishing | All 4 new events emitted |

---

## 13. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Person deduplication false positives | Medium | High | Multi-signal matching; DIC reviewer override |
| Canonical model schema drift | Low | Medium | Validate against existing model interfaces |
| DIC module coupling | Medium | Medium | Keep Stage 5 as thin adapter over DIC |
| Write performance with large datasets | Medium | Low | Batch writes; connection pooling |
| Partial write failure | Low | High | Transactional writes; rollback on error |

---

## 14. Acceptance Criteria

1. Stage 5 routes `ResumeParseResult` to DIC based on `reviewStatus`
2. `AUTO_APPROVED` resumes proceed to Stage 6 without human intervention
3. `PENDING_REVIEW` resumes enter DIC human review queue
4. `NEEDS_REINDEX` resumes trigger re-upload flow
5. Stage 6 writes resume data to canonical models idempotently
6. Person deduplication prevents duplicate `Person` records
7. Events published with complete payloads
8. Idempotency guards prevent duplicate DIC routing or canonical writes
9. 12+ tests pass
10. No regressions from Sprint 6 baseline (495 tests)
11. TypeScript compiles cleanly
12. Code review passed

---

## 15. Definition of Done

- [ ] `DicIntegrationService` created and unit tested (6+ tests)
- [ ] `CanonicalWriteService` created and unit tested (6+ tests)
- [ ] DIC routing logic implemented
- [ ] Canonical model mapping implemented
- [ ] Person deduplication implemented
- [ ] Dispatcher `dic_integration` and `canonical_write` handlers implemented
- [ ] `UaipEvents` extended with 4 new events
- [ ] Idempotency guards implemented
- [ ] Error handling + retry semantics tested
- [ ] 12+ new tests pass
- [ ] No regressions (baseline: 495 tests)
- [ ] TypeScript compiles cleanly
- [ ] Architecture v1.8 changelog updated
- [ ] Code review passed
- [ ] Merge to `main`

---

## 16. Migration Impact

- No database schema changes required for existing canonical models
- `ResumeParseResult` extended with 3 new optional fields
- `ResumePersonSuggestion` model may need to be created
- Backward compatible with existing documents

---

## 17. Rollback Strategy

If Stage 5 or 6 causes issues:
1. Disable `dic_integration` and `canonical_write` routing in dispatcher
2. Jobs will fail and dead-letter after 3 retries
3. No data loss — `ResumeParseResult` and `KnowledgeRecord` remain intact
4. Rollback to Sprint 6 state: remove dispatcher cases

---

## 18. Stage Boundaries

### Stage 5 Output → Stage 6 Input

| Stage 5 Output | Stage 6 Input | Used For |
|----------------|---------------|----------|
| `dicDocumentId` | DIC approval reference | Audit trail |
| `reviewStatus: AUTO_APPROVED` | Write gate | Only approved docs are written |
| `rawCandidateFields` | Entity data | Mapping to canonical models |
| `organizationId` | Tenant scope | Multi-tenant writes |

### Stage 6 Output → Downstream

| Stage 6 Output | Downstream | Used For |
|----------------|-----------|----------|
| `personId` | Person module | Profile lookup |
| `recordsWritten` | Analytics | Pipeline success metrics |
| `strategy` | Audit trail | New vs merged person |

---

## 19. Sprint Boundaries

Stage 5 and Stage 6 are closely coupled but separable:
- Stage 5 can be tested independently with mocked DIC responses
- Stage 6 can be tested independently with mocked canonical models
- Both use the same `ResumeParseResult` as source of truth

---

*Sprint 7 plan ready for review on 2026-07-25.*
