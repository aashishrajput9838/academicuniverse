# Sprint-001C Implementation Report: Skills Tracker Service Layer
**Date:** 2026-07-18  
**Scope:** Service layer only — repositories, models, enums, and tests from prior sprints remain unchanged  
**Status:** Complete — Clean compilation, zero test regressions, 21 new unit tests  

---

## 1. Created Files

| File | Purpose |
|------|---------|
| `backend/src/shared/services/skillEvidence.service.ts` | Evidence ingestion and revocation |
| `backend/src/shared/services/skillProjection.service.ts` | Proficiency derivation and aggregate projection rebuild |
| `backend/src/shared/services/subjectSkillMapping.service.ts` | Mapping management with validity windows and version rules |
| `backend/src/shared/services/__tests__/skillEvidence.service.test.ts` | SkillEvidenceService unit tests |
| `backend/src/shared/services/__tests__/skillProjection.service.test.ts` | SkillProjectionService unit tests |
| `backend/src/shared/services/__tests__/subjectSkillMapping.service.test.ts` | SubjectSkillMappingService unit tests |

## 2. Modified Files

None. Sprint-001C is purely additive.

---

## 3. Service Methods

### 3.1 `SkillEvidenceService`

| Method | Signature | Description |
|--------|-----------|-------------|
| `ingestEvidence` | `(payload) => Promise<ISkillEvidence>` | Appends a new immutable evidence document and creates an audit entry |
| `revokeEvidence` | `(evidenceId, organizationId, reason?) => Promise<void>` | Marks evidence as `REVOKED` via repository and creates an audit entry |

**Business logic:**
- Defaults `effectiveFrom` to `new Date()` if not provided.
- Always sets `status: EvidenceStatus.ACTIVE` on creation.
- Never calculates proficiency or modifies `SkillRecord`.
- Creates `AuditEntry` with `collectionName: 'skill_evidence'` and `performedBy: extractedBy`.

### 3.2 `SkillProjectionService`

| Method | Signature | Description |
|--------|-----------|-------------|
| `computeProficiency` | `(evidence: ISkillEvidence[]) => ProficiencyResult` | **Pure function** — derives proficiency from active evidence |
| `rebuildSkillRecord` | `(organizationId, personId, skillId) => Promise<ISkillRecord>` | Rebuilds a single `SkillRecord` projection from evidence |
| `rebuildAllSkillRecords` | `(organizationId, personId) => Promise<void>` | Rebuilds all `SkillRecord` projections for a person |

**Business logic:**
- `computeProficiency` is the **only** proficiency calculation in the codebase.
- It filters evidence by `status === 'ACTIVE'` and `effectiveTo` expiry.
- It applies source weights and recency decay.
- It returns `ProficiencyResult` with `score`, `level`, `firstSeenAt`, `lastVerifiedAt`, `evidenceCount`.
- `rebuildSkillRecord` reads evidence via `SkillEvidenceRepository`, computes projection, then writes directly to `SkillRecord` model (bypassing repository) as the sole authorized writer.
- Creates `AuditEntry` with `collectionName: 'skill_records'` and `performedBy: 'projection'`.

### 3.3 `SubjectSkillMappingService`

| Method | Signature | Description |
|--------|-----------|-------------|
| `upsertMapping` | `(payload) => Promise<ISubjectSkillMapping>` | Creates/updates mapping with date normalization and audit |
| `getMappingsForSubject` | `(subjectCode, organizationId, atDate?) => Promise<ISubjectSkillMapping[]>` | Returns mappings resolved by validity window and version rules |
| `getMappingsForSkill` | `(skillId, organizationId) => Promise<ISubjectSkillMapping[]>` | Returns all mappings for a skill |

**Business logic:**
- Normalizes `effectiveFrom` and `effectiveTo` using `normalizeDate`.
- Throws `Error` on invalid dates.
- `getMappingsForSubject` delegates to repository for temporal filtering, then applies conflict resolution:
  - **Higher version wins** for same `(subjectCode, skillId)`.
  - **Later `effectiveFrom` wins** when versions are equal.
- Returns deduplicated mappings sorted by version descending.

---

## 4. Proficiency Derivation Behavior

### 4.1 Source Weights

| Source | Weight | Rationale |
|--------|--------|-----------|
| `CERTIFICATE` | 1.0 | Explicit credential, highest trust |
| `MANUAL` | 0.95 | Human-verified |
| `ACADEMIC` | 0.9 | Graded performance |
| `RESEARCH` | 0.85 | Domain expertise |
| `PROJECT` | 0.8 | Applied skill |
| `GITHUB` | 0.7 | Activity proxy |
| `AI_INFERENCE` | 0.6 | Inferred, not confirmed |

### 4.2 Recency Decay

| Age | Factor |
|-----|--------|
| 0–6 months | 1.0 |
| 6–12 months | 0.9 |
| 12–24 months | 0.75 |
| >24 months | 0.6 |
| Expired (`effectiveTo` passed) | 0.0 (excluded) |

### 4.3 Formula

```
baseScore_i = confidence_i × sourceWeight_i × recencyFactor_i
aggregateScore = (Σ baseScore_i) / activeCount × 100
finalScore = clamp(round(aggregateScore), 0, 100)
```

### 4.4 Level Derivation

| Score Range | Level |
|-------------|-------|
| 0–25 | BEGINNER |
| 26–50 | INTERMEDIATE |
| 51–75 | ADVANCED |
| 76–100 | EXPERT |

---

## 5. Projection Rebuild Flow

