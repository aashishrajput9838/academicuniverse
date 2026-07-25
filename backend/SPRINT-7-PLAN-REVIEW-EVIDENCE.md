# Sprint 7 Plan Review — Evidence Report
## Resume Parser — DIC Integration & Canonical Model Writes (Stages 5-6)

**Date:** 2026-07-25  
**Reviewer:** Kilo  
**Scope:** Sprint 7 plan review evidence

---

## Evidence 1: Architecture Correctness

### Baseline: v1.7 → v1.8

Plan proposes v1.8 extending v1.7. No circular dependencies detected.

### Stage Progression Verification

| Stage | Sprint | Status |
|-------|--------|--------|
| 0 | Sprint 2 | DONE |
| 1 | Sprint 3 | DONE |
| 2 | Sprint 4 | DONE |
| 3 | Sprint 5 | DONE |
| 4 | Sprint 6 | DONE |
| 5 | Sprint 7 | PLANNING |
| 6 | Sprint 7 | PLANNING |

**Verdict:** ✅ ARCHITECTURE CORRECT

---

## Evidence 2: Stage 5 Boundaries

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

### Finding 2.1: Trigger Mechanism Undefined (LOW)

**Issue:** Plan does not define how Stage 5 is initiated.

**Expected:** Stage 5 should either:
- Subscribe to `ResumeParseCompleted` event (from Stage 4), OR
- Poll `ResumeParseResult` by `reviewStatus` via scheduler

**Current plan:** Implicit. Section 5 says "Read `ResumeParseResult` documents by `reviewStatus`" but doesn't specify the trigger.

**Impact:** LOW — easy to fix in implementation.

**Fix requirement:** Add explicit trigger definition in plan.

**Verdict:** ⚠️ TRIGGER MECHANISM AMBIGUOUS

---

## Evidence 3: Stage 6 Boundaries

Stage 6 triggers only after approval:
- `AUTO_APPROVED` → immediate Stage 6 enqueue
- `PENDING_REVIEW` → Stage 6 on human approval
- `NEEDS_REINDEX` → no Stage 6

**Verdict:** ✅ BOUNDARIES CLEAR

---

## Evidence 4: Dispatcher Design

### Existing Pattern

From `knowledgeDispatcher.service.ts:234-253`:
```ts
case 'ai_enhancement':
  await this.handleResumeAiEnhancement({...});
  break;
case 'confidence_scoring':
  await this.handleResumeConfidenceScoring({...});
  break;
```

### Plan Alignment

Plan extends same dispatcher with:
```ts
case 'dic_integration':
  await this.handleResumeDicIntegration({...});
  break;
case 'canonical_write':
  await this.handleResumeCanonicalWrite({...});
  break;
```

**Verdict:** ✅ DISPATCHER DESIGN CONSISTENT

---

## Evidence 5: Event Contracts

### 4 Events Defined

| Event | Payload Fields |
|-------|---------------|
| `ResumeDICRouted` | processingId, action, dicDocumentId?, timestamp, correlationId? |
| `ResumeDICRoutingFailed` | processingId, errorMessage, reason, timestamp, correlationId? |
| `ResumeCanonicalWritten` | processingId, personId, recordsWritten, recordsSkipped, strategy, timestamp, correlationId? |
| `ResumeCanonicalWriteFailed` | processingId, errorMessage, reason, timestamp, correlationId? |

All extend `UaipEventPayload`. All include `processingId`, `timestamp`, `correlationId?`.

**Verdict:** ✅ EVENT CONTRACTS COMPLETE

---

## Evidence 6: Person Deduplication Strategy

### Architecture v1.7 Section 7.4 Formula

```ts
const emailMatch = normalizeEmail(rawEmail) === normalizeEmail(existingEmail);
const phoneMatch = normalizePhone(rawPhone) === normalizePhone(existingPhone);
const nameScore = jaroWinkler(rawName, existingName);
const institutionScore = jaroWinkler(rawInstitution, existingInstitution);

const isDuplicate =
  emailMatch ||
  phoneMatch ||
  (nameScore >= 0.92 && (emailMatch || phoneMatch || institutionScore >= 0.85));
```

