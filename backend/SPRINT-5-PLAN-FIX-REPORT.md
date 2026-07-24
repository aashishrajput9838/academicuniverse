# Sprint 5 Plan Fix Report
## Resume Parser — ResumeAIEnhancer (Stage 3)

**Date:** 2026-07-25  
**Author:** Kilo  
**Scope:** Sprint 5 plan fixes based on senior plan review findings  
**Review Baseline:** `SPRINT-5-PLAN-REVIEW.md`

---

## Summary of Findings Addressed

| # | Severity | Description | Fix Applied |
|---|----------|-------------|-------------|
| 1 | HIGH | Confidence ownership overlap with Stage 4 | Removed confidence adjustment from Stage 5 scope; Stage 5 now emits enhancement metadata only |
| 2 | MEDIUM | Deduplication contradiction (in-scope vs out-of-scope) | Removed deduplication from AI Enhancement Flow; AI-introduced duplicates handled by Stage 4 confidence scoring |
| 3 | MEDIUM | Idempotency field `aiEnhanced` not in schema | Replaced with `rawCandidateFields.aiEnhanced === true` check, no schema change required |

---

## Fix 1: Confidence Ownership Clarification (HIGH)

### Problem
Plan claimed "Confidence score adjustment" in scope, including recomputing confidence after enhancement and emitting before/after summaries in events. This overlaps with Stage 4 (`ResumeConfidenceScorer`), which is defined as the component responsible for document-level confidence scoring.

### Resolution
**Confidence adjustment has been REMOVED from Stage 5 scope.**

New Stage 5 behavior:
- `ResumeAIEnhancer` normalizes and enriches entities
- Per-entity confidence is preserved as-is from Stage 2
- Stage 5 emits `entitiesEnhanced`, `strategy`, `aiFallbackUsed`, `improvements` counts
- **Stage 5 does NOT recompute or adjust confidence scores**
- Final document confidence remains the responsibility of Stage 4 (`ResumeConfidenceScorer`)

### Files Updated
- `SPRINT-5-PLAN.md`
  - Section 2 (In Scope): Removed "Confidence score adjustment"
  - Section 5 (Flow): Removed step 4 "Recompute confidence score"
  - Section 8 (Event): Removed `confidenceSummary` from `ResumeAIEnhancedPayload`
  - Section 13 (Tests): Removed "Confidence adjustment" and "Scores recomputed after enhancement" tests
  - Section 15 (Acceptance): Removed "Confidence scores adjusted based on enrichment quality"
  - Section 16 (DoD): Removed "Confidence adjustment implemented"

### New Event Payload (Updated)
```ts
interface ResumeAIEnhancedPayload extends UaipEventPayload {
  processingId: string;
  entitiesEnhanced: number;
  strategy: 'normalized' | 'normalized+ai' | 'ai-only';
  aiFallbackUsed: boolean;
  entityTypes: string[];
  improvements: {
    fieldsAdded: number;
    fieldsNormalized: number;
    fieldsCorrected: number;
  };
  reviewStatus: 'AUTO_APPROVED' | 'PENDING_REVIEW' | 'NEEDS_REINDEX';
  timestamp: Date;
  correlationId?: string;
}
```

---

## Fix 2: Deduplication Contradiction (MEDIUM)

### Problem
Section 2 (Out of Scope) stated "Entity deduplication (already done in Stage 2)", but Section 5 AI Enhancement Flow said "Deduplicate again (AI may introduce new overlaps)." These statements contradicted each other.

### Resolution
**Removed deduplication from the AI Enhancement Flow entirely.**

Rationale:
- Stage 2 already performs deduplication before Stage 3 runs
- AI enhancement adds fields and values to existing entities; it does not create new entity instances
- If AI enhancement were to create duplicates, Stage 4 (`ResumeConfidenceScorer`) will catch them during consistency scoring (which includes "no duplicate entries" as a scoring dimension)
- Keeping deduplication in Stage 2 only maintains single responsibility

### Files Updated
- `SPRINT-5-PLAN.md`
  - Section 5 (AI Enhancement Flow): Removed step "After all entities processed: Deduplicate again (AI may introduce new overlaps)" and the two bullets that followed
- `SPRINT-5-PLAN.md` (Out of Scope): Kept as-is — deduplication remains out of scope

### New AI Enhancement Flow (Updated)
```
Stage 2 completes:
  ResumeParseResult.rawCandidateFields.entities = [...]

Stage 3: ResumeAIEnhancer
  For each entity:
    1. Identify missing fields
    2. Apply normalization rules
    3. If confidence < threshold OR missing critical fields:
       - Invoke AI fallback to enrich/fix entity
    4. Validate enriched entity against schema

After all entities processed:
  - Update ResumeParseResult with enriched entities
  - Publish ResumeAIEnhanced or ResumeAIEnhancementFailed
```

