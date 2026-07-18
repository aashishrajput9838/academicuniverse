# ADR-002A: Ontology Resolution Foundation for Skills Tracker

**Date:** 2026-07-19  
**Status:** Accepted  
**Deciders:** Kilo  
**Related:** ADR-001 (Skills Tracker Architecture)  

---

## Context

The Skills Tracker currently identifies skills using raw, source-prefixed strings generated independently by each upstream service:

| Source | Example Skill IDs |
|--------|------------------|
| Academic | `ACADEMIC-CSE101`, `ACADEMIC-MATH201` |
| Certificate | `CERTIFICATE-AWS Certified`, `CERTIFICATE-PMP` |
| GitHub | `LANGUAGE-TypeScript`, `LANGUAGE-Python` |
| Research | `RESEARCH-Machine Learning Survey` |

This creates several problems:
1. **No canonical identity:** "Python" from GitHub and "Python" from Academic records are treated as separate skills
2. **Duplicate projections:** Each raw skill ID gets its own SkillRecord, fragmenting proficiency data
3. **No cross-source aggregation:** Growth Hub cannot aggregate "Python" skills across sources
4. **Manual merge required:** Consolidating duplicate skills requires manual intervention

We need a canonical skill identity layer that:
- Maps multiple raw identifiers to one canonical skill
- Supports confidence-aware resolution
- Preserves existing data during transition
- Does not break Growth Hub or frontend

---

## Decision

Introduce a lightweight ontology resolution layer between raw skill ingestion and projection:

```
Raw Skill ID (e.g., "LANGUAGE-TypeScript")
    │
    ▼
SkillIdentityResolver.resolve()
    │
    ├──► Lookup alias in SkillAlias collection
    │       │
    │       ├── FOUND ──► Return existing CanonicalSkill
    │       │
    │       └── NOT FOUND ──► Create new CanonicalSkill + SkillAlias
    │
    ▼
ResolvedSkill { canonicalId, canonicalName, confidence, isNew }
```

### Key Components

1. **CanonicalSkill** — Normalized skill identity
   - `canonicalId`: unique identifier (normalized name)
   - `canonicalName`: human-readable name
   - `canonicalCategory`: normalized category
   - `source`: origin of canonical definition
   - `status`: ACTIVE / DEPRECATED

2. **SkillAlias** — Mapping from raw identifier to canonical skill
   - `canonicalId`: reference to CanonicalSkill
   - `alias`: raw identifier (e.g., `LANGUAGE-TypeScript`)
   - `aliasType`: SKILL_ID, SKILL_NAME, EXTERNAL_ID, MANUAL
   - `confidence`: 0-1 mapping quality
   - `organizationId`: optional org-specific override
   - `source`: where alias originated
   - `status`: ACTIVE / DEPRECATED

3. **SkillIdentityResolver** — Resolution service
   - `resolve(input)`: resolves raw skill to canonical
   - `batchResolve(inputs)`: batch resolution
   - `registerManualAlias()`: manual alias registration
   - `getCanonicalSkill()`: retrieve canonical details
   - `getAliasesForCanonical()`: retrieve all aliases for a canonical

### Resolution Strategy

- **Exact match first:** Look for exact alias match (case-insensitive)
- **Confidence tracking:** Every alias stores confidence (0-1)
- **Auto-creation:** If no alias exists, create new canonical + alias
- **Organization scoping:** Aliases can be org-specific or global
- **Backward compatible:** Existing SkillRecord IDs unchanged until explicit migration

---

## Alternatives Considered

### Alternative 1: Direct String Normalization

Normalize raw skill IDs in-place (lowercase, trim, remove prefixes) without a separate ontology layer.

**Pros:**
- Simple implementation
- No new collections or indexes
- Immediate effect

**Cons:**
- No audit trail of mappings
- Cannot handle synonyms (e.g., "JS" vs "JavaScript")
- No confidence tracking
- Hard to correct bad normalizations
- No organization-specific overrides

**Rejected because:** Lacks the flexibility and auditability required for production.

---

### Alternative 2: External Ontology Service

Use an external skill ontology API (e.g., ESCO, O*NET) for canonical mapping.

**Pros:**
- Standardized skill definitions
- Rich metadata
- No internal maintenance

**Cons:**
- External dependency
- Network latency
- Cost
- May not cover institution-specific skills
- Requires API keys and fallback strategy

**Rejected because:** Adds external dependency and latency for a feature that can be solved internally. Can be revisited in Sprint-003+ for enhanced ontology.

---

### Alternative 3: Hash-Based Canonical IDs

Use content hash of normalized skill name as canonical ID.

**Pros:**
- Deterministic ID generation
- No collisions
- Easy to verify

**Cons:**
- Hash collisions possible (though unlikely)
- Cannot change canonical name without changing ID
- Hard to manually assign specific IDs
- Less readable than normalized names

**Rejected because:** Normalized names are more readable and flexible for manual intervention.

---

## Consequences

### Positive
1. **Loose coupling:** Skills Tracker and Growth Hub remain independent
2. **Backward compatible:** No existing data changes
3. **Testable:** Explicit resolver interface, easy to mock
4. **Observable:** Confidence scores and alias sources logged
5. **Gradual migration:** Can be enabled per-phase via feature flags

### Negative
1. **Additional complexity:** Two new models and one new service
2. **Query overhead:** Resolution adds one DB lookup per new skill
3. **Memory usage:** In-memory resolver state during batch operations
4. **Migration effort:** Phase 4 requires careful data migration

### Neutral
1. **Canonical ID format:** Using normalized names (not UUIDs) for readability
2. **Confidence threshold:** Default 0.5, configurable per use case
3. **Auto-creation:** New skills auto-create canonical entries (vs requiring admin approval)

---

## Implementation Notes

### Confidence-Aware Resolution

The resolver tracks confidence for each alias mapping:
- **High confidence (≥ 0.9):** Trusted mapping, used automatically
- **Medium confidence (0.5 - 0.9):** Used but flagged for review
- **Low confidence (< 0.5):** Creates new canonical skill instead of reusing

This prevents incorrect mappings from contaminating the canonical skill space.

### Organization Isolation

Aliases can be scoped to organizations:
- **Global aliases:** `organizationId` is null
- **Org-specific aliases:** `organizationId` is set

This allows different organizations to map the same raw skill ID to different canonical skills.

### Preservation of Existing IDs

Until Phase 4 migration:
- `SkillRecord.skillId` retains raw values
- `SkillEvidence.skillId` retains raw values
- Growth Hub uses raw skill IDs
- Ontology layer operates in parallel

---

## References

- Sprint-001F-B Implementation Report (EventBus integration)
- RC-1 Architecture Decision Review
- Skills Tracker E2E Verification Report
- Growth Hub Projection Service Documentation

---

*ADR maintained by Kilo — Last updated 2026-07-19*