### Plan Section 6 Logic

> Decision:
> - If deterministic match (email/phone): reuse existing Person
> - If soft match above threshold: create ResumePersonSuggestion for DIC review
> - If no match: create new Person

### Discrepancy Analysis

| Scenario | Architecture Formula | Plan Logic | Conflict? |
|----------|---------------------|------------|-----------|
| email match | duplicate → reuse | deterministic → reuse | ❌ No conflict |
| phone match | duplicate → reuse | deterministic → reuse | ❌ No conflict |
| name >= 0.92, email match, institution < 0.85 | duplicate → reuse | deterministic → reuse | ❌ No conflict |
| name >= 0.92, NO email/phone, institution >= 0.85 | duplicate → reuse | soft match → suggestion | ✅ CONFLICT |
| name >= 0.92, NO email/phone, institution < 0.85 | not duplicate | soft match → suggestion | ⚠️ Unnecessary |
| name < 0.92, no email/phone, no institution | not duplicate | no match → new | ❌ No conflict |

### Finding 6.1: Plan contradicts architecture formula (MEDIUM)

**Issue:** When `nameScore >= 0.92` AND `institutionScore >= 0.85` but no email/phone match, the architecture says this IS a duplicate and should reuse the existing `Person`. The plan says this is a "soft match" and creates a `ResumePersonSuggestion` for DIC review.

**Impact:** MEDIUM — This could create duplicate `Person` records that the architecture explicitly designed to prevent. The multi-signal formula is the core deduplication guarantee.

**Evidence from codebase:** `ResumePersonSuggestion` model already exists with `matchBasis` array and `isNewPerson` boolean, designed to record all match signals (not just soft matches).

**Evidence from architecture:** Section 7.4 explicitly states the formula as the decision logic, with `matchBasis` recording signals that fired.

### Required Correction

Replace plan Section 6 with:

```ts
const isDuplicate =
  emailMatch ||
  phoneMatch ||
  (nameScore >= 0.92 && (emailMatch || phoneMatch || institutionScore >= 0.85));

if (isDuplicate) {
  // Reuse existing Person
  // Create ResumePersonSuggestion with matchConfidence, matchBasis, isNewPerson=false
} else {
  // Create new Person
  // Create ResumePersonSuggestion with isNewPerson=true
}
```

**Verdict:** ❌ PERSON DEDUPLICATION DEVIATES FROM ARCHITECTURE

---

## Evidence 7: Idempotency Strategy

### Plan Approach

- `ResumeParseResult.dicRoutedAt` → Stage 5 idempotency guard
- `ResumeParseResult.canonicalWrittenAt` → Stage 6 idempotency guard
- `processingId` as idempotency key

### Architecture Alignment

Architecture Section 5.4:
> Each ResumeStageJob is keyed by processingId + stageName.
> KnowledgeQueueService guarantees at-least-once delivery; resume stages must be idempotent by checking ResumeParseResult before writing.

**Verdict:** ✅ IDEMPOTENCY STRATEGY SOUND

---

## Evidence 8: Retry and Rollback Strategy

### Plan Parameters

| Parameter | Plan Value | Architecture v1.7 |
|-----------|-----------|-------------------|
| Backoff | 1s, 2s, 4s | 1s, 2s, 4s |
| Max attempts | 3 | 3 |
| Dead-letter | ResumeParseDeadLetter | ResumeParseDeadLetter |

### Rollback Strategy

Plan Section 17:
1. Disable `dic_integration` and `canonical_write` routing
2. Jobs dead-letter after 3 retries
3. No data loss — ResumeParseResult and KnowledgeRecord intact
4. Rollback to Sprint 6 state: remove dispatcher cases

**Verdict:** ✅ RETRY AND ROLLBACK COMPLETE

---

