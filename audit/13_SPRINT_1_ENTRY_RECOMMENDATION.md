# Sprint 1 Entry Recommendation

- Recommendation: GO WITH BLOCKERS

Immediate Sprint-1 priorities (ordered):
  1. Tenant isolation sweep: audit all `findById` and data fetches; enforce `organizationId` scoping or explicit authorization checks. (BLOCKER)
  2. Gmail token model verification and hardening: code confirms plaintext token persistence — classify as CONFIRMED_RISK and prioritize P0 mitigation before enabling Gmail features in production. (BLOCKER for Gmail flows)
  3. Growth endpoint client deduplication: consolidate frontend fetches to `/api/growth/me` and add instrumentation. (MEDIUM)
  4. AI chat log PII review and retention policy for Firestore. (MEDIUM)
  5. Confirm local dev port and run smoke tests (safe verification). (INFO)
  3. Growth endpoint client deduplication: consolidate frontend fetches to `/api/growth/me` and add instrumentation. (MEDIUM)
  4. AI chat log PII review and retention policy for Firestore. (MEDIUM)
  5. Confirm local dev port and run smoke tests (safe verification). (INFO)

- Owners: Backend (tenant + gmail); Frontend (growth dedupe); Security/DevOps (secrets & Cloudinary).
