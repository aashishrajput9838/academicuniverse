# P0 Blocker Treatment Plan

## Objective
Define the minimal treatment plan for the highest-priority blocker issues from the frozen Sprint 0 audit.

## Blockers
- F-001: Gmail OAuth `state` binding is a PROVEN_VULNERABILITY.
- F-002: Gmail token persistence is a CONFIRMED_RISK.
- F-003: Resume template ownership gap is a CONFIRMED_RISK.

## Treatment Approach
1. F-001 Gmail OAuth state handling
   - Verified current reality: `/api/gmail/callback` is unauthenticated and uses `state` as `userId`.
   - Target treatment: require a server-side, session-bound or signed state value that cannot be chosen by an attacker.
   - Plan deliverables:
     - Audit document describing acceptable state validation patterns.
     - Route-level constraint that callback must verify external state against the issuing session or nonce.
     - Risk note: actual fix is out of planning scope; only the treatment plan is defined here.
   - Treatment status: IN_SCOPE as a P0 planning item.

2. F-002 Gmail token persistence
   - Verified current reality: `User.gmailTokens` stores plain access/refresh tokens.
   - Target treatment: define a token storage compatibility policy and options for encryption or secrets management.
   - Key decisions and dependencies:
     - Encryption boundary: CONDITIONAL pending explicit policy input; plan should document both on-disk field encryption and token vault options.
     - Key source: BLOCKED until a source contract or security policy is confirmed; use existing secret management patterns if available.
     - Key versioning: CONDITIONAL; include version metadata in the compatibility design if encryption is selected.
     - Rotation strategy: CONDITIONAL; plan should define rotation in terms of refresh-token updates and token re-encryption.
     - Existing plaintext-token migration: IN_SCOPE as a compatibility requirement.
     - Mixed plaintext/encrypted compatibility window: IN_SCOPE; plan should preserve both formats during migration.
     - Read behavior during migration: IN_SCOPE; plan must preserve current read semantics.
     - Write behavior during migration: IN_SCOPE; plan must support new writes without breaking existing data.
     - Refresh-token update behavior: IN_SCOPE; preserve refresh token when Google omits a new one and update when present.
     - Disconnect clearing: IN_SCOPE; explicitly require token removal semantics.
     - Revocation behavior: CONDITIONAL; plan should note token revocation as preferred but may depend on provider support.
     - Migration idempotency: IN_SCOPE; plan should require idempotent migration steps.
     - Failure recovery: CONDITIONAL; plan should capture rollback limits and recovery criteria.
     - Observability without token leakage: IN_SCOPE; plan should explicitly call out logging constraints.
   - Plan deliverables:
     - Comparison of existing `githubAccessToken` encrypted shape versus Gmail token shape.
     - Minimal storage-design decision matrix: encrypt at rest vs secure token vault.
     - Compatibility notes for MongoDB schema and service behavior.
     - Explicit queue of contract-dependent items marked BLOCKED/CONDITIONAL.
   - Treatment status: IN_SCOPE as a P0 planning item.

3. F-003 Resume template ownership
   - Verified current reality: `processResumeController` reads template by ID without org validation.
   - Target treatment: require post-read ownership validation for template resources.
   - Plan deliverables:
     - Authorization check pattern for `template.organizationId === req.user.organizationId`.
     - Minimal remediation boundaries for resume generation and any related template work.
   - Treatment status: IN_SCOPE as a P0 planning item.

## Non-blocker notes
- Growth endpoint investigation remains UNKNOWN; this is not a P0 treatment unless additional evidence appears.
- Other audit findings (AI, Cloudinary, localStorage) are outside Sprint 1 mandatory blockers.

## Acceptance conditions for P0 treatment planning
- Documented evidence-backed mitigation options for F-001, F-002, and F-003.
- Clear delineation of planning-only deliverables vs later implementation work.
- No production code modifications in this planning pack.