---

## Fix 3: Idempotency Mechanism Clarification (MEDIUM)

### Problem
Plan referenced `ResumeParseResult.aiEnhanced` for idempotency, but this field does not exist in the schema.

### Resolution
**Replaced with `rawCandidateFields.aiEnhanced` check, no schema change required.**

Mechanism:
- Stage 5 checks `ResumeParseResult.rawCandidateFields.aiEnhanced === true`
- This is a runtime flag inside the existing `rawCandidateFields: Record<string, any>` document field
- No new schema migration needed
- Idempotency is achieved through the existing document structure

### Files Updated
- `SPRINT-5-PLAN.md`
  - Section 9 (Error Handling): Changed "Stage checks `ResumeParseResult.aiEnhanced`" to "Stage checks `ResumeParseResult.rawCandidateFields.aiEnhanced === true`"

---

## Updated Plan Summary

### In Scope (Updated)

- `ResumeAIEnhancer` stateless service
- AI enhancement of all 8 entity types
- Entity normalization and enrichment
- Null/missing field completion via AI
- Dispatcher `ai_enhancement` handler
- `ResumeAIEnhanced` / `ResumeAIEnhancementFailed` events
- Idempotency guard (via `rawCandidateFields.aiEnhanced`)
- Unit tests (12+)

### Out of Scope (No Change)

- `ResumeConfidenceScorer` (Stage 4)
- DIC integration
- Canonical model writes
- Frontend changes
- API changes
- Entity deduplication (Stage 2)
- New AI providers or model training

---

## Updated Event Contracts

### ResumeAIEnhanced (Updated — removed confidenceSummary)

```ts
interface ResumeAIEnhancedPayload extends UaipEventPayload {
  processingId: string;
  entitiesEnhanced: number;
  strategy: 'normalized' | 'normalized+ai' | 'ai-only';
  aiFallbackUsed: boolean;
  entityTypes: string[];
  improvements: {
    fieldsAdded: number;
    fieldsNormalized: number;
    fieldsCorrected: number;
  };
  reviewStatus: 'AUTO_APPROVED' | 'PENDING_REVIEW' | 'NEEDS_REINDEX';
  timestamp: Date;
  correlationId?: string;
}
```

---

## Updated Tests

### Unit Tests (Updated — removed confidence tests)

| Test | Target |
|------|--------|
| Person field normalization | Name, email, phone normalized |
| Experience date normalization | Dates converted to ISO 8601 |
| Education degree expansion | Abbreviations expanded |
| Skill name normalization | JS → JavaScript |
| AI enrichment trigger | Mock provider called when confidence < 0.7 |
| AI enrichment response | Validated against schema |
| Missing field completion | Null fields filled by AI |
| Idempotency | Re-dequeue skips if `rawCandidateFields.aiEnhanced === true` |
| Error: no entities | Publishes failure event |
| Error: AI exhaustion | Publishes failure with NEEDS_REINDEX |
| Malformed AI response | Original entity preserved |
| Improvements metadata | `fieldsAdded`, `fieldsNormalized`, `fieldsCorrected` populated correctly |

---

## Impact on Future Sprints

- **Stage 4 (ResumeConfidenceScorer):** Unchanged. Stage 4 still computes document confidence using the 5-component formula from Architecture Section 4. Stage 5 no longer writes adjusted confidence values.
- **Stage 5 (ResumeAIEnhancer):** Now strictly an enrichment service. Outputs enriched entities + enhancement metadata.
- **Data flow:** Stage 2 → raw entities → Stage 5 → enriched entities → Stage 4 → confidence score

---

## Files Modified

| File | Changes |
|------|---------|
| `backend/SPRINT-5-PLAN.md` | In-scope items, AI enhancement flow, event payloads, tests, DoD updated |
| *(Generated reports)* | `SPRINT-5-PLAN-FIX-REPORT.md`, `SPRINT-5-PLAN-FIX-EVIDENCE.md` |

---

## Verification

- [x] Confidence adjustment removed from Stage 5
- [x] Deduplication removed from Stage 5 flow
- [x] Idempotency mechanism documented without schema change
- [x] Event payloads updated
- [x] Tests updated
- [x] Scope boundaries clear between Stage 3 and Stage 4
- [x] No new dependencies introduced
- [x] Rollback strategy unchanged

---

*Fix report ready for re-review on 2026-07-25.*
