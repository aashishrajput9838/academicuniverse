(This file contains the consolidated normative baseline derived from `20_NORMATIVE_CLAUSE_LEDGER.csv`.)

CB-0001: Tenant isolation on protected APIs
- consolidated proposition: Server MUST derive and enforce tenant scope (`organizationId`) for all tenant-scoped API endpoints. Client-supplied `organizationId` MUST NOT be trusted without server resolution.
- supporting NC IDs: NC-0001, NC-0002, NC-0022
- source families: Draft, Pass2
- reconciliation rationale: Multiple NCs explicitly require `organizationId` inclusion in schema and server-side resolution; consolidated to single operational baseline.
- confidence: HIGH
- unresolved dependencies: none
- inclusion status: INCLUDE

CB-0002: Repository lookup and unique index tenancy
- consolidated proposition: Repository methods MUST include `organizationId` in lookup keys and schema unique indexes for tenant-owned resources MUST include `organizationId`.
- supporting NC IDs: NC-0003, NC-0004, NC-0022, NC-0017
- source families: Pass2
- confidence: HIGH
- unresolved dependencies: none
- inclusion status: INCLUDE

CB-0003: CandidateFact governance and non-canonicality
- consolidated proposition: `CandidateFact` MUST not be treated as canonical truth; canonicalization flows MUST preserve provenance and require explicit confirmation via `ReviewSession`.
- supporting NC IDs: NC-0009, NC-0018, NC-0013
- source families: Draft, Pass3, Pass4
- confidence: HIGH
- unresolved dependencies: conflict handling policy for auto-deduped vs reviewed resolutions (recorded in conflict register)
- inclusion status: INCLUDE

CB-0004: Idempotency and outbox transactional patterns
- consolidated proposition: Mutation endpoints documented as idempotent MUST respect `Idempotency-Key`; cross-service event emission related to canonicalization MUST use a transactional outbox pattern.
- supporting NC IDs: NC-0007, NC-0008, NC-0020, NC-0014
- source families: Pass4
- confidence: HIGH
- unresolved dependencies: none
- inclusion status: INCLUDE

CB-0005: Deletion, projection, and index hygiene
- consolidated proposition: Deletion of canonical data MUST include cleanup of projections/indexes/caches; migration/backfill plans MUST address projection consistency.
- supporting NC IDs: NC-0016
- source families: Pass3
- confidence: MEDIUM
- unresolved dependencies: implementation mapping for projections per tenancy (see CC-002)
- inclusion status: INCLUDE_WITH_QUALIFICATION

CB-0006: OAuth and sensitive token handling (Gmail)
- consolidated proposition: OAuth flows MUST preserve state integrity (signed/nonce) and token storage MUST be treated as sensitive data; production storage SHOULD be encrypted at rest and revocation/migration strategy MUST exist before release.
- supporting NC IDs: NC-0011, NC-0013, NC-0024 and Sprint-0 evidence (audit/05_GMAIL_TOKEN_STORAGE.md)
- source families: Draft, Pass2, Pass4
- confidence: MEDIUM
- unresolved dependencies: exact encryption requirements and migration steps (policy decision required)
- inclusion status: HOLD_UNRESOLVED

Baseline notes:
- No unresolved contradictions were silently included.
- CB-0006 is intentionally `HOLD_UNRESOLVED` until a policy decision determines required encryption standard and migration strategy.



