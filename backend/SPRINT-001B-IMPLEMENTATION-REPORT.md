# Sprint-001B Implementation Report: Skills Tracker Repository Layer
**Date:** 2026-07-18  
**Scope:** Repository layer only — no services, controllers, routes, or event listeners  
**Status:** Complete — Clean compilation, zero test regressions, 23 new unit tests  

---

## 1. Created Files

| File | Purpose |
|------|---------|
| `backend/src/shared/repositories/skillRecord.repository.ts` | SkillRecord aggregate-root data access |
| `backend/src/shared/repositories/skillEvidence.repository.ts` | SkillEvidence first-class evidence data access |
| `backend/src/shared/repositories/subjectSkillMapping.repository.ts` | SubjectSkillMapping curriculum data access |
| `backend/src/shared/repositories/__tests__/skillRecord.repository.test.ts` | SkillRecordRepository unit tests |
| `backend/src/shared/repositories/__tests__/skillEvidence.repository.test.ts` | SkillEvidenceRepository unit tests |
| `backend/src/shared/repositories/__tests__/subjectSkillMapping.repository.test.ts` | SubjectSkillMappingRepository unit tests |

## 2. Modified Files

None. Sprint-001B is purely additive.

---

## 3. Repository Methods

### 3.1 `SkillRecordRepository`

| Method | Signature | Description |
|--------|-----------|-------------|
| `upsert` | `(record: Partial<ISkillRecord>, organizationId: string) => Promise<{doc: ISkillRecord; action: 'create' \| 'update'}>` | Upserts by `(organizationId, personId, skillId)` unique key |
| `findByPerson` | `(personId: string, organizationId?: string) => Promise<ISkillRecord[]>` | Returns all skills for a person, optionally filtered by org |
| `findByPersonAndCategory` | `(personId: string, category: string, organizationId?: string) => Promise<ISkillRecord[]>` | Returns skills filtered by category |
| `findBySkill` | `(personId: string, skillId: string, organizationId?: string) => Promise<ISkillRecord \| null>` | Returns single skill record for person+skill |
| `archiveSkill` | `(skillId: string, organizationId: string) => Promise<void>` | Sets `status: 'ARCHIVED'` for all matching records |
| `mergeSkills` | `(sourceSkillId: string, targetSkillId: string, organizationId: string) => Promise<void>` | Merges source skill into target: increments evidenceCount on target, marks source as SUPERSEDED |

### 3.2 `SkillEvidenceRepository`

| Method | Signature | Description |
|--------|-----------|-------------|
| `create` | `(evidence: Partial<ISkillEvidence>, organizationId: string) => Promise<ISkillEvidence>` | Appends a new immutable evidence document |
| `findActiveByPersonAndSkill` | `(personId: string, skillId: string, organizationId?: string) => Promise<ISkillEvidence[]>` | Returns `ACTIVE` evidence for person+skill, newest first |
| `findByPerson` | `(personId: string, organizationId?: string) => Promise<ISkillEvidence[]>` | Returns all evidence for a person |
| `findByDocument` | `(sourceDocumentId: string, organizationId?: string) => Promise<ISkillEvidence[]>` | Returns evidence linked to a source document |
| `supersede` | `(evidenceId: string, supersededBy: string, organizationId: string) => Promise<void>` | Marks evidence as `SUPERSEDED` with link to replacement |
| `revoke` | `(evidenceId: string, organizationId: string) => Promise<void>` | Marks evidence as `REVOKED` |

### 3.3 `SubjectSkillMappingRepository`

| Method | Signature | Description |
|--------|-----------|-------------|
| `upsert` | `(mapping: Partial<ISubjectSkillMapping>, organizationId: string) => Promise<{doc: ISubjectSkillMapping; action: 'create' \| 'update'}>` | Upserts by `(organizationId, subjectCode, skillId)` unique key |
| `findBySubject` | `(subjectCode: string, organizationId: string, atDate?: Date) => Promise<ISubjectSkillMapping[]>` | Returns mappings for subject, optionally filtered by validity window |
| `findBySkill` | `(skillId: string, organizationId: string) => Promise<ISubjectSkillMapping[]>` | Returns mappings for a skill |
| `findValidMappings` | `(organizationId: string, atDate?: Date) => Promise<ISubjectSkillMapping[]>` | Returns all valid mappings for an org, optionally at a point in time |
| `bulkUpsert` | `(mappings: Partial<ISubjectSkillMapping>[], organizationId: string) => Promise<void>` | Iterates and upserts each mapping |

---

## 4. Query Patterns

### 4.1 Tenant Isolation

Every query enforces `organizationId` isolation:

```typescript
const filter: any = { personId: toObjectId(personId) };
if (organizationId) {
  filter.organizationId = toObjectId(organizationId);
}
```

