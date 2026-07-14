# Data Migration & Compatibility Plan

## Objective
Document compatibility considerations and potential migration requirements for Sprint 1 safety work, without implementing schema changes.

## Verified current reality
- `User.gmailTokens` schema stores plain access and refresh tokens.
- `githubAccessToken` uses an encrypted object shape, showing precedent for encrypted credentials.
- No evidence of existing Gmail token encryption or vault integration for Gmail tokens.

## Target constraint
- Preserve current data compatibility while defining a migration-compatible policy.
- Do not invent data migration behavior not supported by frozen audit artifacts.

## Migration considerations
1. Gmail token storage
   - Current model: `gmailTokens: { accessToken, refreshToken, expiryDate }`.
   - Compatibility risk: backend services expect `user.gmailTokens` to exist or be unset.
   - Planning guidance: define a compatible encrypted storage shape that can coexist with existing data during migration, e.g., add encrypted metadata fields while preserving access paths.
   - Note: actual migration strategy is not implemented in Sprint 1.
   - Migration classification: DATA_MIGRATION for Gmail token storage compatibility.

2. Resume template ownership
   - Current flow: templates are fetched by ID without owner validation.
   - Compatibility risk: templates remain readable and usable by internal code after authorization checks are added.
   - Planning guidance: define checks that enforce ownership without changing template schema.
   - Migration classification: NO_MIGRATION for template ownership validation; this is an authorization-only change.

3. OAuth state storage
   - If server-side state persistence is selected for F-001, this is EPHEMERAL_STATE_STORAGE rather than a persistent migration.
   - No persistent migration is required unless the implementation introduces a new long-lived state store.

## Migration classification summary
- Gmail token storage compatibility: DATA_MIGRATION.
- Mixed plaintext/encrypted compatibility window for Gmail tokens: COMPATIBILITY_WINDOW.
- OAuth state persistence candidate: EPHEMERAL_STATE_STORAGE.
- Resume template ownership validation: NO_MIGRATION.

## Actual migration unit count
- 1 actual migration unit: Gmail token storage compatibility.

## Deliverables
- Compatibility assessment for Gmail token persistence remediation.
- Migration option matrix for token storage: inline encrypted fields vs token vault.
- Compatibility checklist for resume template authorization.
- Explicit migration classification notes for each candidate.

## Out of scope
- Actual DB migration scripts.
- Schema refactor implementations.
- Data migration execution.
