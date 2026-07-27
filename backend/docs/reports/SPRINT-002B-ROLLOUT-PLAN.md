# Sprint-002B Rollout Plan
**Date:** 2026-07-19  
**Sprint:** 002B  

---

## 1. Overview

This document describes the phased rollout strategy for the ontology resolution feature flag (`USE_ONTOLOGY_RESOLUTION`) in the Skills Tracker.

**Goal:** Zero-risk deployment with instant rollback capability.

---

## 2. Pre-Deployment Checklist

- [x] Code complete and reviewed
- [x] 201 tests pass, zero regressions
- [x] TypeScript compiles clean
- [x] Performance benchmark completed
- [x] Monitoring dashboards configured for:
  - `ontologyResolutionSuccess`
  - `ontologyResolutionFailure`
  - `ontologyFallbackCount`
- [x] Alert rules defined:
  - `ontologyResolutionFailure` rate > 5% over 5 minutes
  - Evidence ingestion P95 latency > 10ms
  - Evidence ingestion P99 latency > 50ms

---

## 3. Rollout Phases

### Phase 0: Code-Only Deployment (Week 1)

**Date:** TBD  
**Tenants:** All (feature flag OFF)  
**Risk:** NONE

Actions:
1. Deploy code to production with `USE_ONTOLOGY_RESOLUTION=false`
2. Verify application starts without errors
3. Verify no resolver calls in production logs
4. Confirm metrics counters remain at zero

Success Criteria:
- Zero errors in production logs
- Zero resolver invocations
- Zero metric increments

---

### Phase 1: Canary Tenant (Week 2)

**Date:** TBD  
**Tenants:** 1 volunteer tenant  
**Risk:** LOW

Actions:
1. Set `USE_ONTOLOGY_RESOLUTION=true` for canary tenant only
2. Monitor continuously for 7 days
3. Review metrics daily
4. Verify evidence payloads contain `canonicalId`

Success Criteria:
- `ontologyResolutionSuccess` rate > 95%
- `ontologyResolutionFailure` rate < 1%
- Evidence ingestion latency P95 < 10ms
- Zero rejected upstream events
- Canary tenant users report no issues

Rollback Triggers:
- Failure rate > 5%
- P95 latency > 10ms sustained for 1 hour
- Any rejected upstream events

---

### Phase 2: 10% Rollout (Week 3)

**Date:** TBD  
**Tenants:** 10% of production tenants  
**Risk:** LOW-MEDIUM

Actions:
1. Enable flag for 10% of tenants (random selection or by tenant ID range)
2. Monitor metrics continuously
3. Compare evidence quality: check canonicalId population rate

Success Criteria:
- `ontologyResolutionSuccess` rate > 95%
- `ontologyResolutionFailure` rate < 2%
- Evidence ingestion latency P95 < 10ms
- CanonicalId population rate > 90% for new evidence

Rollback Triggers:
- Same as Phase 1

---

### Phase 3: 50% Rollout (Week 4)

**Date:** TBD  
**Tenants:** 50% of production tenants  
**Risk:** MEDIUM

Actions:
1. Enable flag for 50% of tenants
2. Increase monitoring frequency to real-time alerts
3. Prepare for full rollout

Success Criteria:
- Same as Phase 2

---

### Phase 4: 100% Rollout (Week 5)

**Date:** TBD  
**Tenants:** All production tenants  
**Risk:** MEDIUM

Actions:
1. Enable flag for all tenants
2. Monitor for 48 hours with heightened alerting
3. Document any anomalies

Success Criteria:
- Same as Phase 2
- Zero regressions in downstream systems

---

## 4. Rollback Procedures

### Instant Rollback (Feature Flag)

To disable ontology resolution:
```bash
# Set environment variable to false
USE_ONTOLOGY_RESOLUTION=false

# Restart application (if using containerized deployment)
kubectl rollout restart deployment/skills-tracker
```

**Rollback time:** < 5 minutes  
**Data impact:** None (existing evidence with `canonicalId` remains valid)

### Emergency Rollback (Code Rollback)

If feature flag toggle is insufficient:
```bash
git revert HEAD
kubectl rollout restart deployment/skills-tracker
```

**Rollback time:** < 15 minutes  
**Data impact:** None

---

## 5. Monitoring Dashboard

### Key Metrics

| Metric | Type | Alert Threshold |
|--------|------|-----------------|
| `ontologyResolutionSuccess` | Counter | — |
| `ontologyResolutionFailure` | Counter | > 5% rate over 5min |
| `ontologyFallbackCount` | Counter | > 5% rate over 5min |
| Evidence ingestion P50 latency | Histogram | > 5ms |
| Evidence ingestion P95 latency | Histogram | > 10ms |
| Evidence ingestion P99 latency | Histogram | > 50ms |

### Log Queries

**Successful resolution:**
```
level:info AND message:"New canonical skill created"
```

**Failed resolution (fallback):**
```
level:error AND message:"Ontology resolution failed, falling back to raw skillId"
```

**Concurrent duplicate recovery:**
```
level:warn AND message:"Concurrent canonical skill creation detected"
```

---

## 6. Post-Rollout

### Week 6-7: Stabilization

- Monitor metrics daily
- Review canonicalId population rate
- Identify low-confidence mappings for cleanup
- Document operational runbook

### Week 8: Feature Flag Deprecation

- Remove `USE_ONTOLOGY_RESOLUTION` environment variable
- Remove feature flag check from code
- Make ontology resolution mandatory
- Update documentation

---

## 7. Stakeholder Communication

| Audience | Message | Timing |
|----------|---------|--------|
| Engineering team | Rollout phases and success criteria | Pre-deployment |
| Product team | Canary tenant selection and monitoring plan | Week 1 |
| Support team | Known issues and rollback procedures | Week 2 |
| Executive | Rollout status and risk assessment | Weekly during rollout |

---

*Report generated by Kilo — Sprint-002B Rollout Plan*
