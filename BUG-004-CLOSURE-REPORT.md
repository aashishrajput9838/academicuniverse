# BUG-004 — Skill Proficiency Calculation — Closure Report

**Date:** 2026-07-21T00:37:16+05:30  
**Status:** CLOSED — Not a Software Defect  
**Resolution:** Moved to Product Design Backlog as "Proficiency Scoring Engine v2"  

---

## 1. Investigation Summary

BUG-004 requested a complete architectural investigation of the proficiency percentage calculation. The investigation traced the full calculation path, documented the formula, explained per-source contributions, and demonstrated why specific scores (CSS=37%, JS=44%, TS=45%, Java=47%) occur.

## 2. Key Findings

| Finding | Status |
|---------|--------|
| Proficiency calculation path traced | ✅ Complete |
| Formula documented | ✅ Complete |
| Per-source contribution explained | ✅ Complete |
| GitHub metrics usage identified | ✅ Complete |
| Step-by-step score verification | ✅ Complete |
| Algorithm classified | ✅ Weighted scoring with hardcoded constants |
| Architectural gaps identified | ✅ Complete |

## 3. Root Cause

**Not a coding bug.** The current implementation is internally consistent and mathematically correct. The algorithm computes a weighted average of evidence items using `confidence × sourceWeight × recency`. However, the formula ignores repository depth metrics (bytesOfCode, commit count, stars, etc.) that are already stored in the database.

## 4. Why No Fix Was Implemented

The investigation concluded that changing the proficiency algorithm is a **product-design decision**, not a software defect. The current formula is valid for what it computes; the issue is that the design intent (what proficiency should measure) was never formally defined.

## 5. Deliverables

| Deliverable | Status |
|-------------|--------|
| Investigation report | ✅ `BUG-004-PROFICIENCY-CALCULATION-INVESTIGATION.md` |
| Product design proposal | ✅ `PRODUCT-DESIGN-PROPOSAL-PROFICIENCY-MODEL.md` |
| Code changes | ❌ None — no implementation required |
| Tests | ❌ N/A — no code changes |

## 6. Product Design Proposal Summary

The proposal "Proficiency Scoring Engine v2" recommends:

- **Proficiency should measure:** Breadth, Depth, Quality, Activity, Experience, Learning
- **GitHub metrics to add:** bytesOfCode (25%), commit count (15%), repository age + last pushed (15%), stars/forks (10%), repository count (20%), topics/visibility (10%)
- **Mathematical model:** Weighted Evidence Aggregation with Depth Adjustment
- **GitHub-only EXPERT:** Possible with depth-weighted multipliers (up to 1.4× base weight)
- **Quality vs. Quantity:** 70% quality, 30% breadth

## 7. Next Steps

| Step | Owner | Status |
|------|-------|--------|
| Product team reviews proposal | Product | Pending |
| UX team defines display/explanation | Design | Pending |
| Engineering validates GitHub API metrics | Engineering | Pending |
| Design approval | Product | Pending |
| Implementation (if approved) | Engineering | Not started |

## 8. Closure Statement

**BUG-004 is officially CLOSED as Not a Software Defect.**

The proficiency calculation algorithm is working as designed. The investigation revealed architectural gaps between the current implementation and the intended product experience, which have been documented in the Product Design Backlog under "Proficiency Scoring Engine v2".

No further engineering work is required until the product team explicitly approves a new proficiency model.