## Evidence 9: Multi-Tenant Safety

### Plan Section 9

- All reads/writes scope by processingId + organizationId
- Person deduplication scoped to organizationId
- No cross-tenant data leakage

### Codebase Verification

From `ResumeParseResult` schema:
```ts
ResumeParseResultSchema.index({ organizationId: 1, reviewStatus: 1, createdAt: -1 });
ResumeParseResultSchema.index({ organizationId: 1, userId: 1, createdAt: -1 });
```

And `ResumePersonSuggestion`:
```ts
ResumePersonSuggestionSchema.index({ organizationId: 1, suggestedPersonId: 1, status: 1 });
```

**Verdict:** ✅ MULTI-TENANT SAFETY VERIFIED

---

## Evidence 10: Canonical Model Mapping

### Plan Section 6 Mapping

| Resume Entity | Canonical Model |
|---------------|-----------------|
| person (HEADER) | Person |
| experience | ExperienceRecord |
| education | AcademicRecord |
| skill | SkillEvidence |
| certification | CertificateRecord |
| project | CareerRecord |
| achievement | CareerRecord |
| language | Person (languages field) |

### Architecture v1.7 Section 5.1

| Section field | Canonical collection | Existing model |
|---------------|---------------------|----------------|
| sections[HEADER].entities | Person | Person |
| sections[EXPERIENCE].entries | ExperienceRecord | ExperienceRecord |
| sections[EDUCATION].entries | AcademicRecord | AcademicRecord |
| sections[SKILLS].normalizedSkills | SkillEvidence | SkillEvidence |
| sections[CERTIFICATIONS].entries | CertificateRecord | CertificateRecord |
| sections[PROJECTS].entries | CareerRecord | CareerRecord |

Plan adds `achievement` and `language` mappings not explicitly in architecture. This is an extension, not a conflict. Plan also correctly maps to existing models.

### Codebase Verification

All 6 canonical models exist:
- `src/models/Person.ts` ✅
- `src/models/ExperienceRecord.ts` ✅
- `src/models/AcademicRecord.ts` ✅
- `src/models/SkillEvidence.ts` ✅
- `src/models/CertificateRecord.ts` ✅
- `src/models/CareerRecord.ts` ✅

**Verdict:** ✅ MODEL MAPPING COMPLETE

---

## Evidence 11: Test Strategy

### Plan Section 12

| Test Type | Count | Target |
|-----------|-------|--------|
| Unit | 14 | DIC routing, person dedup, canonical writes, idempotency, error handling |
| Integration | 3 | End-to-end Stage 4→5→6, dispatcher routing, event publishing |

### Architecture v1.7 Section 12

Architecture does not prescribe specific test counts for Sprint 7. Plan's 14+ unit tests + 3 integration tests exceeds typical coverage.

**Verdict:** ✅ TEST STRATEGY ADEQUATE

---

## Evidence 12: Scope Control

### In Scope (Plan Section 2)

- Stage 5: DIC Integration
- Stage 6: Canonical Model Writes
- Dispatcher handlers
- 4 new events
- Idempotency guards
- Unit + integration tests

### Out of Scope (Plan Section 2)

- DIC UI implementation
- Frontend changes
- API changes for DIC module
- New canonical models
- Person matching algorithm redesign
- OCR/parsing logic changes

### Finding 12.1: DIC UI Metadata Ambiguity (LOW)

**Issue:** Plan lists "Resume-specific DIC UI metadata" as in-scope, but "DIC UI implementation" as out-of-scope.

**Impact:** LOW — creates ambiguity about whether backend is expected to provide metadata fields for a future UI.

**Verification:** The plan's interface definitions (`DicIntegrationOutput`, events) do not include any UI-specific fields. The scope item is likely meant as "DIC routing metadata" (backend-side routing metadata).

**Fix requirement:** Remove "DIC UI metadata" from in-scope or rename to "DIC routing metadata" to prevent frontend coupling assumptions.

