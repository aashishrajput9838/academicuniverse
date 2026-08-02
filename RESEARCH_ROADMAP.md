# Academic Universe Research Roadmap

**Repository**: `https://github.com/aashishrajput9838/academicuniverse`  
**Current Phase**: **Post-Phase 1 Maintenance & Reviewer Monitoring**  

---

## 1. Completed Research (Phase 1 — Frozen & Archived)

The following research milestones are 100% feature-frozen and archived under `/research/`:

- ✅ **Paper 1 (AU DIC)**: *Document Intelligence Layer for Automated Transcript & Portal Ingestion*
  - Status: Submitted (`paper1-v1.0-submission`)
  - Contributions: Multi-tenant ingestion, Playwright scraper providers, PDF regex parsers, $W=1.00$ anchor proof.
- ✅ **Paper 2 (Academic Universe)**: *An AI-Powered Holistic Student Growth Intelligence Ecosystem*
  - Status: Submitted (`paper2-v1.0-submission` @ Commit `14e8167`)
  - Contributions: 3-tier intelligence pipeline, SIE-1.0 scoring engine, GIE dynamic velocity ($\mu_v$), exponential decay ($\delta$), sensitivity analysis ($\lambda$), and proof-of-concept synthetic simulation ($N=5$).

---

## 2. Future Work & Upcoming Research Phases

Future engineering and research work will be executed exclusively on designated feature/revision branches without modifying frozen Phase 1 artifacts:

### Milestone 1: Journal Peer Review Revisions (On-Demand)
- **Condition**: Triggered upon receiving official reviewer decision letters from IEEE TLT / ACM EDM.
- **Git Branch Strategy**: Dedicated revision branches (`paper1-r1`, `paper2-r1`).
- **Planned Refinements**: Address reviewer-requested sensitivity curves, additional baseline comparisons, or formatting adjustments.

### Milestone 2: Paper 3 — Institutional Human Clinical Trial ($N \ge 500$)
- **Objective**: Transition from proof-of-concept synthetic simulations to real-world multi-institutional human subject deployment.
- **Scope**:
  - Deploy Academic Universe across $N \ge 500$ undergraduate students spanning 3 university campuses over 2 academic years.
  - Institutional Review Board (IRB) ethics approval and self-sovereign privacy consent framework.
  - Empirical validation of recruiter proof utility and student retention impact.

### Milestone 3: Next-Generation SIE-2.0 & GIE-2.0
- **Objective**: Advanced AI & AST Code Analysis Engine.
- **Scope**:
  - Abstract Syntax Tree (AST) code quality parsing to filter boilerplate or imported vendor code.
  - Peer code review and faculty endorsement weighting in confidence scoring ($C$).
  - Bayesian belief network for dynamic multi-provider confidence updates.

---

## 3. Recommended Git Branching Strategy

To maintain complete isolation between frozen research submissions and active product development:

```text
main                    ──► Stable Production Application Codebase
  │
  ├──► research/paper1-v1  [FROZEN: paper1-v1.0-submission]
  ├──► research/paper2-v1  [FROZEN: paper2-v1.0-submission]
  │
  ├──► develop           ──► Active Platform Feature Development
  │     ├──► feature/ui-redesign
  │     └──► feature/ezone-v2
  │
  └──► paper2-r1         ──► On-Demand Reviewer Revision Branch (If Requested)
```

---

### RESEARCH ROADMAP FROZEN & REGISTERED 🎓
