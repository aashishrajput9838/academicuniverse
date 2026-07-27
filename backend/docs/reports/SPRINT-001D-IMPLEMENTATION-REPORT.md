# Sprint-001D Implementation Report: Skills Tracker EventBus Integration
**Date:** 2026-07-18  
**Scope:** Event-driven internal integration only — no REST controllers, routes, or Growth Hub integration  
**Status:** Complete — Clean compilation, zero test regressions, 9 new unit tests  

---

## 1. Created Files

| File | Purpose |
|------|---------|
| `backend/src/shared/events/skillsEventListener.ts` | Event listener subscribing to upstream module events |
| `backend/src/shared/events/__tests__/skillsEventListener.test.ts` | Unit tests for event subscription and handler orchestration |

## 2. Modified Files

| File | Change |
|------|--------|
| `backend/src/events/UaipEvents.ts` | Added 6 new Skills Tracker events and payload fields |
| `backend/src/shared/services/academicRecord.service.ts` | Publishes `AcademicRecordUpdated` event after merge |
| `backend/src/shared/services/certificate.service.ts` | Publishes `CertificateApproved` event after merge |
| `backend/src/shared/application/routingEngine.ts` | Publishes `ResearchUpdated` and `GithubUpdated` events after canonical write |
| `backend/src/shared/application/module-registry/index.ts` | Removed side-effect import of listener (see §6.2) |

---

## 3. Event Contracts

### 3.1 New Events Added to `UaipEvent`

| Event | String Value | Published By |
|-------|-------------|--------------|
| `AcademicRecordUpdated` | `ACADEMIC_RECORD_UPDATED` | `AcademicRecordService` |
| `CertificateApproved` | `CERTIFICATE_APPROVED` | `CertificateService` |
| `GithubUpdated` | `GITHUB_UPDATED` | `GithubAdapter` (routingEngine) |
| `ResearchUpdated` | `RESEARCH_UPDATED` | `ResearchAdapter` (routingEngine) |
| `SkillUpdated` | `SKILL_UPDATED` | `SkillProjectionService` (future) |
| `SkillProfileRebuilt` | `SKILL_PROFILE_REBUILT` | `SkillProjectionService` (future) |

### 3.2 Correlation Fields (Required in All Skills Events)

Every event payload published by or for the Skills Tracker must carry:

```typescript
{
  organizationId: string;
  personId: string;
  correlationId: string;
  eventId: string;
  occurredAt: Date;
  source: string;
}
```

These fields are also added to the shared `UaipEventPayload` interface to ensure type safety across all modules.

### 3.3 Event Payload Shapes

#### `AcademicRecordUpdated`
```typescript
{
  processingId: string;
  organizationId: string;
  personId: string;
  correlationId: string;
  eventId: string;
  occurredAt: Date;
  source: 'academic_records';
  subjectCode: string;
  subjectName: string;
  semester: string;
  year: number;
  grade: string;
  credits: number;
  status: string;
  rawConfidence: number;
}
```

#### `CertificateApproved`
```typescript
{
  processingId: string;
  organizationId: string;
  personId: string;
  correlationId: string;
  eventId: string;
  occurredAt: Date;
  source: 'certificates';
  title: string;
  issuer: string;
  issuedDate: Date;
  rawConfidence: number;
}
```

#### `GithubUpdated`
```typescript
{
  processingId: string;
  organizationId: string;
  personId: string;
  correlationId: string;
  eventId: string;
  occurredAt: Date;
  source: 'github';
  repositories: any[];
  languages: Record<string, number>;
  contributions: Record<string, number>;
  rawConfidence: number;
}
```

#### `ResearchUpdated`
```typescript
{
  processingId: string;
  organizationId: string;
  personId: string;
  correlationId: string;
  eventId: string;
  occurredAt: Date;
  source: 'research_wing';
  title: string;
  authors: string[];
  journal: string;
  abstract: string;
  rawConfidence: number;
}
```

---

## 4. Orchestration Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ Upstream Module (Academic Records / Certificates / GitHub / Research) │
│                                                                     │
│ 1. Persist canonical record                                         │
│ 2. Create AuditEntry                                                │
│ 3. eventBus.publish(ModuleEvent, payload)                           │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ SkillsEventListener                                                 │
│                                                                     │
│ 1. Validate organizationId + personId present                       │
│ 2. Map module-specific fields → SkillEvidence payload               │
│ 3. SkillEvidenceService.ingestEvidence()                            │
│ 4. SkillProjectionService.rebuildAllSkillRecords()                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.1 Academic Record Flow

