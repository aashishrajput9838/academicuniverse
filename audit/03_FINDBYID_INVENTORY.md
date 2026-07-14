# findById Inventory (evidence-backed)

For each occurrence: File:line, Model/Resource, Source of ID, Resource ownership, Upstream auth middleware, Membership/role check, organizationId enforcement, Exploitability, Severity, Decision.

1) [backend/src/controllers/authController.ts](backend/src/controllers/authController.ts#L77)
- Symbol/line: `User.findById(req.user.userId)` (getMeController)
- Model/Resource: `User` (canonical user record in MongoDB)
- Source of ID: `req.user.userId` (populated by `authenticateUser` middleware from JWT)
- Resource ownership: tenant-owned (user-level)
- Upstream auth middleware: `authenticateUser` (sets `req.user` and `req.organizationId`)
- Membership/role check: none required (fetches current user)
- organizationId enforcement: implicit via JWT (`req.user.organizationId`) but not enforced on query (query uses userId from token)
- Exploitability: Low — ID comes from authenticated token; callback flows that accept userId (see Gmail callback) are separate concerns
- Severity: LOW
- Decision: KEEP

2) [backend/src/controllers/gmailController.ts](backend/src/controllers/gmailController.ts#L72-L80, #L93)
- Symbol/line: `User.findById(userId).lean()` (getGmailStatus), and `state` in `gmailCallback` passes `userId` into `handleGmailCallback`
- Model/Resource: `User`
- Source of ID: `req.user.userId` for `/status`; `state` param (client-supplied redirect param) for `/callback`
- Resource ownership: tenant-owned
- Upstream auth middleware: `/status` uses `authenticateUser`; `/callback` intentionally does NOT use `authenticateUser` (redirect from Google)
- Membership/role check: none beyond `authenticateUser` for `/status`
- organizationId enforcement: none on DB query for `/status`; `/callback` trusts `state` value and performs `User.findById(userId)` without additional verification
- Exploitability: MEDIUM for `/callback` if `state` is tampered with (attacker could cause token write to another user) — mitigated because `state` is generated server-side in `/connect` and Google returns it unchanged, but it's still an external input
- Severity: HIGH for callback-originated writes until verified
- Decision: REFACTOR (explicitly verify `state` origin and bind callback to a temporary server-side nonce or session)

3) [backend/src/services/gmailAuthService.ts](backend/src/services/gmailAuthService.ts#L24-L36, #L74-L92, #L103-L132)
- Symbol/line: multiple `User.findById(userId)` usages in `refreshAccessToken`, `handleGmailCallback`, and `disconnectGmail`
- Model/Resource: `User`
- Source of ID: function parameter `userId` (propagated from controller: sometimes `req.user.userId`, sometimes `state`)
- Resource ownership: tenant-owned
- Upstream auth middleware: depends on caller; `disconnectGmail` and `refreshAccessToken` are called from authenticated controllers, but `handleGmailCallback` can be invoked via `/callback` with `state` from Google
- organizationId enforcement: none in these service queries — updates occur directly on User doc (e.g., `user.gmailTokens = updatedTokens` or `updateOne $unset`)
- Exploitability: MEDIUM (primarily for callback path); token persistence is unencrypted (see User model) — risk for token leakage
- Severity: HIGH
- Decision: REFACTOR (encrypt Gmail tokens at rest like Github tokens; harden callback binding)

4) [backend/src/services/gmailMessageService.ts](backend/src/services/gmailMessageService.ts#L1-L20, #L62-L70, #L100-L108)
- Symbol/line: `User.findById(userId)` in `getAuthenticatedGmailClient`
- Model/Resource: `User`
- Source of ID: `userId` param (from authenticated controllers like `listGmailMessagesController` where req.user is used)
- Resource ownership: tenant-owned
- Upstream auth middleware: callers typically use `authenticateUser`
- organizationId enforcement: none required (owner fetch)
- Exploitability: LOW
- Severity: LOW
- Decision: KEEP

5) [backend/src/services/gmailSyncService.ts](backend/src/services/gmailSyncService.ts#L1-L30, #L36-L48)
- Symbol/line: `User.findById(userId)` (several reads and refresh flows)
- Model/Resource: `User`
- Source of ID: `userId` param (called from controllers: usually authenticated `triggerGmailSync` or invoked after callback)
- Resource ownership: tenant-owned
- Upstream auth middleware: controller `triggerGmailSync` uses `authenticateUser`; callback-initiated sync occurs right after `handleGmailCallback` in `gmailController` (callback path lacks `authenticateUser`)
- organizationId enforcement: none on the read; sync writes detected events to Firestore only (`detected_events`) using `user.firebaseUid` and records `mongoUserId` in event docs
- Exploitability: MEDIUM (callback-initiated sync can run without auth context)
- Severity: HIGH for callback-initiated sync; MEDIUM otherwise
- Decision: REFACTOR (ensure callback sync is safe and nonce-bound; consider mirroring events to MongoDB or recording origin metadata)

6) [backend/src/controllers/resumeController.ts](backend/src/controllers/resumeController.ts#L188)
- Symbol/line: `ResumeTemplate.findById(templateId)` (processResumeController)
- Model/Resource: `ResumeTemplate` (MongoDB)
- Source of ID: client-supplied `templateId` in request body
- Resource ownership: tenant-scoped template (templates saved with `organizationId`)
- Upstream auth middleware: route is protected by `authenticateUser` (route under `/resume` router has `router.use(authenticateUser)`), but processResumeController does not explicitly verify template.organizationId === req.user.organizationId
- organizationId enforcement: MISSING on `findById` path (no check after fetch)
- Exploitability: MEDIUM — user could reference a template belonging to another org if only `findById` is used
- Severity: HIGH
- Decision: REFACTOR (verify template belongs to `req.user.organizationId` before using)

7) [backend/src/services/overlapService.ts](backend/src/services/overlapService.ts#L140-L152, #L172-L182)
- Symbol/line: `Section.findById(sectionId)` in `validateSection`
- Model/Resource: `Section`
- Source of ID: `sectionId` parameter (originates from client request to overlap service)
- Resource ownership: tenant-scoped (sections have `organizationId`)
- Upstream auth middleware: depends on caller; overlap API likely uses `enforceOrgIsolation` in routes (see `utils/api/overlapAPI.ts` usage)
- organizationId enforcement: PRESENT — `validateSection` compares `section.organizationId` to provided `organizationId` and throws if mismatch
- Exploitability: LOW (properly validated)
- Severity: LOW
- Decision: KEEP

8) [backend/src/services/growthService.ts](backend/src/services/growthService.ts#L155-L170)
- Symbol/line: `User.findById(userId).select('githubUsername').lean()` used by `getGithubMetrics`
- Model/Resource: `User`
- Source of ID: `userId` passed from `getMyGrowthHub` (reads `req.user.userId`)
- Resource ownership: tenant-owned
- Upstream auth middleware: `growthRoutes` uses `authenticateUser` and `enforceOrgIsolation`
- organizationId enforcement: enforced by `enforceOrgIsolation` at router level; queries in `getMarksMetrics`/`getEzoneMetrics` also include `organizationId` filters
- Exploitability: LOW
- Severity: LOW
- Decision: KEEP

9) [backend/src/services/authService.ts](backend/src/services/authService.ts#L68-L76, #L213-L220)
- Symbol/line: `Role.findById(normalizedRoleId)` and `User.findById(user._id).populate(['organizationId','roleId'])`
- Model/Resource: `Role`, `User`
- Source of ID: internal DB-derived IDs during login flows
- Resource ownership: Roles are tenant-scoped (role.organizationId exists); Users are tenant-owned
- Upstream auth middleware: N/A (login path)
- organizationId enforcement: Login flow populates organization and includes organizationId in JWT payload
- Exploitability: LOW
- Severity: LOW
- Decision: KEEP

10) Misc test & module entries (tests/growth.test.ts, research.module repository)
- Tests use `User.findById(auth.user.id)` (test harness). Not relevant for production exploitability but documented.

---

Notes:
- Where `findById` is used with an authenticated `req.user.userId`, the query is owner-scoped and acceptable (LOW risk) — still record and consider adding defensive org-checks for defense-in-depth.
- Paths that accept `userId` from external redirects (Gmail OAuth `state`) or client-supplied `templateId` require explicit org-validation/nonce checks (HIGH risk until mitigated).

Validation update:
- High-risk `findById` occurrences have been validated. Where an unauthenticated external input selects the ID (e.g., Gmail `state` callback) the finding is classified as PROVEN_VULNERABILITY (F-001). For client-supplied IDs used by authenticated users (e.g., `templateId`), the behavior is classified as CONFIRMED_RISK (F-003) for unauthorized use because the controller performs actions using the resource without a post-read ownership check; read/disclosure paths are not proven globally and remain UNKNOWN for some endpoints.
- Other `findById` usages that derive the ID from `req.user.userId` (set by `authenticateUser`) are considered owner-scoped and LOW risk but should still be reviewed for defense-in-depth where business-critical operations occur.