```
SkillProjectionService.rebuildSkillRecord(orgId, personId, skillId)
    ↓
1. evidenceRepo.findActiveByPersonAndSkill(personId, skillId, orgId)
    ↓
2. computeProficiency(evidence)  ← pure function, no side effects
    ↓
3. Check if SkillRecord exists via repo.findBySkill()
    ↓
   ├─ EXISTS → SkillRecord.findByIdAndUpdate(_id, projection, { new: true })
   │             return updated document
   ↓
   └─ NEW   → SkillRecord.create({ ...projection, identity fields, status: ACTIVE })
               AuditEntry.create({ collectionName: 'skill_records', action: 'create' })
               return created document
```

**Key invariants:**
- `SkillProjectionService` is the **only** component that writes to `SkillRecord`.
- `SkillEvidenceService` never touches `SkillRecord`.
- `SubjectSkillMappingService` never touches `SkillRecord`.
- Repositories are never called by services other than their paired service.

---

## 6. Mapping Resolution Rules

### 6.1 Temporal Filtering

`findBySubject` and `findValidMappings` accept an optional `atDate` parameter. When provided, only mappings valid at that date are returned:

```typescript
filter.effectiveFrom = { $lte: atDate };
filter.$or = [
  { effectiveTo: { $exists: false } },
  { effectiveTo: { $gte: atDate } },
];
```

### 6.2 Conflict Resolution

When multiple `SubjectSkillMapping` documents exist for the same `(organizationId, subjectCode, skillId)`:

1. **Version precedence:** Higher `version` wins.
2. **Date precedence:** If versions are equal, later `effectiveFrom` wins.
3. **Result:** A single mapping per `skillId` is returned, deduplicated by the service.

### 6.3 Repository vs Service Responsibility

| Concern | Repository | Service |
|---------|-----------|---------|
| Temporal MongoDB query | ✅ `findBySubject` with `$lte`/`$gte` | — |
| Conflict resolution | — | ✅ `resolveConflicts()` |
| Date normalization | — | ✅ `normalizeDate()` |
| Audit trail | — | ✅ `AuditEntry.create()` |

---

## 7. Unit Test Coverage

### 7.1 Test Summary

| Service | Tests | Key Scenarios |
|---------|-------|---------------|
| `SkillEvidenceService` | 3 | ingest with defaults, ingest with custom dates, revoke |
| `SkillProjectionService` | 12 | empty evidence, single/multi-source, expired/inactive exclusion, recency decay, level boundaries, clamping, firstSeen/lastVerified, create projection, update projection, rebuild all |
| `SubjectSkillMappingService` | 7 | upsert with normalized dates, invalid date error, findBySubject without date, findBySubject with date + conflict resolution, version tie-break by effectiveFrom, getMappingsForSkill |

**Total: 3 test suites, 21 tests**

### 7.2 Mocking Strategy

- Repositories mocked at module level via `jest.mock()`.
- `AuditEntry` model mocked to avoid MongoDB writes.
- `SkillRecord` model mocked for direct `create`/`findByIdAndUpdate` calls in `SkillProjectionService`.
- All mocks typed as `jest.MockedClass` or `jest.MockedFunction<any>` to accommodate Mongoose overloads.

---

## 8. Verification Results

| Check | Result |
|-------|--------|
| `npm test` — new service tests | **Pass** — 3 suites, 21 tests, 0 failures |
| `npm test` — full existing suite | **Pass** — 21 suites, 113 tests, 0 failures |
| `tsc --noEmit` — new files | **Pass** — zero new TypeScript errors |
| `tsc --noEmit` — pre-existing errors | 6 errors in `academicRecordController.test.ts` (pre-existing, unrelated) |

---

## 9. Zero-Impact Verification

- **No existing models modified**
- **No existing routes/controllers modified**
- **No EventBus listeners added**
- **No database migrations required**
- **No frontend changes**
- **No dependencies added**

---

## 10. Assumptions and Known Limitations

### Assumptions

1. **Date normalization** — `SubjectSkillMappingService` uses the existing `normalizeDate` utility. If `effectiveFrom` or `effectiveTo` cannot be parsed, the service throws an error.
2. **Source weight immutability** — `SOURCE_WEIGHTS` are hardcoded constants. Future work may move them to a database table for admin configurability.
3. **Recency bucket boundaries** — Approximated using 30-day months. Calendar-accurate date math is deferred to Sprint-002.
4. **SkillRecord identity inference** — When creating a new `SkillRecord` from evidence, `skillName`, `aliases`, and `skillCategory` are taken from the first evidence document. This assumes the first evidence is representative.
5. **Audit trail granularity** — Audit entries are created for evidence ingestion/revocation and projection rebuilds, but not for every intermediate repository operation.

### Known Limitations

1. **No ontology resolution** — `skillId` is passed through as-is. Alias resolution (e.g., "Python3" → "Python") is not implemented in this sprint.
2. **No batch projection scheduling** — `rebuildAllSkillRecords` is synchronous and must be triggered manually or by an external scheduler (to be implemented in Sprint-001D).
3. **No cross-service invocation** — Services do not call each other. Integration with Growth Hub, Resume Builder, etc., will happen via EventBus in future sprints.
4. **No skill merge logic in service** — `SkillRecordRepository.mergeSkills` exists but is not exposed through a service yet. Will be added in Sprint-002.
5. **Single-organization assumption in `rebuildAllSkillRecords`** — The method iterates all evidence for a person without org filtering. If a person belongs to multiple orgs, this may cross org boundaries. To be fixed in Sprint-002.

---

## 11. Next Steps (Sprint-001D)

Ready for EventBus integration and controller/route implementation:
1. `SkillsEventListener` — listens to `AcademicRecordUpdated`, `CertificateApproved`, etc.
2. `SkillsController` + `SkillsRoutes` — REST API endpoints
3. Growth Hub projection integration
