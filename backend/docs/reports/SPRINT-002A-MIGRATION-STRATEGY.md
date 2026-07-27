# Sprint-002A Migration Strategy
**Date:** 2026-07-19  
**Subsystem:** Skills Tracker — Ontology Resolution Foundation  
**Status:** DRAFT  

---

## 1. Executive Summary

This document describes the migration strategy for introducing canonical skill identity resolution into the Skills Tracker. The ontology layer is additive and non-breaking: existing SkillRecord IDs, SkillEvidence documents, Growth Hub projections, and frontend APIs remain unchanged until an explicit migration is executed.

**Current State:** Skills are identified by raw, source-prefixed strings (e.g., `ACADEMIC-CSE101`, `LANGUAGE-Python`, `CERTIFICATE-AWS Certified`). Each upstream source generates its own skill identifiers independently. There is no canonical mapping between equivalent skills from different sources.

**Target State:** Raw skill identifiers map to canonical skills via the `SkillIdentityResolver`. Multiple aliases point to one canonical skill. Confidence scores track mapping quality. Existing SkillRecord IDs are preserved until a controlled migration.

**Migration Approach:** Additive introduction with feature flag. No data migration in Sprint-002A.

---

## 2. Migration Phases

### Phase 1: Foundation (Sprint-002A) — CURRENT

**Objective:** Introduce ontology models, repositories, and resolver without changing existing behavior.

**Changes:**
- Add `CanonicalSkill` and `SkillAlias` Mongoose models
- Add `CanonicalSkillRepository` and `SkillAliasRepository`
- Add `SkillIdentityResolver` service
- Add unit tests (26 tests, 3 test suites)
- **Do not modify** `SkillProjectionService`, `SkillEvidenceService`, `GrowthHubSkillsIntegration`, or any frontend code

**Data Impact:** None. New collections are empty.

**Rollback:** Remove new files. No existing data affected.

---

### Phase 2: Integration (Sprint-002B)

**Objective:** Wire `SkillIdentityResolver` into the evidence ingestion pipeline.

**Changes:**
- Modify `SkillEvidenceService.ingestEvidence()` to call `SkillIdentityResolver.resolve()` before creating evidence
- Store `canonicalId` in `SkillEvidence` payload for future use
- Update `SkillsEventListener` handlers to resolve skill identity before ingesting evidence
- Add feature flag `USE_ONTOLOGY_RESOLUTION` (default: `false`)

**Data Impact:**
- New evidence documents include `canonicalId` in payload
- Existing evidence remains unchanged
- No SkillRecord IDs change

**Rollback:** Set feature flag to `false`. Evidence continues with raw skill IDs.

---

### Phase 3: Projection Alignment (Sprint-002C)

**Objective:** Use canonical IDs in SkillRecord projections.

**Changes:**
- Modify `SkillProjectionService.rebuildSkillRecord()` to accept optional `canonicalId`
- When `USE_ONTOLOGY_RESOLUTION=true`, group evidence by `canonicalId` instead of raw `skillId`
- Update `SkillRecord` unique index to support `(organizationId, personId, canonicalId)` — requires new field or index change

**Data Impact:**
- New SkillRecords use canonical IDs
- Existing SkillRecords keep raw IDs until explicit migration

**Rollback:** Feature flag to `false`. Projections revert to raw skill IDs.

---

### Phase 4: Data Migration (Sprint-002D+)

**Objective:** Migrate existing SkillRecord IDs from raw to canonical.

**Pre-requisites:**
- Phase 3 complete and stable in production
- Alias coverage > 95% for existing skills
- Manual review of low-confidence mappings

**Migration Steps:**

1. **Backup**
   ```bash
   mongodump --db=academic_universe --collection=skill_records --out=./backup/skill_records_$(date +%Y%m%d)
   ```

2. **Pre-migration validation**
   - Query all distinct `skillId` values in SkillRecord
   - For each, check if alias exists in `SkillAlias`
   - Generate migration report: skills with/without aliases, confidence distribution
   - Flag low-confidence mappings (< 0.7) for manual review