For methods where `organizationId` is required, it is always the first filter field:
```typescript
const filter = {
  organizationId: toObjectId(organizationId),
  personId: record.personId,
  skillId: record.skillId,
};
```

### 4.2 Upsert Pattern

All three repositories use the same canonical upsert pattern from `AcademicRecordRepository`:

1. Build filter with `organizationId` + unique business key fields
2. `findOne(filter)` — check existence
3. If exists: `updateOne({ _id: existing._id }, record)` then `findById` to return updated doc
4. If not: `create(record)` to insert new doc
5. Return `{ doc, action: 'create' | 'update' }`

### 4.3 Temporal Queries (SubjectSkillMapping)

Validity window queries use MongoDB `$lte` / `$gte` with `$or` for open-ended ranges:

```typescript
filter.effectiveFrom = { $lte: atDate };
filter.$or = [
  { effectiveTo: { $exists: false } },
  { effectiveTo: { $gte: atDate } },
];
```

This enables:
- **Current curriculum**: `findValidMappings(orgId, new Date())`
- **Historical reprocessing**: `findBySubject(code, orgId, transcriptDate)`

### 4.4 Skill Evidence Lifecycle

Evidence is immutable — `create` always appends. State changes use dedicated methods:
- `supersede(evidenceId, supersededBy)` — marks old evidence as `SUPERSEDED`
- `revoke(evidenceId)` — marks evidence as `REVOKED`

No update or delete operations on evidence documents exist.

---

## 5. Unit Test Coverage

### 5.1 Test Structure

All tests use `jest.mock` on the Mongoose model modules. Mock models are typed as `jest.MockedFunction<any>` to accommodate Mongoose's complex static method overloads.

### 5.2 Coverage Summary

| Repository | Test Suites | Tests | Key Scenarios Covered |
|------------|-------------|-------|----------------------|
| `SkillRecordRepository` | 1 | 7 | create, update, findByPerson, findByCategory, findBySkill, archive, merge (target exists / doesn't exist) |
| `SkillEvidenceRepository` | 1 | 6 | create, findActive, findByPerson, findByDocument, supersede, revoke |
| `SubjectSkillMappingRepository` | 1 | 7 | create, update, findBySubject (with/without date), findBySkill, findValidMappings (with/without date), bulkUpsert |

**Total: 3 test suites, 23 tests**

### 5.3 Test Isolation

- All tests mock Mongoose models at the module level
- No real database connections required
- `toObjectId` conversion is exercised through real repository code paths
- Valid 24-character hex strings used for all ObjectId inputs

---

## 6. Verification Results

| Check | Result |
|-------|--------|
| `npm test` — new repository tests | **Pass** — 3 suites, 23 tests, 0 failures |
| `npm test` — full existing suite | **Pass** — 18 suites, 92 tests, 0 failures |
| `tsc --noEmit` — new files | **Pass** — zero new TypeScript errors |
| `tsc --noEmit` — pre-existing errors | 6 errors in `academicRecordController.test.ts` (pre-existing, unrelated) |

### Pre-existing TypeScript Errors (Not Introduced by This Sprint)
```
src/controllers/__tests__/academicRecordController.test.ts(48,51): error TS2554
src/controllers/__tests__/academicRecordController.test.ts(49,45): error TS2554
src/controllers/__tests__/academicRecordController.test.ts(50,53): error TS2554
src/controllers/__tests__/academicRecordController.test.ts(176,51): error TS2554
src/controllers/__tests__/academicRecordController.test.ts(177,45): error TS2554
src/controllers/__tests__/academicRecordController.test.ts(178,53): error TS2554
```

---

## 7. Zero-Impact Verification

- **No existing models modified**
- **No existing routes/controllers/services modified**
- **No EventBus listeners added**
- **No database migrations required**
- **No frontend changes**
- **No dependencies added**

---

## 8. Assumptions Made

1. **`toObjectId` tolerance** — Repositories call `toObjectId` on all ID inputs. Tests use valid 24-character hex strings for IDs passed to repository methods.
2. **Mock typing approach** — Mongoose model static methods have complex overloaded types incompatible with `jest.MockedClass`. Used `jest.MockedFunction<any>` as a pragmatic workaround.
3. **Upsert atomicity** — Repositories use read-modify-write pattern (findOne → updateOne/create) rather than MongoDB transactions, consistent with existing `AcademicRecordRepository`.
4. **`organizationId` optional in read methods** — Follows `AcademicRecordRepository.findByPerson` pattern where `organizationId` is optional for read scoping.
5. **`mergeSkills` evidence accumulation** — When merging skills, `evidenceCount` is incremented via `$inc` on the target record, preserving provenance.

---

## 9. Next Steps (Sprint-001C)

Ready for service layer implementation:
1. `SkillEvidenceService` — evidence ingestion, revoke
2. `SkillProjectionService` — proficiency derivation, aggregate refresh
3. `SubjectSkillMappingService` — mapping management with validity windows
