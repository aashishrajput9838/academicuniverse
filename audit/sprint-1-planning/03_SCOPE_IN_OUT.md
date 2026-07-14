# Scope In / Out

## Scope count summary
- IN_SCOPE: 4
- OUT_OF_SCOPE: 9
- CONDITIONAL: 2
- BLOCKED: 2

## In Scope
- Define remediation scope for F-001 Gmail OAuth state handling.
- Define remediation scope for F-002 Gmail token persistence policy.
- Define remediation scope for F-003 resume template ownership verification.
- Define a tenant isolation sweep boundary and minimal rule set for Sprint 1.
- Document the absence of the full Technical Contract and use only explicit audit artifacts.

## Out of Scope
- Implementing the actual Gmail OAuth state fix, token encryption, or template authorization checks.
- Broad TenantContext rewrite across the repository.
- Mandatory growth deduplication or React Strict Mode remediation.
- LocalStorage JWT strategy changes.
- AI/Gemini data minimization implementation.
- Cloudinary MIME whitelist or storage content security hardening.
- Firestore/Mongo ownership cleanup unless directly required by F-001/F-002/F-003 evidence.
- Profile/onboarding UX or data flow changes.
- Observability work unless necessary to validate the specific blocker scope.

## Conditional Scope
- Growth duplicate-call investigation and instrumentation if evidence suggests the issue is caused by a real duplicate request path rather than normal repeated rendering.
- Tenant isolation sweep may extend beyond the high-risk flows if low-effort authorization checks can be added without broad refactor.

## Blocked Scope
- Decisions requiring the missing Technical Contract Passes 1–4 should be marked BLOCKED unless explicitly supported by the frozen audit artifacts.
- Any feature release or production change that would enable Gmail-sensitive flows before P0 mitigations are defined.
