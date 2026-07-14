# Current to Target Gap Map

## Current Reality
- Gmail callback route is unauthenticated and binds `state` directly to `userId`.
- Gmail tokens are stored in plaintext `User.gmailTokens`.
- Resume template generation reads `ResumeTemplate` by ID without verifying `organizationId`.
- `authenticateUser` and `enforceOrgIsolation` exist but are not universally applied.
- Growth duplicate-call root cause is UNKNOWN.
- No full Technical Contract Passes 1–4 document is available; only the compatibility matrix and frozen audit artifacts are authoritative sources.

## Target Constraints
- Preserve the frozen audit classifications for F-001, F-002, and F-003.
- Treat existing compatibility matrix findings as the target contract scope for tenant isolation and Gmail flows.
- No production code modifications during planning.
- Do not assume or invent missing contract details.

## Gaps
1. Proven vulnerability: Gmail callback state handling is currently unsafe.
2. Confirmed risk: Gmail tokens persist plaintext, increasing exposure.
3. Confirmed risk: resume template usage is not ownership-verified.
4. Tenant isolation policy is not enforced for all tenant-owned resources.
5. Growth investigation instrumentation is missing; root cause is unknown.
6. Full Technical Contract source for Passes 1–4 is unavailable.

## Implications
- A minimal Sprint 1 must define actionable remediations for gaps 1–4 while deferring unknown investigations to later sprints.
- The plan must distinguish between proven/blocker risks and lower-priority or unknown items.
- Without the full Technical Contract, the plan must mark contract-dependent decisions as BLOCKED or CONDITIONAL.
