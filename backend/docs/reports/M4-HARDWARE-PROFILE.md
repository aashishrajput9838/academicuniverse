# M4 Hardware Profile

**Date:** 2026-07-26  
**Sprint:** 9 — DIC Review & Production Hardening  
**Milestone:** M4 — Production Benchmark Execution

---

## Production Hardware Profile

All benchmark results must be measured against this fixed hardware profile to ensure reproducibility.

| Resource | Specification |
|----------|---------------|
| CPU | 2 vCPU |
| Memory | 4 GB RAM |
| MongoDB | Single-node replica set on localhost |
| Network | Loopback (no network latency) |
| Cold start | Excluded from measurement |

---

## Staging Requirements

The staging environment must meet or exceed this hardware profile:

- Staging CPU: ≥ 2 vCPU
- Staging Memory: ≥ 4 GB RAM
- Staging MongoDB: Single-node replica set or equivalent
- Staging Network: Loopback or equivalent low-latency network
- Cold start: Excluded from measurement

---

## Usage in Benchmarks

All benchmark results must be reported with this profile referenced. CI runners must meet or exceed this profile.

Benchmark results file format (`build/benchmarks/SPRINT-9-M4-BENCHMARK-RESULTS.txt`):

```
Hardware Profile:
  CPU:            2 vCPU
  Memory:         4 GB RAM
  MongoDB:        single-node replica set on localhost
  Network:        loopback
  Cold Start:     excluded
```

---

## Update Policy

If production hardware changes:
1. Update this document with the new profile
2. Re-run all benchmarks in staging
3. Compare results against previous profile
4. Update SLA thresholds if needed
5. Document change in Sprint 9 completion report

---

SPRINT 9 M4 HARDWARE PROFILE
