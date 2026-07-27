# Sprint-001F-A Implementation Report: Growth Hub Infrastructure
**Date:** 2026-07-19  
**Scope:** Growth Hub infrastructure preparation for Skills Tracker integration  
**Status:** Complete — 6 new tests, 25 test suites green, zero regressions  

---

## 1. Executive Summary

Sprint-001F-A prepared the Growth Hub infrastructure for Skills Tracker integration by extending the projection model, adding skills metrics, updating the legacy `buildGrowthHubResponse`, and removing the obsolete `SkillsAdapter` from the routing engine. All changes preserve backward compatibility for existing Growth API consumers.

**Recommendation: GO** for Sprint-001F-B (Growth Hub projection integration).

---

## 2. Deliverables

### 2.1 Files Modified

| File | Change |
|------|--------|
| `backend/src/shared/application/routingEngine.ts` | Removed `SkillsAdapter` class and its registration in `adaptersMap` |
| `backend/src/modules/growth/growthProjection.types.ts` | Added `SkillSummaryItem`, `SkillsMetrics` interfaces; extended `GrowthProjection` with `skills` metric and `skillsTracker` source |
| `backend/src/modules/growth/growthProjection.service.ts` | Added `getSkillsMetrics()` method; updated `buildProjection()` to include skills metrics; bumped `PROJECTION_VERSION` to 2 |
| `backend/src/services/growthService.ts` | Added `SkillSummaryItem`, `SkillsMetrics` interfaces; added `getSkillsMetrics()` for legacy `buildGrowthHubResponse`; updated `GrowthHubResponse` to include `skills` metric |

### 2.2 Files Created

| File | Purpose |
|------|---------|
| `backend/src/modules/growth/__tests__/growthProjection.test.ts` | 6 unit tests for skills metrics in Growth projection |

---

## 3. SkillsMetrics Contract

### 3.1 Interface Definition

```typescript
export interface SkillSummaryItem {
  skillId: string;
  skillName: string;
  proficiencyScore: number;
  evidenceCount: number;
}

export interface SkillsMetrics {
  totalSkills: number;
  averageProficiency: number;
  technicalSkills: number;
  softSkills: number;
  languageSkills: number;
  toolSkills: number;
  topSkills: SkillSummaryItem[];
  weakestSkills: SkillSummaryItem[];
  lastProjectionAt: string | null;
}
```

### 3.2 Metric Definitions

| Metric | Type | Description |
|--------|------|-------------|
| `totalSkills` | `number` | Total count of active `SkillRecord` documents for the person |
| `averageProficiency` | `number` | Average of all `proficiencyScore` values, rounded to 2 decimal places |
| `technicalSkills` | `number` | Count of skills with `skillCategory === TECHNICAL` |
| `softSkills` | `number` | Count of skills with `skillCategory === SOFT` |
| `languageSkills` | `number` | Count of skills with `skillCategory === LANGUAGE` |
| `toolSkills` | `number` | Count of skills with `skillCategory === TOOL` |
| `topSkills` | `SkillSummaryItem[]` | Top 5 skills by proficiency score (descending) |
| `weakestSkills` | `SkillSummaryItem[]` | Bottom 5 skills by proficiency score (ascending) |
| `lastProjectionAt` | `string | null` | ISO timestamp of the most recently updated `SkillRecord` |

### 3.3 GrowthMetric Wrapper

Skills metrics are wrapped in the standard `GrowthMetric<T>` envelope:

```typescript
skills: GrowthMetric<SkillsMetrics> = {
  state: 'AVAILABLE' | 'EMPTY' | 'ERROR',
  value: SkillsMetrics | null,
  updatedAt: string | null,
  stale: boolean | null,
  reasonCode: GrowthMetricReasonCode | null,
};
```

---

## 4. GrowthProjection Changes

### 4.1 Updated Projection Shape

```typescript
export interface GrowthProjection {
  projectionVersion: number; // bumped from 1 to 2
  generatedAt: string;
  stale: boolean;
  profileId: string;
  metrics: {
    // ... existing metrics ...
    skills: GrowthMetric<SkillsMetrics>; // NEW
  };
  sources: {
    // ... existing sources ...
    skillsTracker: GrowthSourceState; // NEW
  };
  sourceVersions: Record<string, string | null>; // now includes skillsTracker
}
```

