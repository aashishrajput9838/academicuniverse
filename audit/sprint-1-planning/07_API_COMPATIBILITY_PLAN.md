# API Compatibility Plan

## Objective
Define the API compatibility constraints for Sprint 1 planning, using only validated audit evidence.

## Verified current reality
- Gmail callback endpoint is unauthenticated: `backend/src/routes/gmailRoutes.ts`.
- Resume generation endpoint is protected by `authenticateUser`, but not necessarily by org ownership checks.
- Growth `/api/growth/me` route is authenticated and uses `enforceOrgIsolation`.

## Target constraint
- Maintain existing API contracts where possible.
- Treat any API compatibility changes as conditional unless required for blocker remediation.

## API compatibility principles
1. Do not alter endpoint signatures in Sprint 1 planning.
2. Prefer internal authorization hardening over changing external request/response formats.
3. Mark any needed API contract changes as conditional and evaluate them after a deeper review.

## Sprint 1 compatibility focus
- F-001: define authorization flow for `GET /api/gmail/callback` without assuming new client contract changes unless necessary.
- F-002: document that Gmail token storage policy should be backend-only and transparent to API clients.
- F-003: define that resume generation remains `POST /api/resume/generate` with the same request shape, but now performs stronger ownership checks internally.

## Conditional compatibility items
- Growth endpoint investigation: do not change `/api/growth/me` unless the root-cause analysis proves current behavior is broken.
- Any API versioning or response contract changes for Gmail status or disconnect are BLOCKED until implementation impact is evaluated.

## Deliverables
- API compatibility risk matrix for Sprint 1.
- Notes on endpoints that can be hardened internally without external contract changes.
- If required, a published list of conditional API contract changes for later sprints.