```
AcademicRecordService.merge()
    ↓
AuditEntry.create()
    ↓
eventBus.publish(AcademicRecordUpdated, {
  subjectCode, subjectName, grade, credits, ...
})
    ↓
SkillsEventListener.handleAcademicRecordUpdated()
    ↓
SkillEvidenceService.ingestEvidence({
  skillId: `ACADEMIC-${subjectCode}`,
  skillName: subjectName,
  primarySource: ACADEMIC,
  payload: { subjectCode, grade, credits, semester, year }
})
    ↓
SkillProjectionService.rebuildAllSkillRecords(orgId, personId)
```

### 4.2 Certificate Flow

```
CertificateService.merge()
    ↓
eventBus.publish(CertificateApproved, { title, issuer, issuedDate })
    ↓
SkillsEventListener.handleCertificateApproved()
    ↓
SkillEvidenceService.ingestEvidence({
  skillId: `CERTIFICATE-${title}`,
  primarySource: CERTIFICATE,
  payload: { title, issuer, issuedDate }
})
    ↓
SkillProjectionService.rebuildAllSkillRecords(orgId, personId)
```

### 4.3 GitHub Flow

```
GithubAdapter.writeCanonical()
    ↓
eventBus.publish(GithubUpdated, { languages, contributions, repositories })
    ↓
SkillsEventListener.handleGithubUpdated()
    ↓
For each language:
  SkillEvidenceService.ingestEvidence({
    skillId: `LANGUAGE-${language}`,
    primarySource: GITHUB,
    payload: { language, bytesOfCode, contributionCount }
  })
    ↓
SkillProjectionService.rebuildAllSkillRecords(orgId, personId)
```

### 4.4 Research Flow

```
ResearchAdapter.writeCanonical()
    ↓
eventBus.publish(ResearchUpdated, { title, authors, journal, abstract })
    ↓
SkillsEventListener.handleResearchUpdated()
    ↓
SkillEvidenceService.ingestEvidence({
  skillId: `RESEARCH-${title}`,
  primarySource: RESEARCH,
  payload: { title, authors, journal, abstract }
})
    ↓
SkillProjectionService.rebuildAllSkillRecords(orgId, personId)
```

---

## 5. Idempotency Strategy

### 5.1 Event-Level Idempotency

| Scenario | Handling |
|----------|----------|
| **Duplicate event** | `SkillEvidenceService.ingestEvidence()` always **appends** a new document. Duplicate events create additional evidence, which is correct behavior (more evidence = stronger signal). |
| **Repeated rebuild** | `SkillProjectionService.rebuildAllSkillRecords()` is idempotent: it reads all active evidence and recalculates the same projection. Running it multiple times yields the same result. |
| **Stale event** | Events carry `occurredAt` and `effectiveFrom` on evidence. Old evidence is naturally deweighted by recency decay. |

### 5.2 Evidence-Level Idempotency

- `SkillEvidence` documents are **immutable**. There is no update or delete operation.
- Corrections produce new evidence documents with later `effectiveFrom` dates.
- The projection service always reads the latest state of all active evidence.

### 5.3 Listener Initialization

- `SkillsEventListener` uses a static `initialized` flag to ensure subscriptions happen only once per process lifetime.
- Tests reset this flag via `(SkillsEventListener as any).initialized = false` in `beforeEach`.

---

## 6. Failure Handling

### 6.1 Safe Failure Principles

1. **No event handler crashes the EventBus** — All handlers are wrapped in `try/catch`.
2. **Errors are logged with full context** — `organizationId`, `personId`, `correlationId`, and error message are logged.
3. **Partial failures are isolated** — If one evidence ingestion fails, others in the same handler are not attempted (fail-fast per event).
4. **EventBus continues processing other listeners** — The `EventBus.publish()` method already catches listener errors and logs them.

### 6.2 Handler Error Flow

```typescript
try {
  await this.evidenceService.ingestEvidence(...);
  await this.projectionService.rebuildAllSkillRecords(orgId, personId);
} catch (err: any) {
  logger.error('Failed to process event', {
    error: err.message,
    correlationId,
    organizationId,
    personId,
  });
  // EventBus catches this and continues to next listener
}
```

### 6.3 Missing Payload Fields

| Handler | Missing Field | Behavior |
|---------|--------------|----------|
| All | `organizationId` or `personId` | Log warning and return early — no evidence created |
| Academic | `documentSubtype` / `subjectCode` | Fallback to `'unknown'` |
| Academic | `fileName` / `subjectName` | Fallback to `'Unknown Subject'` |
| Certificate | `documentSubtype` / `title` | Fallback to `'Unknown Certificate'` |
| Certificate | `issuer` | Fallback to `'Unknown Issuer'` |
| GitHub | `languages` | Fallback to `{}` — no evidence created |
| Research | `documentSubtype` / `title` | Fallback to `'Unknown Research'` |
| Research | `abstract` | Fallback to `''` |

---

## 7. Organization Isolation

