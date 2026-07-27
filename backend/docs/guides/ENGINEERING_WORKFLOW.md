# Engineering Workflow
## Academic Universe Backend — Resume Parser

**Version:** 1.0  
**Date:** 2026-07-24  
**Purpose:** Define the mandatory engineering workflow for Sprint 1 through Sprint 7 resume parser implementation. This document codifies the disciplined process that prevented production-level bugs from reaching `main` in Sprint 1 and Sprint 2.

---

## 1. Workflow Stages

```
Architecture Design
        ↓
Architecture Review
        ↓
Sprint Planning
        ↓
Implementation
        ↓
Implementation Evidence
        ↓
Senior Code Review
        ↓
Fix Findings
        ↓
Re-review (if needed)
        ↓
Merge to main
        ↓
Completion Report
        ↓
Tag Release
        ↓
Next Sprint
```

---

## 2. Stage Details

### 2.1 Architecture Design

**Owner:** Tech Lead / Senior Engineer  
**Inputs:** Product requirements, existing system constraints  
**Outputs:** `RESUME-PARSER-ARCHITECTURE.md`  
**Rules:**
- Must include data flow diagram
- Must define public API contracts
- Must list explicit out-of-scope items
- Must define error handling strategy
- Must define testing strategy
- Must identify risks and mitigations

---

### 2.2 Architecture Review

**Owner:** Senior Engineer (independent reviewer)  
**Inputs:** Architecture document  
**Outputs:** `RESUME-PARSER-ARCHITECTURE-REVIEW.md`, `RESUME-PARSER-ARCHITECTURE-REVIEW-EVIDENCE.md`  
**Rules:**
- Review before any implementation begins
- Verdicts: `APPROVED`, `APPROVED WITH FINDINGS`, `REJECTED`
- All `CRITICAL` and `HIGH` findings must be fixed before implementation starts
- `MEDIUM` and `LOW` findings are tracked but do not block

---

### 2.3 Sprint Planning

**Owner:** Tech Lead + Engineering team  
**Inputs:** Approved architecture, previous sprint completion report  
**Outputs:** `SPRINT-N-PLAN.md`, `SPRINT-N-PLAN-EVIDENCE.md`  
**Rules:**
- Scope must be bounded and achievable in the sprint
- Explicitly list out-of-scope items (guardrails)
- Define Definition of Done (DoD)
- List files to create and modify
- Confirm no new npm dependencies without approval
- Public API changes must be explicitly called out
- Evidence report must map every plan requirement to architecture sections

---

### 2.4 Implementation

**Owner:** Assigned engineer(s)  
**Inputs:** Approved sprint plan  
**Outputs:** Code + tests  
**Rules:**
- Follow existing codebase conventions
- No scope creep — if a useful idea emerges, log it for future sprint
- Write tests alongside implementation, not after
- Commit frequently with descriptive messages
- Do not modify files outside sprint scope

---

### 2.5 Implementation Evidence

**Owner:** Assigned engineer(s)  
**Inputs:** Completed implementation  
**Outputs:** `SPRINT-N-IMPLEMENTATION-REPORT.md`, `SPRINT-N-EVIDENCE-REPORT.md`  
**Rules:**
- Every plan item must be traced to actual code changes
- Include file paths and line numbers
- Test results must be captured (suite count, test count)
- TypeScript compilation status must be recorded
- Public API stability must be verified
- Scope creep must be explicitly documented as "not implemented"

---

### 2.6 Senior Code Review

**Owner:** Senior Engineer (independent reviewer)  
**Inputs:** Implementation report + evidence + code diff  
**Outputs:** `SPRINT-N-CODE-REVIEW.md`, `SPRINT-N-CODE-REVIEW-EVIDENCE.md`  
**Rules:**
- Review against: architecture, approved plan, implementation evidence, previous sprint findings
- Dimensions: architecture compliance, security, multi-tenant safety, error handling, test quality, performance, maintainability, production readiness
- For every issue: severity, file, explanation, recommendation, must-fix-before-merge flag
- End with ONE verdict only: `APPROVED FOR MERGE`, `APPROVED WITH FIXES`, or `REJECTED`
- Do not modify code during review

---

### 2.7 Fix Findings

**Owner:** Assigned engineer(s)  
**Inputs:** Code review verdict  
**Outputs:** Code fixes + updated tests  
**Rules:**
- All `HIGH` and `CRITICAL` findings must be fixed
- `MEDIUM` findings should be fixed unless reviewer explicitly accepts deferral
- `LOW` findings are backlogged
- Re-run full test suite after fixes
- Re-run TypeScript compilation after fixes
- If verdict was `REJECTED`, return to Implementation stage

---

### 2.8 Re-review (if needed)

**Owner:** Senior Engineer  
**Inputs:** Fix implementation  
**Outputs:** Updated review verdict  
**Rules:**
- Only review previously flagged findings
- Confirm fixes are correct and complete
- Verdict must be `APPROVED FOR MERGE` before merge proceeds

---

### 2.9 Merge to main

**Owner:** Tech Lead  
**Inputs:** Approved code review  
**Outputs:** Merged `main` branch  
**Rules:**
- Merge only after `APPROVED FOR MERGE` verdict
- Use descriptive commit message
- Do not force-push or rewrite history
- Tag release immediately after merge

