# Technical Debt Register — Skills Tracker & Growth Hub Integration
**Date:** 2026-07-19  
**Subsystem:** Skills Tracker + Growth Hub  
**Maintainer:** Kilo  

---

## Active Technical Debt

| ID | Title | Description | Severity | Effort | Sprint Target | Status |
|----|-------|-------------|----------|--------|---------------|--------|
| TD-001 | Standardize confidence scale | Confidence values use 0-100 in upstream models (AcademicRecord, CertificateRecord, GithubRecord) but 0-1 in SkillEvidence. Growth metrics use mixed scales. | HIGH | 2 days | Sprint-002 | Open |
| TD-002 | Add projection caching | GrowthProjectionService.buildProjection() rebuilds full projection on every call. Add caching layer to reduce DB load. | MEDIUM | 3 days | Sprint-003 | Open |
| TD-003 | Replace `any` with proper types | Event payloads use `any` in multiple handlers (skillsEventListener, growthHubSkillsIntegration). UaipEventPayload should be extended or interfaces created. | MEDIUM | 1 day | Sprint-002 | Open |
| TD-004 | Make debounce configurable | REBUILD_DEBOUNCE_MS is hardcoded to 5000ms. Should be configurable via environment variable. | LOW | 0.5 days | Sprint-003 | Open |
| TD-005 | Incremental skill metrics | getSkillsMetrics() queries all SkillRecords on every build. Incremental updates would be more efficient. | MEDIUM | 3 days | Sprint-003 | Open |
| TD-006 | Add retry logic for rebuilds | Failed Growth projection rebuilds are logged but not retried. Add exponential backoff retry. | LOW | 1 day | Sprint-003 | Open |
| TD-007 | Document EventBus schemas | Event payload shapes are implicit. Create central registry/documentation for all events. | LOW | 0.5 days | Sprint-002 | Open |
| TD-008 | Replace setTimeout with job queue | GrowthHubSkillsIntegration uses setTimeout for debounce. A proper job queue would provide better reliability and observability. | MEDIUM | 2 days | Sprint-003 | Open |
| TD-009 | Add health check endpoint | No dedicated health check for Skills Tracker subsystem. Add /health/skills endpoint. | LOW | 1 day | Sprint-002 | Open |
| TD-010 | Projection staleness TTL | No TTL for stale projections. Add staleness tracking and automatic rebuild for projections older than threshold. | LOW | 1 day | Sprint-003 | Open |
| TD-011 | Multi-instance invalidation sync | invalidatedUsers is in-memory per instance. In multi-instance deployments, one instance's invalidation doesn't trigger rebuild on others. | MEDIUM | 2 days | Sprint-003 | Open |
| TD-012 | EventBus delivery confirmation | `void eventBus.publish()` is fire-and-forget. Consider adding delivery confirmation or dead-letter queue for critical events. | LOW | 2 days | Sprint-003 | Open |

---

## Resolved Technical Debt

| ID | Title | Description | Resolution | Resolved In |
|----|-------|-------------|------------|-------------|
| TD-001-R | SkillsAdapter writes to wrong collection | Legacy SkillsAdapter wrote to CareerRecord.skills instead of SkillRecord | Removed SkillsAdapter from routingEngine.ts | Sprint-001F-A |
| TD-002-R | EventBus lacks test isolation | No way to clear listeners between tests | Added EventBus.reset() method | RC-1 |
| TD-003-R | Implicit singleton initialization | GrowthHubSkillsIntegration initialized as side effect of route import | Moved to explicit start() in index.ts | RC-1 |
| TD-004-R | No graceful shutdown for timers | GrowthHubSkillsIntegration timers not cleared on SIGTERM | Added stop() method and gracefulShutdown handler | RC-1 |
| TD-005-R | Inconsistent logging | SkillProjectionService and GrowthProjectionService had no logging | Added Logger instances and info logs | RC-1 |

---

## Debt Metrics

- **Total Active Debt:** 12 items
- **High Severity:** 1 item (TD-001)
- **Medium Severity:** 5 items (TD-002, TD-003, TD-005, TD-008, TD-011)
- **Low Severity:** 6 items (TD-004, TD-006, TD-007, TD-009, TD-010, TD-012)
- **Total Estimated Effort:** 17 days
- **Items with Tests:** 0/12 (debt items don't have dedicated tests yet)

---

## Prioritization Rationale

### High Priority
- **TD-001 (Confidence scale):** Affects data accuracy across multiple modules. Should be resolved before onboarding new upstream sources.

### Medium Priority
- **TD-002, TD-005 (Caching/incremental updates):** Performance optimization. Monitor production metrics before implementing.
- **TD-003 (TypeScript types):** Developer experience and type safety. Low effort, medium value.
- **TD-008, TD-011 (Job queue / multi-instance):** Reliability improvements for production scale.

### Low Priority
- **TD-004, TD-006, TD-007, TD-009, TD-010, TD-012:** Operational improvements. Can be addressed as needed.

---

*Register maintained by Kilo — Last updated 2026-07-19*
