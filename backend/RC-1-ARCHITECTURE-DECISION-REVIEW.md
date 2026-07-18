# Architecture Decision Review — Skills Tracker & Growth Hub Integration
**Date:** 2026-07-19  
**Reviewers:** Kilo (automated)  
**Scope:** Sprint-001A through RC-1  

---

## 1. Architecture Overview

The Skills Tracker module and Growth Hub integration follow a lightweight CQRS + Event-Driven architecture:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Upstream Services                            │
│  AcademicRecordService | CertificateService | GithubService | ...  │
└────────────────────────────┬────────────────────────────────────────┘
                             │ publish events
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          EventBus                                    │
│  UaipEvent.AcademicRecordUpdated | CertificateApproved | ...       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SkillsEventListener                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ handleAcademicRecordUpdated                                  │   │
│  │ handleCertificateApproved                                    │   │
│  │ handleGithubUpdated                                          │   │
│  │ handleResearchUpdated                                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  │                                                             │   │
│  │ SkillEvidenceService.ingestEvidence()                       │   │
│  │ SkillProjectionService.rebuildAllSkillRecords()             │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────────┘
                             │ publishes
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  SkillProjectionService                             │
│  rebuildSkillRecord() → publishes UaipEvent.SkillUpdated           │
│  rebuildAllSkillRecords() → publishes UaipEvent.SkillProfileRebuilt│
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  GrowthHubSkillsIntegration                         │
│  handleSkillUpdated() → invalidatedUsers.add()                     │
│  handleSkillProfileRebuilt() → debounce → buildProjection()        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    GrowthProjectionService                          │
│  buildProjection() → includes SkillsMetrics                        │
│  getSkillsMetrics() → aggregates SkillRecord data                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Key Design Decisions

### 2.1 Event-Driven Architecture

**Decision:** Use EventBus for decoupled communication between Skills Tracker and Growth Hub.

**Rationale:**
- Upstream services already publish events (AcademicRecordUpdated, etc.)
- Skills Tracker consumes these events to build evidence
- Growth Hub needs to react to Skills Tracker changes
- EventBus provides loose coupling without requiring direct service references

**Consequences:**
- Skills Hub must handle partial failures (one listener failing doesn't affect others)
- Event ordering must be preserved (SkillProfileRebuilt after SkillUpdated)
- Testing requires EventBus reset between tests

### 2.2 Lightweight CQRS for Projections

**Decision:** Separate write path (SkillEvidence ingestion) from read path (SkillRecord projections).

**Rationale:**
- Evidence is immutable; corrections produce new evidence
- Projections are derived state that can be rebuilt
- CQRS allows independent scaling of write and read paths

**Consequences:**
- Projections can become stale if rebuild fails
- Rebuild is expensive (queries all evidence per skill)
- Event-driven invalidation mitigates staleness

### 2.3 Append-Only Evidence

**Decision:** SkillEvidence documents are immutable; corrections produce new documents.

**Rationale:**
- Preserves audit trail
- Enables temporal queries (evidence valid at time X)
- Simplifies concurrency (no updates to existing evidence)

**Consequences:**
- Evidence tables grow unbounded (requires cleanup policy)
- Projections must handle superseded/revoked evidence
- Storage cost increases over time

### 2.4 Growth Hub Integration via Invalidation

**Decision:** Skills Tracker updates invalidate Growth projections; rebuild happens via debounced SkillProfileRebuilt event.

**Rationale:**
- Avoids unconditional rebuilds on every skill update
- Reuses existing GrowthProjectionService.buildProjection()
- Debounce prevents rebuild storms during batch processing

**Consequences:**
- Growth projections are stale for up to 5 seconds after Skills Tracker updates
- In-memory invalidation state lost on server restart
- Multi-instance deployments rebuild independently per instance

---

## 3. Architectural Strengths

1. **Loose coupling:** EventBus enables independent evolution of Skills Tracker and Growth Hub
2. **Testability:** Explicit start()/stop() lifecycle, EventBus.reset() for test isolation
3. **Backward compatibility:** Growth API consumers unaffected by Skills metrics addition
4. **Organization isolation:** Enforced at event handler, repository, and middleware layers
5. **Idempotency:** SkillsEventListener uses static guard; GrowthHubSkillsIntegration uses start() guard
6. **Observability:** Structured logging at all key decision points
7. **Graceful degradation:** Missing upstream data returns EMPTY state, not errors

---

## 4. Architectural Weaknesses

1. **In-memory invalidation state:** `invalidatedUsers` and `rebuildTimers` are lost on restart
2. **No projection caching:** Every Growth API request rebuilds full projection
3. **Confidence scale inconsistency:** 0-100 vs 0-1 across different modules
4. **Static singleton guards:** SkillsEventListener uses static `initialized` flag which persists across tests
5. **No retry logic:** Failed projection rebuilds are logged but not retried
6. **Fire-and-forget events:** `void eventBus.publish()` means no confirmation of delivery
7. **Tight coupling in SkillProjectionService:** Direct EventBus import couples projection logic to messaging

---

## 5. Recommendations

### 5.1 Immediate (Pre-Production)

| # | Recommendation | Priority |
|---|----------------|----------|
| 1 | Monitor EventBus listener count in production | HIGH |
| 2 | Monitor projection rebuild duration | HIGH |
| 3 | Set up alerting for SkillRecord rebuild failures | HIGH |
| 4 | Document EventBus event schemas | MEDIUM |

### 5.2 Short-Term (Sprint-002)

| # | Recommendation | Priority |
|---|----------------|----------|
| 5 | Standardize confidence scale to 0-1 | HIGH |
| 6 | Add proper TypeScript types for event payloads (replace `any`) | MEDIUM |
| 7 | Add health check for Skills Tracker subsystem | LOW |
| 8 | Implement projection caching in GrowthProjectionService | MEDIUM |

### 5.3 Long-Term (Sprint-003+)

| # | Recommendation | Priority |
|---|----------------|----------|
| 9 | Replace in-memory timers with job queue | MEDIUM |
| 10 | Implement incremental skill metrics updates | MEDIUM |
| 11 | Add retry with exponential backoff for rebuild failures | LOW |
| 12 | Implement projection staleness TTL | LOW |

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| EventBus memory leak from listener accumulation | LOW | HIGH | Monitor listener count; add cleanup |
| Projection rebuild timeout under load | MEDIUM | MEDIUM | Add caching; optimize queries |
| Data inconsistency during concurrent updates | LOW | MEDIUM | Event ordering; idempotent rebuilds |
| Server restart loses invalidation state | MEDIUM | LOW | Next API request rebuilds fresh |
| Confidence scale confusion | MEDIUM | LOW | Document and standardize |

---

## 7. Conclusion

The Skills Tracker and Growth Hub integration architecture is sound, testable, and backward compatible. The event-driven approach provides loose coupling while the explicit lifecycle management ensures production readiness. The identified weaknesses are manageable with monitoring and planned improvements.

**Overall Assessment: ARCHITECTURE SOUND — PROCEED WITH MONITORING**

---

*Review generated by Kilo — RC-1 Architecture Decision Review*