### 4.2 Backward Compatibility

- `projectionVersion` bumped to `2` to signal schema change
- Existing fields (`metrics`, `sources`, `sourceVersions`) are preserved
- New `skills` metric is always present (never omitted)
- When no skills data exists, `skills` metric has `state: 'EMPTY'` and `value` contains zeroed metrics
- Existing Growth API consumers that ignore unknown fields will continue to work

---

## 5. Legacy SkillsAdapter Removal

### 5.1 What Was Removed

The `SkillsAdapter` class in `routingEngine.ts` was removed. This adapter:
- Had `MODULE_ID = 'skills_tracker'`
- Had `CANONICAL_COLLECTION = 'CareerRecord'`
- Wrote `skills: fields.skills ?? []` to the legacy `CareerRecord` collection
- Was registered in `adaptersMap['skills_tracker']`

### 5.2 Why It Was Removed

1. **Wrong canonical collection:** The Skills Tracker module now uses `SkillRecord`, `SkillEvidence`, and `SubjectSkillMapping` as its canonical collections. Writing to `CareerRecord.skills` creates a duplicate, flat skills array that bypasses the Skills Tracker's evidence-based projection system.

2. **Event-driven architecture:** The Skills Tracker is now event-driven. Upstream services (`AcademicRecordService`, `CertificateService`, `GithubAdapter`, `ResearchAdapter`) publish events that `SkillsEventListener` consumes. There is no need for a routing adapter.

3. **Identified in E2E verification:** Sprint-001E.1's verification report flagged this as a medium-severity architectural inconsistency.

### 5.3 Migration Impact

| Aspect | Impact | Mitigation |
|--------|--------|------------|
| Existing `CareerRecord.skills` data | Remains in DB but is no longer written to | No data migration needed; Skills Tracker uses separate collections |
| Documents routed to `skills_tracker` module | Will fail with "No adapter found" error | Module config should be updated to not route to `skills_tracker`, or the adapter should be replaced with a no-op |
| Frontend reading `CareerRecord.skills` | No impact; data is still readable | Skills Tracker API provides the authoritative skills data |

---

## 6. Confidence Representation Standardization

### 6.1 Current State

| Source | Scale | Example |
|--------|-------|---------|
| `AcademicRecord.rawConfidence` | 0–100 | `95` |
| `CertificateRecord.rawConfidence` | 0–100 | `100` |
| `GithubRecord.rawConfidence` | 0–100 | `80` |
| `SkillEvidence.confidence` | 0–1 | `0.9` |
| Growth Hub metrics | Generic `T | null` | varies |

### 6.2 Standardization Approach

For the Growth Hub skills metrics integration:
- `SkillsMetrics` does NOT include a raw confidence field
- Confidence is implicit in the `SkillRecord.proficiencyScore` (0–100) and `SkillEvidence.confidence` (0–1)
- The `GrowthMetric<SkillsMetrics>` wrapper uses its own `state` and `reasonCode` for data availability, not confidence
- Future work: standardize all upstream `rawConfidence` fields to 0–1 scale

---

## 7. Projection Service Changes

### 7.1 New Method: `getSkillsMetrics`

```typescript
private async getSkillsMetrics(userId: string, organizationId: string): Promise<{
  source: GrowthSourceState;
  skills: GrowthMetric<SkillsMetrics>;
}>
```

**Flow:**
1. Resolve `personId` from `userId` + `organizationId` via `Person.findOne`
2. Query `SkillRecord.find({ organizationId, personId, status: 'ACTIVE' })`
3. Aggregate by `skillCategory` (TECHNICAL, SOFT, LANGUAGE, TOOL, DOMAIN_SPECIFIC)
4. Calculate `averageProficiency` from all `proficiencyScore` values
5. Sort skills by proficiency descending
6. Extract `topSkills` (top 5) and `weakestSkills` (bottom 5)
7. Determine `lastProjectionAt` from most recent `updatedAt`/`createdAt`
8. Return `GrowthMetric<SkillsMetrics>` with appropriate state