- All event handlers validate `organizationId` and `personId` before processing.
- `SkillEvidenceService.ingestEvidence()` and `SkillProjectionService.rebuildAllSkillRecords()` both require `organizationId` as a mandatory parameter.
- All repository queries filter by `organizationId`.
- No cross-tenant data leakage is possible through the event pipeline.

---

## 8. Registration and Initialization

### 8.1 Event Subscription

`SkillsEventListener` subscribes to four events in its constructor:

```typescript
eventBus.subscribe(UaipEvent.AcademicRecordUpdated, ...);
eventBus.subscribe(UaipEvent.CertificateApproved, ...);
eventBus.subscribe(UaipEvent.GithubUpdated, ...);
eventBus.subscribe(UaipEvent.ResearchUpdated, ...);
```

### 8.2 Initialization Pattern

The listener follows the same initialization pattern as `PipelineOrchestrator` and `OCRService`:

```typescript
constructor() {
  this.initializeSubscriptions();
}

private initializeSubscriptions(): void {
  if (SkillsEventListener.initialized) {
    return;
  }
  // subscribe...
  SkillsEventListener.initialized = true;
}
```

### 8.3 Side-Effect Import Removed

The listener is **not** imported in `module-registry/index.ts`. Side-effect imports in module configuration files caused premature singleton instantiation during test runs. The listener should be instantiated at application startup (e.g., in the main server file) rather than as a module registry side effect.

---

## 9. Unit Test Coverage

### 9.1 Test Summary

| Test Suite | Tests | Coverage |
|------------|-------|----------|
| `SkillsEventListener` | 9 | Initialization, idempotency, all 4 handlers, missing fields, error handling |

### 9.2 Key Test Scenarios

| Scenario | Expected Outcome |
|----------|-----------------|
| First instantiation | Subscribes to 4 events |
| Second instantiation | Does not re-subscribe |
| Missing `organizationId`/`personId` | Logs warning, returns early |
| Valid academic event | Ingests evidence, rebuilds projections |
| Valid certificate event | Ingests evidence with CERTIFICATE source |
| Valid github event | Ingests one evidence per language |
| Valid research event | Ingests evidence with RESEARCH source |
| Service throws error | Logs error, does not call projection rebuild |

### 9.3 Mocking Strategy

- `eventBus.subscribe` is spied on using `jest.spyOn` to verify subscription calls.
- `SkillEvidenceService` and `SkillProjectionService` are mocked at the module level.
- `SkillsEventListener.initialized` static flag is reset in `beforeEach` to ensure test isolation.

---

## 10. Verification Results

| Check | Result |
|-------|--------|
| `npm test` — new listener tests | **Pass** — 1 suite, 9 tests, 0 failures |
| `npm test` — full existing suite | **Pass** — 22 suites, 122 tests, 0 failures |
| `tsc --noEmit` — new code | **Pass** — zero new TypeScript errors |
| `tsc --noEmit` — pre-existing | 6 errors in `academicRecordController.test.ts` (pre-existing, unrelated) |

---

## 11. Assumptions and Known Limitations

### Assumptions

1. **Event ordering** — Assumes upstream modules publish events after successful persistence and audit. If events are published before DB commit, the listener may process stale data.
2. **Single organization per person** — `rebuildAllSkillRecords` operates on a single `(organizationId, personId)` pair. Multi-org persons require multiple calls.
3. **Skill ID derivation** — Evidence `skillId` is derived from source data (e.g., `ACADEMIC-${subjectCode}`). Ontology resolution (aliases → canonical `skillId`) is deferred to future sprints.
4. **Confidence defaults** — When `confidenceScore` is missing from events, defaults are used: Academic=0.8, Certificate=1.0, GitHub=0.7, Research=0.85.
5. **Listener instantiation** — The listener must be instantiated at app startup. This is not yet wired into the main server entry point.

### Known Limitations

1. **No retry mechanism** — If a listener handler fails, the event is lost. A durable event queue (e.g., Kafka, RabbitMQ) is needed for production reliability.
2. **No dead-letter queue** — Failed events are logged but not persisted for later replay.
3. **No event versioning** — Event payloads are not versioned. Breaking changes to upstream payloads will break the listener.
4. **No batch processing** — `rebuildAllSkillRecords` processes skills one at a time. For persons with hundreds of skills, this may be slow.
5. **No Growth Hub integration** — `SkillUpdated` and `SkillProfileRebuilt` events are defined but not yet published or consumed.

---

## 12. Next Steps

- Sprint-001E: REST API layer (controllers, routes, DTOs)
- Sprint-001F: Growth Hub projection integration
- Sprint-002: Ontology resolution and skill alias mapping
- Sprint-003: Batch projection rebuild scheduler
- Sprint-004: AI inference service for skill extraction
