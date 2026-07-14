# Sprint 1 Charter

## Objective
Establish a minimal, safety-first foundation sprint that remediates the highest priority tenant and Gmail risks identified in Sprint 0 while preserving the frozen audit state and avoiding any production-code changes.

## Sprint 1 goal
- Protect the platform against proven and confirmed cross-tenant risks in Gmail and resume template flows.
- Preserve current behavior where safe and only scope changes to clearly evidenced safety gaps.
- Use existing frozen audit evidence and compatibility artifacts as the planning constraint set.

## Verified current reality
- `authenticateUser` attaches `req.user` and `req.organizationId` for protected routes.
- `enforceOrgIsolation` exists and validates `organizationId` in selected inbound request fields.
- Gmail callback route is unauthenticated and maps external OAuth `state` directly to `userId`.
- Gmail tokens are persisted in plain `User.gmailTokens`.
- Resume template generation uses `ResumeTemplate.findById(templateId)` without validating ownership.
- Growth duplicate-call root cause remains UNKNOWN.

## Verified frozen audit constraints
- F-001 is PROVEN_VULNERABILITY and must remain scoped as a blocker remediation candidate.
- F-002 is CONFIRMED_RISK; it is not a proven independent token-leak vulnerability.
- F-003 is CONFIRMED_RISK for unauthorized template use; disclosure is NOT proven.
- Sprint 1 must not implement production fixes in audit-only documents.

## Prompt-provided target constraints
- Technical Contract Passes 1–4 are not available in full; planning must use only explicit frozen audit and matrix constraints.
- Growth deduplication is not mandatory; the duplicate-call issue is still UNKNOWN.
- No broad TenantContext rewrite unless required by evidence.
- The smallest coherent foundation sprint is required; do not automatically include every audit item.

## Sprint 1 scope summary
- IN_SCOPE: targeted remediation planning for Gmail state handling, Gmail token storage policy, resume template ownership enforcement, and a tenant isolation sweep boundary definition.
- CONDITIONAL: growth investigation/instrumentation pending root-cause validation.
- OUT_OF_SCOPE: broad TenantContext refactor, AI/Gemini data-minimization implementation, Cloudinary MIME hardening, localStorage auth token strategy, profile/onboarding refactor.

## Success criteria
- Sprint 1 artifacts define a concrete, evidence-grounded implementation plan with no code changes in production.
- All dependencies, risks, and constraint sources are clearly documented.
- The plan preserves the frozen classification and does not overcommit scope.
