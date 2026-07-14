# Freeze Blockers

Tenant isolation: direct `findById` fetches without organization filtering are a blocker to code freeze for multi-tenant release. Evidence: `backend/src/services/gmailAuthService.ts` and various controllers using `User.findById(...)`.
Gmail token persistence verification needed before releasing Gmail-dependent features. Evidence: code persists Gmail tokens to `User.gmailTokens` in plaintext; classification updated to CONFIRMED_RISK (see evidence matrix F-002). This remains a blocker for sensitive Gmail flows until mitigation is planned and staged.