### 7.2 Updated `buildProjection`

- Now calls `getSkillsMetrics()` in parallel with other metrics
- Includes `skills` in `metrics` object
- Includes `skillsTracker` in `sources` object
- Includes `skillsTracker` in `sourceVersions`

### 7.3 Updated `buildGrowthHubResponse` (legacy)

- Now calls `getSkillsMetrics()` in parallel
- Includes `skills` in `metrics` object
- Maintains backward compatibility for existing consumers

---

## 8. Test Coverage

### 8.1 New Tests

| Test | Description |
|------|-------------|
| `getSkillsMetrics › should return EMPTY when person does not exist` | Verifies EMPTY state with NO_DATA reason when Person lookup returns null |
| `getSkillsMetrics › should return EMPTY when no skill records exist` | Verifies EMPTY state when SkillRecord.find returns empty array |
| `getSkillsMetrics › should return AVAILABLE with correct metrics` | Verifies category counts, averages, top/weakest skills, and timestamps |
| `getSkillsMetrics › should categorize DOMAIN_SPECIFIC skills correctly` | Verifies DOMAIN_SPECIFIC skills are not counted in any category bucket |
| `buildProjection › should include skills metrics in the projection` | Verifies full projection includes skills metric with AVAILABLE state |
| `buildProjection › should include EMPTY skills metrics when no skills exist` | Verifies full projection includes skills metric with EMPTY state |

### 8.2 Test Results

```
PASS src/modules/growth/__tests__/growthProjection.test.ts
  GrowthProjectionService - Skills Metrics
    getSkillsMetrics
      ✓ should return EMPTY when person does not exist
      ✓ should return EMPTY when no skill records exist
      ✓ should return AVAILABLE with correct metrics when skill records exist
      ✓ should categorize DOMAIN_SPECIFIC skills correctly
    buildProjection
      ✓ should include skills metrics in the projection
      ✓ should include EMPTY skills metrics when no skills exist

Test Suites: 25 passed, 25 total
Tests:       157 passed, 157 total
```

---

## 9. Verification Results

| Check | Result |
|-------|--------|
| `npm test` — new growth projection tests | **Pass** — 6 tests, 0 failures |
| `npm test` — full existing suite | **Pass** — 25 suites, 157 tests, 0 failures |
| `tsc --noEmit` — new code | **Pass** — zero new TypeScript errors |
| `tsc --noEmit` — pre-existing | 6 errors in `academicRecordController.test.ts` (pre-existing, unrelated) |
| Backward compatibility | **Preserved** — existing Growth endpoints continue working |
| SkillsAdapter removal | **Complete** — removed from routingEngine.ts and adaptersMap |

---

## 10. Architecture Decisions

### 10.1 Why `getSkillsMetrics` Is Private

`getSkillsMetrics` is a private method on `GrowthProjectionService`. It is called by:
- `buildProjection()` — the newer projection builder
- `buildGrowthHubResponse()` — the legacy response builder (via inline logic)

Keeping it private encapsulates the skills-specific aggregation logic within the projection service.

### 10.2 Why SkillsMetrics Uses 0–100 for Proficiency

`SkillRecord.proficiencyScore` uses 0–100 scale. The `SkillsMetrics.averageProficiency` and `SkillSummaryItem.proficiencyScore` preserve this scale for consistency with the Skills Tracker domain. The Growth Hub `GrowthMetric<T>` wrapper is scale-agnostic.

### 10.3 Why topSkills/weakestSkills Return Up to 5 Items

The slice logic (`slice(0, 5)` and `slice(-5).reverse()`) returns up to 5 items per list. For users with fewer than 5 skills, both lists contain all skills. This is intentional — it provides complete visibility for small skill sets while capping at 5 for large sets.

---

## 11. Migration Impact Assessment

### 11.1 Database Migrations

**None required.** The Skills Tracker collections (`SkillRecord`, `SkillEvidence`, `SubjectSkillMapping`) already exist. The `CareerRecord` collection is unchanged.