3. **Create canonical mappings for unmapped skills**
   - Run batch resolution on all unmapped skill IDs
   - Review and approve new canonical skills
   - Set `USE_ONTOLOGY_RESOLUTION=true` in staging

4. **Staging migration**
   - Run migration script against staging database
   - Verify:
     - All SkillRecords have canonical IDs
     - Growth Hub projections unchanged
     - Frontend APIs return same data
     - No duplicate canonical skills created

5. **Production migration**
   - Schedule during low-traffic window
   - Run migration script with `--dry-run` first
   - Execute migration in batches (1000 records per batch)
   - Verify after each batch

6. **Post-migration validation**
   - Rebuild all SkillProjections
   - Verify Growth Hub responses
   - Monitor error rates for 24 hours

**Rollback:** Restore from backup. Revert feature flag.

---

## 3. Schema Changes

### 3.1 SkillEvidence (Optional — Phase 2)

```typescript
{
  // existing fields...
  canonicalId?: string;  // New: canonical skill identifier
}
```

### 3.2 SkillRecord (Phase 3)

```typescript
{
  // existing fields...
  canonicalId?: string;  // New: canonical skill identifier
}
```

**Index change:**
```javascript
// Drop existing unique index
db.skill_records.dropIndex("uniqueSkillPerPerson")

// Add new compound index
db.skill_records.createIndex(
  { organizationId: 1, personId: 1, canonicalId: 1 },
  { unique: true, name: "uniqueSkillPerPersonCanonical" }
)
```

---

## 4. Rollback Plan

| Phase | Rollback Action | Time | Risk |
|-------|----------------|------|------|
| 1 (Foundation) | Delete new collections and files | 5 min | None |
| 2 (Integration) | Set `USE_ONTOLOGY_RESOLUTION=false` | 1 min | Low — evidence continues with raw IDs |
| 3 (Projection) | Set `USE_ONTOLOGY_RESOLUTION=false` | 1 min | Low — projections revert to raw IDs |
| 4 (Migration) | Restore from backup | 30 min | Medium — data gap during migration |

---

## 5. Validation Checklist

### Phase 1 (Sprint-002A)
- [x] New models compile without errors
- [x] All new tests pass (26/26)
- [x] No changes to existing SkillRecord/SkillEvidence schemas
- [x] No changes to Growth Hub
- [x] No changes to frontend
- [x] Existing test suite passes (192/192)

### Phase 2 (Sprint-002B)
- [ ] Feature flag `USE_ONTOLOGY_RESOLUTION` works
- [ ] Evidence ingestion with resolution enabled produces correct `canonicalId`
- [ ] Evidence ingestion with resolution disabled produces same output as before
- [ ] No performance degradation in evidence ingestion

### Phase 3 (Sprint-002C)
- [ ] SkillProjectionService builds projections using canonical IDs
- [ ] Growth Hub responses include canonical skill data
- [ ] No duplicate canonical skills created
- [ ] Alias lookup performance < 5ms

### Phase 4 (Migration)
- [ ] Pre-migration report generated
- [ ] All unmapped skills have approved aliases
- [ ] Staging migration completes without errors
- [ ] Production migration completes within maintenance window
- [ ] Post-migration validation passes

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Data inconsistency during Phase 4 | MEDIUM | HIGH | Batch migration, backup, staging validation |
| Performance degradation from resolution | LOW | MEDIUM | Benchmark resolver; add caching if needed |
| Duplicate canonical skills | MEDIUM | LOW | Unique constraint on `canonicalName` and `canonicalId` |
| Frontend breakage | LOW | HIGH | Feature flag; no frontend changes until Phase 4 |
| Alias coverage gaps | MEDIUM | MEDIUM | Pre-migration validation; manual review |

---

## 7. Timeline

| Sprint | Phase | Duration | Dependencies |
|--------|-------|----------|--------------|
| 002A | Foundation | 1 sprint | None |
| 002B | Integration | 1 sprint | 002A complete |
| 002C | Projection Alignment | 1 sprint | 002B stable |
| 002D+ | Data Migration | 2 sprints | 002C production-ready |

---

*Strategy maintained by Kilo — Last updated 2026-07-19*
