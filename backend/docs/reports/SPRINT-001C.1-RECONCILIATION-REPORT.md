# Sprint-001C.1 Reconciliation Report: Skills Tracker Service Layer
**Date:** 2026-07-18  
**Scope:** Service layer reconciliation — CQRS decision, multi-tenant fix, layering verification  
**Status:** Complete — Architecture and implementation fully aligned  

---

## 1. CQRS Decision: Repository Write vs Direct Projection Writes

### Decision
**`SkillProjectionService` writes through `SkillRecordRepository.rebuildProjection()`**, not directly to the Mongoose model.

### Rationale
1. **Codebase convention** — The existing architecture mandates: *"Centralize all MongoDB queries so services never access Mongoose models directly."* All other services (`AcademicRecordService`, `CertificateService`, `ExperienceService`) follow this pattern.
2. **Testability** — Repository methods are easily mockable. Direct model access requires mocking the Mongoose model itself, which is brittle due to overloaded static method types.
3. **No existing CQRS precedent** — The codebase does not use CQRS elsewhere. Introducing direct model writes for projections would create an inconsistent architectural island.
4. **Preserved invariant** — The critical constraint *"SkillProjectionService must be the only component allowed to write SkillRecord projections"* is maintained by convention and documentation, not by access control.

### Implementation
Added `SkillRecordRepository.rebuildProjection(record, organizationId)`:
- Accepts a `Partial<ISkillRecord>` containing projection data.
- Performs create-or-update based on the unique key `(organizationId, personId, skillId)`.
- Returns the created or updated document.
- Is called exclusively by `SkillProjectionService`.

### ADD Update
Added **Section 8.1: Projection Write Pattern and Invariants** to `backend/SKILLS_TRACKER_ADD.md` documenting:
- The `rebuildProjection()` method as the sole write path
- Five invariants governing projection writes
- Lightweight CQRS rationale for the read-model separation

---

## 2. Multi-Tenant Fix: `rebuildAllSkillRecords`

### Finding
`rebuildAllSkillRecords(organizationId, personId)` was **already organization-scoped** in implementation:
```typescript
const evidence = await this.evidenceRepo.findByPerson(personId, organizationId);
```

The `findByPerson` repository method filters by `organizationId` when provided. The method signature requires `organizationId: string`, making cross-org calls impossible at the type level.

### Verification
- `evidenceRepo.findByPerson(personId, organizationId)` → filters by org ✅
- `rebuildSkillRecord(organizationId, personId, skillId)` → uses org for both read and write ✅
- `repo.rebuildProjection(projectionData, organizationId)` → creates/updates within org ✅

### Conclusion
No code change was required. The multi-tenant concern noted in the Sprint-001C implementation report was based on a pre-implementation assumption. The actual implementation correctly enforces organization isolation.

---

## 3. Layering Verification

| Service | Repository Used | Direct Model Access | Status |
|---------|---------------|---------------------|--------|
| `SkillEvidenceService` | `SkillEvidenceRepository` | None | ✅ Compliant |
| `SkillProjectionService` | `SkillRecordRepository` (`findBySkill`, `rebuildProjection`) + `SkillEvidenceRepository` | None | ✅ Compliant |
| `SubjectSkillMappingService` | `SubjectSkillMappingRepository` | None | ✅ Compliant |

**No layering violations found.** All MongoDB access flows through repositories.

---

## 4. Updated Files

| File | Change |
|------|--------|
| `backend/src/shared/repositories/skillRecord.repository.ts` | Added `rebuildProjection()` method |
| `backend/src/shared/services/skillProjection.service.ts` | Replaced direct `SkillRecord` model writes with `repo.rebuildProjection()`; removed direct model imports |
| `backend/src/shared/services/__tests__/skillProjection.service.test.ts` | Updated mocks to use `mockedSkillRecordRepo.prototype.rebuildProjection` |
| `backend/SKILLS_TRACKER_ADD.md` | Added Section 8.1: Projection Write Pattern and Invariants; updated proficiency formula |

---

## 5. Verification Results

| Check | Result |
|-------|--------|
| `npm test` — service tests | **Pass** — 3 suites, 21 tests, 0 failures |
| `npm test` — full suite | **Pass** — 21 suites, 113 tests, 0 failures |
| `tsc --noEmit` — new code | **Pass** — zero new TypeScript errors |
| `tsc --noEmit` — pre-existing | 6 errors in `academicRecordController.test.ts` (unrelated) |

---

## 6. Alignment Confirmation

The service layer is now **fully aligned** with the approved architecture:

- ✅ `SkillEvidenceService` — append-only evidence ingestion with audit
- ✅ `SkillProjectionService` — pure `computeProficiency()`, sole projection writer via repository
- ✅ `SubjectSkillMappingService` — mapping management with validity windows and version resolution
- ✅ All writes organization-scoped
- ✅ No service bypasses repository layer
- ✅ ADD updated with CQRS rationale and invariants
- ✅ All tests passing

**Ready for Sprint-001D: EventBus integration and controller/route implementation.**