**Verdict:** ⚠️ SCOPE WORDING AMBIGUOUS

---

## Evidence 13: Risks and Mitigation

### Plan Section 13

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Person dedup false positives | Medium | High | Multi-signal matching; DIC reviewer override |
| Canonical model schema drift | Low | Medium | Validate against existing interfaces |
| DIC module coupling | Medium | Medium | Thin adapter pattern |
| Write performance | Medium | Low | Batch + connection pooling |
| Partial write failure | Low | High | Transactional + rollback |

### Assessment

Risks are realistic for the sprint scope. Mitigations align with architecture patterns. Person dedup risk is elevated due to Finding 6.1.

**Verdict:** ✅ RISKS ADEQUATELY MITIGATED

---

## Evidence 14: Acceptance Criteria

### 12 Criteria Defined

1. Stage 5 routes based on reviewStatus ✅
2. AUTO_APPROVED → Stage 6 without human intervention ✅
3. PENDING_REVIEW → DIC human review queue ✅
4. NEEDS_REINDEX → re-upload flow ✅
5. Stage 6 writes idempotently ✅
6. Person deduplication prevents duplicates ✅ (pending fix for 6.1)
7. Events published with complete payloads ✅
8. Idempotency guards prevent duplicate operations ✅
9. 12+ tests pass ✅
10. No regressions from Sprint 6 baseline (495) ✅
11. TypeScript compiles cleanly ✅
12. Code review passed ✅

**Verdict:** ✅ ACCEPTANCE CRITERIA COMPLETE

---

## Evidence 15: Existing Model Reference

### Finding 15 (LOW)

**Issue:** Plan Section 11 says `src/models/ResumePersonSuggestion.ts` — "Create if not exists"

**Verification:** Model already exists in codebase.

```bash
grep: C:\github\academicuniverse.com\academicuniverse\backend\src\models\ResumePersonSuggestion.ts:
Line 3: export interface IResumePersonSuggestion extends Document {
...
Line 27: export const ResumePersonSuggestion = model<IResumePersonSuggestion>('ResumePersonSuggestion', ResumePersonSuggestionSchema);
```

**Impact:** LOW — plan will work regardless, but wording is inaccurate.

**Fix requirement:** Change to "update if needed" or "extend if needed".

**Verdict:** ⚠️ MODEL REFERENCE INACCURATE

---

## Review Conclusion

| Category | Verdict |
|----------|---------|
| Architecture | ✅ PASS |
| Stage 5 boundaries | ⚠️ MINOR |
| Stage 6 boundaries | ✅ PASS |
| Dispatcher | ✅ PASS |
| Events | ✅ PASS |
| Person deduplication | ❌ MEDIUM |
| Idempotency | ✅ PASS |
| Retry/rollback | ✅ PASS |
| Multi-tenant | ✅ PASS |
| Canonical mapping | ✅ PASS |
| Tests | ✅ PASS |
| Scope control | ⚠️ MINOR |
| Risks | ✅ PASS |
| Acceptance criteria | ✅ PASS |
| Existing model ref | ⚠️ LOW |

---

## Must-Fix Findings

| # | Severity | Finding | Fix Required |
|---|----------|---------|-------------|
| 6.1 | MEDIUM | Person deduplication strategy deviates from architecture v1.7 Section 7.4 deduction formula | Align decision logic with exact formula |
| 2.1 | LOW | Stage 5 trigger mechanism undefined | Add trigger definition |
| 12.1 | LOW | "Resume-specific DIC UI metadata" scope ambiguity | Rename or remove |
| 15 | LOW | ResumePersonSuggestion described as "create if not exists" | Update to "update if needed" |

---

## Overall Verdict

**APPROVED WITH FINDINGS**

The plan is structurally sound and implementation-ready. The MEDIUM finding (person deduplication) must be resolved before plan freeze. The three LOW findings should be corrected for clarity. No blocking architectural issues.

---

*End of Sprint 7 Plan Review Evidence*
*Generated: 2026-07-25*