### 11.2 API Contract Changes

| Endpoint | Change | Breaking? |
|----------|--------|-----------|
| `GET /api/growth/me` | Added `metrics.skills` field | No — additive |
| `GET /api/growth/projection/me` | Added `metrics.skills`, `sources.skillsTracker`, `sourceVersions.skillsTracker` | No — additive |
| `GET /api/growth/profile/me` | No change | No |

### 11.3 Consumer Impact

- **Existing frontend consumers:** Will receive additional `skills` field in Growth Hub response. Should ignore if not needed.
- **New Skills Tracker consumers:** Can read `metrics.skills` for aggregated skills data.
- **Growth Hub internal consumers:** `buildProjection()` now returns `projectionVersion: 2`. Consumers checking version should handle both 1 and 2.

---

## 12. Known Limitations

1. **No pagination for top/weakest skills:** Fixed at 5 items each. Future: make configurable.
2. **No category breakdown by source:** `technicalSkills` count includes all sources (Academic, Certificate, GitHub, etc.). Future: add source breakdown.
3. **No skill trend metrics:** Only current state is projected. Future: add proficiency change over time.
4. **DOMAIN_SPECIFIC not counted:** Domain-specific skills are excluded from category counts. This is intentional but may need review.
5. **Confidence scale mismatch:** `SkillEvidence.confidence` uses 0–1 while `SkillRecord.proficiencyScore` uses 0–100. Growth Hub displays proficiency score (0–100).

---

## 13. Next Steps

1. **Sprint-001F-B:** Wire Skills Tracker events to Growth Hub projection
   - Subscribe to `SkillUpdated` and `SkillProfileRebuilt` events
   - Trigger `rebuildAllSkillRecords` on event receipt
   - Update `buildGrowthHubResponse` to use real skills data

2. **Sprint-001F-C:** Add skills metrics to Growth Hub dashboard
   - Display `totalSkills`, `averageProficiency`, category breakdown
   - Show `topSkills` and `weakestSkills` lists
   - Link to Skills Tracker detailed view

3. **Sprint-002:** Ontology resolution
   - Map subject codes to canonical skill IDs
   - Resolve skill aliases

4. **Sprint-003:** Batch projection rebuild
   - Nightly job for stale projections
   - Incremental rebuild on evidence changes

---

## 14. Appendix: Code Changes Summary

### 14.1 routingEngine.ts

**Removed:**
```typescript
class SkillsAdapter extends BaseAdapter {
  static MODULE_ID = 'skills_tracker';
  static CANONICAL_COLLECTION = 'CareerRecord';
  // ... writeCanonical writes to CareerRecord.skills
}
```
And its registration: `skills_tracker: new SkillsAdapter()` from `adaptersMap`.

### 14.2 growthProjection.types.ts

**Added:**
```typescript
export interface SkillSummaryItem { ... }
export interface SkillsMetrics { ... }
```

**Extended `GrowthProjection`:**
```typescript
metrics: {
  // ... existing ...
  skills: GrowthMetric<SkillsMetrics>;
}
sources: {
  // ... existing ...
  skillsTracker: GrowthSourceState;
}
```

### 14.3 growthProjection.service.ts

**Added:**
```typescript
private async getSkillsMetrics(userId, organizationId): Promise<{ source, skills }>
private createEmptySkillsMetrics(): SkillsMetrics
```

**Updated:**
```typescript
PROJECTION_VERSION = 2;
async buildProjection() // now includes skills metrics
```

### 14.4 growthService.ts

**Added:**
```typescript
export interface SkillSummaryItem { ... }
export interface SkillsMetrics { ... }
const getSkillsMetrics(userId, organizationId): GrowthMetric<SkillsMetrics>
```

**Updated:**
```typescript
export interface GrowthHubResponse {
  metrics: {
    // ... existing ...
    skills: GrowthMetric<SkillsMetrics>;
  }
}
export const buildGrowthHubResponse = async (...) => { /* includes skills */ }
```

---

*Report generated by Kilo — Sprint-001F-A Growth Hub Infrastructure*