---

### 2.10 Completion Report

**Owner:** Assigned engineer(s)  
**Inputs:** Merged code, review artifacts  
**Outputs:** `SPRINT-N-COMPLETION-REPORT.md`  
**Rules:**
- Include: commit hash, merge date, tests passed, TypeScript status, architecture version, review verdict, fix report links, evidence report links, baseline established, next sprint
- Archive all sprint artifacts (plan, evidence, review, fix, completion)
- Freeze sprint — do not modify merged code without new review cycle

---

### 2.11 Tag Release

**Owner:** Tech Lead  
**Inputs:** Merged and tested code  
**Outputs:** Git tag  
**Rules:**
- Tag format: `v0.X.0` or `sprint-N-complete`
- Push tag to remote
- Tag must reference the exact merge commit

---

### 2.12 Next Sprint

**Owner:** Tech Lead + Engineering team  
**Inputs:** Completed sprint report, architecture v1.X  
**Outputs:** Next sprint plan  
**Rules:**
- Begin planning only after previous sprint is fully merged and tagged
- Architecture baseline version is incremented after each sprint
- Carry forward technical debt from previous sprint reviews

---

## 3. Document Naming Convention

| Document | Naming Pattern |
|----------|---------------|
| Architecture | `RESUME-PARSER-ARCHITECTURE.md` |
| Architecture Review | `RESUME-PARSER-ARCHITECTURE-REVIEW.md` |
| Architecture Review Evidence | `RESUME-PARSER-ARCHITECTURE-REVIEW-EVIDENCE.md` |
| Sprint Plan | `SPRINT-N-PLAN.md` |
| Sprint Plan Evidence | `SPRINT-N-PLAN-EVIDENCE.md` |
| Implementation Report | `SPRINT-N-IMPLEMENTATION-REPORT.md` |
| Implementation Evidence | `SPRINT-N-EVIDENCE-REPORT.md` |
| Code Review | `SPRINT-N-CODE-REVIEW.md` |
| Code Review Evidence | `SPRINT-N-CODE-REVIEW-EVIDENCE.md` |
| Fix Report | `SPRINT-N-FIX-REPORT.md` |
| Fix Evidence | `SPRINT-N-FIX-EVIDENCE.md` |
| Completion Report | `SPRINT-N-COMPLETION-REPORT.md` |

---

## 4. Review Verdicts

| Verdict | Meaning | Action |
|---------|---------|--------|
| `APPROVED FOR MERGE` | No issues found | Merge immediately |
| `APPROVED WITH FIXES` | Issues found but non-blocking for rework | Fix HIGH/MEDIUM, re-review, then merge |
| `REJECTED` | Fundamental design or implementation flaw | Return to planning or redesign |

---

## 5. Blocks and Gates

```
Architecture Review REJECTED    → Block: Return to Architecture Design
Sprint Review REJECTED          → Block: Return to Implementation
Code Review REJECTED            → Block: Fix + re-review
Code Review APPROVED WITH FIXES → Gate: Fix HIGH + MEDIUM before merge
TypeScript errors               → Block: Fix before merge
Test failures                   → Block: Fix before merge
```

---

## 6. Scope Creep Policy

- If a reviewer or engineer identifies an improvement outside sprint scope, it must be logged in the next sprint's backlog
- No out-of-scope code may be merged without a new sprint plan and review cycle
- "Small refactors" that touch files outside sprint scope require explicit tech lead approval

---

## 7. Security and Multi-Tenant Checklist

Every sprint must verify:

| Check | Requirement |
|-------|-------------|
| Authentication | All new endpoints require valid JWT |
| Authorization | All queries scoped by `organizationId` |
| Input validation | MIME type + magic-byte checks for file uploads |
| Duplicate prevention | Atomic DB-level guard or documented limitation |
| Error logging | Security-sensitive errors logged at `warn` or `error` level |
| No secrets in code | No API keys, tokens, or passwords in source |

---

## 8. Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Upload endpoint latency | < 500ms | Controller returns 201 async |
| Classification latency | < 2s | Event listener processes within 2s of Parsed event |
| Section detection latency | < 5s | Async job via KnowledgeQueueService |
| Full pipeline (non-scanned) | < 10s | Upload → status SUCCESS |
| Full pipeline (scanned + OCR) | < 30s | Upload → status SUCCESS |
| Queue polling interval | 30s | KnowledgeQueueService default |

---

## 9. Retrospective Inputs

After each sprint, capture:

| Input | Source |
|-------|--------|
| Planned vs actual velocity | Completion report |
| Review findings by severity | Code review |
| Technical debt introduced | Code review |
| Test coverage gaps | Test results |
| Blockers and resolutions | Git log / standup notes |

---

## 10. References

| Document | Purpose |
|----------|---------|
| `RESUME-PARSER-ARCHITECTURE.md` | Living architecture baseline |
| `SPRINT-1-COMPLETION-REPORT.md` | Sprint 1 closure |
| `SPRINT-2-COMPLETION-REPORT.md` | Sprint 2 closure |
| `SPRINT-2-CODE-REVIEW.md` | Example of approved code review format |

---

*This workflow is mandatory for all resume parser sprints (1-7). Deviations must be approved by tech lead.*
