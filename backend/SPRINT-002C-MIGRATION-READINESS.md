# Sprint-002C Migration Readiness Report
**Date:** 2026-07-19  
**Sprint:** 002C  
**Status:** READY FOR PHASE-4  

---

## 1. Executive Summary

This document assesses the readiness of the Skills Tracker for Phase-4 data migration from raw skill IDs to canonical skill IDs. Sprint-002C has validated that the projection layer can operate in mixed-mode (canonical + raw) without data migration, and that canonical projections produce correct, deterministic results.

**Recommendation:** Proceed to Phase-4 migration planning. The ontology layer is production-ready.

---

## 2. Current State

### 2.1 Data Landscape

| Collection | Raw skillId Usage | CanonicalId Support |
|------------|------------------|---------------------|
| `skill_evidence` | Primary identifier | Optional in `payload.canonicalId` |
| `skill_records` | Primary identifier | Not yet used |
| `canonical_skills` | N/A | Primary identifier |
| `skill_aliases` | Maps raw → canonical | N/A |

### 2.2 Feature Flag Status

- `USE_ONTOLOGY_RESOLUTION` is available and tested
- Default: `false` (safe for production)
- Can be enabled per-tenant or globally via environment variable

### 2.3 Evidence Coverage

During Sprint-002B integration:
- All new evidence created via `SkillEvidenceService.ingestEvidence()` can carry `canonicalId`
- Existing evidence (pre-Sprint-002B) does NOT have `canonicalId`
- Mixed-mode is fully supported: old and new evidence coexist

---

## 3. Migration Phases

### Phase 1: Backfill CanonicalIds (Week 1-2)

**Objective:** Populate `payload.canonicalId` for existing evidence records.

**Approach:**
1. Batch process all existing `skill_evidence` records
2. For each record, call `SkillIdentityResolver.resolve()` to get canonicalId
3. Update `payload.canonicalId` and `payload.canonicalName`
4. Record migration metrics (total processed, errors, skipped)

**Rollback:** Stop batch job; existing records without canonicalId continue to work in mixed-mode.

**Estimated Effort:**
- 100K records: ~30 minutes (assuming 50ms per resolve)
- 1M records: ~5 hours
- 10M records: ~2 days

**Risk:** LOW. Resolution is idempotent and non-destructive.

### Phase 2: Projection Migration (Week 3)

**Objective:** Rebuild all `skill_records` using canonical grouping.

**Approach:**
1. Enable `USE_ONTOLOGY_RESOLUTION=true` globally
2. Run `rebuildAllSkillRecords()` for all persons
3. Verify projection counts match expected canonical groupings
4. Monitor for anomalies (duplicate projections, missing skills)

**Rollback:** Disable feature flag; raw projections remain intact.

**Estimated Effort:**
- 10K persons × 10 skills = 100K projections: ~2 hours
- 100K persons × 50 skills = 5M projections: ~1 day

**Risk:** MEDIUM. Requires careful monitoring during rebuild.

### Phase 3: Schema Migration (Week 4)

**Objective:** Update `skill_records` schema to use `canonicalId` as primary identifier.

**Approach:**
1. Add `canonicalId` field to `SkillRecord` schema (nullable initially)
2. Backfill `canonicalId` from existing `skillId` using resolver
3. Update indexes:
   - Keep existing `uniqueSkillPerPerson` for backward compatibility
   - Add `canonicalId` index for ontology queries
4. Update `SkillProjectionService` to write `canonicalId` to projection
5. Deprecate `skillId` in projections (keep for reference)

**Rollback:** Schema change is additive; old code continues to work.

**Risk:** MEDIUM. Schema changes require careful coordination with API consumers.

### Phase 4: API Migration (Week 5-6)

**Objective:** Update APIs to return canonical skills by default.

**Approach:**
1. Update response DTOs to include `canonicalId`
2. Update controllers to accept both raw `skillId` and `canonicalId` in queries
3. Update Growth Hub contracts to use canonical IDs (Sprint-002D+)
4. Deprecate raw `skillId` in API responses
5. Update frontend to display canonical skill names

**Rollback:** API versioning allows fallback to raw skillId responses.

**Risk:** HIGH. Requires coordination with frontend and Growth Hub teams.

---

## 4. Readiness Criteria

### 4.1 Must-Have Before Phase-4

- [x] CanonicalSkill and SkillAlias models deployed
- [x] SkillIdentityResolver production-tested (Sprint-002B canary)
- [x] Projection service validated in mixed-mode (Sprint-002C)
- [x] Feature flag mechanism operational
- [x] Monitoring and alerting configured
- [x] Rollback procedures documented

### 4.2 Nice-to-Have Before Phase-4

- [ ] Ontology admin UI for manual alias management
- [ ] Canonical skill merge/deprecate tools
- [ ] Confidence threshold tuning based on production data
- [ ] Caching layer for resolver (Sprint-002C identified need)

---

## 5. Data Integrity Checks

### 5.1 Pre-Migration

```sql
-- Count evidence by canonicalId coverage
db.skill_evidence.find({
  "payload.canonicalId": { $exists: true, $ne: null }
}).count()
```

**Target:** 100% coverage before Phase 2.

### 5.2 Post-Migration

```sql
-- Verify no duplicate canonical projections per person
db.skill_records.aggregate([
  { $group: {
    _id: { organizationId: "$organizationId", personId: "$personId", canonicalId: "$canonicalId" },
    count: { $sum: 1 }
  }},
  { $match: { count: { $gt: 1 } } }
])
```

**Target:** Zero duplicates.

### 5.3 Consistency Check

```sql
-- Verify projection evidenceCount matches actual evidence
db.skill_records.find().forEach(function(record) {
  var actualCount = db.skill_evidence.find({
    personId: record.personId,
    "payload.canonicalId": record.canonicalId,
    status: "ACTIVE"
  }).count();
  if (record.evidenceCount !== actualCount) {
    print("Mismatch: " + record._id + " expected " + actualCount + " got " + record.evidenceCount);
  }
})
```

---

## 6. Performance Projections

### 6.1 Production Scaling Estimates

| Scale | Evidence Records | Projection Rebuild Time (Est.) |
|-------|------------------|--------------------------------|
| 10K | 100K | ~15 minutes |
| 100K | 1M | ~2 hours |
| 1M | 10M | ~1 day |
| 10M | 100M | ~1 week |

### 6.2 Index Requirements

```javascript
// skill_evidence
db.skill_evidence.createIndex({ 
  organizationId: 1, 
  personId: 1, 
  "payload.canonicalId": 1, 
  status: 1 
});

// skill_records
db.skill_records.createIndex({ 
  organizationId: 1, 
  personId: 1, 
  canonicalId: 1 
});
```

---

## 7. Conclusion

The Skills Tracker ontology layer is **ready for Phase-4 migration**. All acceptance criteria for Sprint-002C have been met, and the system has been validated in mixed-mode operation. The phased migration plan minimizes risk through feature flag controls, incremental rollout, and rollback procedures at each stage.

**Recommended Next Action:** Begin Phase-1 backfill on staging environment with production data snapshot.

---

*Report generated by Kilo — Sprint-002C Migration Readiness*
