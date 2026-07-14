# 24_SPRINT_0_FINDING_RECONCILIATION

This document reconciles frozen Sprint-0 findings (F-001..F-007 and U-001..U-002) against the extracted NC ledger, consolidated baseline, and current code reality.

Summary (reconciled):

- F-001: Gmail tokens stored plaintext
	- classification: CONFIRMED_AND_CONTRACT_ALIGNED
	- evidence: `backend/src/models/User.ts` (`gmailTokens` fields plaintext), `audit/05_GMAIL_TOKEN_STORAGE.md`.
	- supporting NC/CB: NC-0024 (policy: path secrecy not authorization), CB-0006 (OAuth and sensitive token handling) — CB-0006 is HOLD_UNRESOLVED pending policy on encryption standard.

- F-002: OAuth `state` uses raw `userId` (CSRF/state integrity risk)
	- classification: CONFIRMED_AND_CONTRACT_ALIGNED
	- evidence: `backend/src/services/gmailAuthService.ts` (state: userId), `backend/src/controllers/gmailController.ts` (callback uses state as userId)
	- supporting NC/CB: NC-0011 (server must resolve org/user scope), CB-0006
	- recommendation: state integrity must be hardened (signed nonce) before authorization of sensitive flows.

- F-003: Token refresh preserves refresh token but lacks rotation metadata
	- classification: CONFIRMED_BUT_CONTRACT_SCOPE_DIFFERS
	- evidence: `backend/src/services/gmailAuthService.ts` (refreshAccessToken preserves refreshToken if missing in response)
	- supporting NC/CB: NC-0011, CB-0006
	- note: contract requires secure handling of refresh tokens; implementation lacks encryption and key/version strategy (policy decision required).

- F-004: Disconnect uses $unset but does not call Google revoke endpoint
	- classification: CONFIRMED_BUT_CONTRACT_SCOPE_DIFFERS
	- evidence: `backend/src/services/gmailAuthService.ts` (disconnectGmail unsets field); no revoke call observed
	- supporting NC/CB: CB-0006

- F-005: Idempotency not uniformly enforced across mutation endpoints
	- classification: CONFIRMED_AND_CONTRACT_ALIGNED
	- evidence: Pass4 NCs (NC-0007, NC-0020) require idempotency; code shows partial patterns but not uniform enforcement (see `23_CURRENT_CODE_COMPLIANCE_MATRIX.csv`)
	- supporting CB: CB-0004

- F-006: Deletion projection/index hygiene gap
	- classification: CONFIRMED_AND_CONTRACT_ALIGNED
	- evidence: NC-0016; codebase lacks consistent projection/index deletion patterns
	- supporting CB: CB-0005

- F-007: Cross-tenant analytics policy ambiguous
	- classification: CONFIRMED_BUT_CONTRACT_SCOPE_DIFFERS
	- evidence: NC-0015 (Pass2) indicates analytics outside MVP unless de-identified; code references analytics but governance not explicit
	- supporting CB: CB-0002 (tenant index rules) and CB-0005

- U-001: Unknowns requiring policy (encryption standard, migration approach)
	- classification: REQUIRES_POLICY_DECISION

- U-002: Unknowns on event/outbox pattern implementation choices
	- classification: REQUIRES_POLICY_DECISION

Notes:
- Each finding retains original frozen history. The reconciled classifications reference NC and CB IDs where applicable.
