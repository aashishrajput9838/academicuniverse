# Evidence Validation Matrix — Sprint 0

This matrix validates BLOCKER/HIGH/MEDIUM findings with exact code evidence and final classifications.

1) Finding ID: F-001
- Title: Gmail OAuth `state` binding allows attacker-controlled user selection
- Current severity: BLOCKER
- Final proposed severity: HIGH (PROVEN_VULNERABILITY)
- Classification: PROVEN_VULNERABILITY
- File path: `backend/src/services/gmailAuthService.ts`, `backend/src/controllers/gmailController.ts`, `backend/src/routes/gmailRoutes.ts`
- Exact symbols / lines:
  - `getGmailAuthUrl()` in `backend/src/services/gmailAuthService.ts` (sets `state: userId`) — see function body where `oauth2Client.generateAuthUrl({ ..., state: userId })`.
  - `gmailCallback` in `backend/src/controllers/gmailController.ts` (reads `const { code, state } = req.query; const userId = state as string; await handleGmailCallback(code as string, userId);`)
  - Route: `gmailRouter.get('/connect', authenticateUser, connectGmail);` and `gmailRouter.get('/callback', gmailCallback);` in `backend/src/routes/gmailRoutes.ts`.
- Source of attacker-controlled input: OAuth `state` query parameter in callback (attacker can craft consent URL with arbitrary state if client_id/redirect_uri are known).
- Authentication boundary: `/connect` requires `authenticateUser`; `/callback` is unauthenticated (no middleware).
- Authorization boundary: None on callback; `handleGmailCallback` performs `User.findById(userId)` and writes tokens.
- Tenant boundary: `userId` maps to a Mongo `User` document; no organizationId validation in callback path.
- Preconditions for exploitation: attacker can initiate OAuth consent flow (client_id and redirect_uri are application-level config; discoverable) and persuade Google to redirect with chosen `state` to app's `/api/gmail/callback` with valid `code` from a consenting Google account.
- End-to-end flow: authenticated user requests `/api/gmail/connect` → server returns auth URL with `state=userId` OR attacker crafts auth URL with arbitrary `state` and triggers user consent → Google redirects to `/api/gmail/callback?code=...&state=<attacker-chosen-userId>` → `gmailCallback` calls `handleGmailCallback(code, userId)` → service exchanges code for tokens and writes `user.gmailTokens` via `User.findById(userId)` → `syncGmailEvents(userId)` triggered.
- Security consequence: Attacker can map their Gmail tokens into another user's account, causing data integrity/availability/privacy issues (mailbox sync, impersonation-like effects).
- Confidence: HIGH
- False-positive risk: LOW
- Reproduction status: STATICALLY_PROVEN (complete control-flow is present in code); RUNTIME_REPRODUCED: NOT_REPRODUCED in this environment (requires real OAuth consent and network interactions).
- Recommended remediation priority: P0_BEFORE_SENSITIVE_RELEASE
- Recommendation action: server-side nonce or signed state with expiry; bind state to session; verify on callback; do not write tokens based only on external `state`.
- Notes: This is a proven code-level vulnerability because unauthenticated callback writes to a user chosen only by external input.

2) Finding ID: F-002
- Title: Gmail tokens stored without encryption on `User.gmailTokens`
- Current severity: HIGH
- Final proposed severity: HIGH (CONFIRMED_RISK)
- Classification: CONFIRMED_RISK
- File path: `backend/src/models/User.ts`, `backend/src/services/gmailAuthService.ts`
- Exact symbols / lines:
  - `IGmailTokens` interface and `gmailTokens` schema in `backend/src/models/User.ts` (fields: `accessToken`, `refreshToken`, `expiryDate`).
  - `handleGmailCallback` and `refreshAccessToken` assign `user.gmailTokens = updatedTokens; await user.save();` in `backend/src/services/gmailAuthService.ts`.
- Source of attacker-controlled input: N/A (storage behavior).
- Authentication boundary: token storage occurs server-side after token exchange.
- Authorization boundary: N/A for storage.
- Tenant boundary: tokens stored on per-User doc.
- Preconditions: none beyond normal OAuth flow; if MongoDB or backups are compromised, tokens are exposed.
- End-to-end flow: OAuth exchange returns tokens → service assigns plain strings to `user.gmailTokens` → persisted in MongoDB.
- Security consequence: Credentials stored in plaintext increase impact of DB compromise; refresh tokens enable long-term account access.
- Confidence: HIGH
- False-positive risk: LOW (no evidence of encryption hooks or application-level encryption before assignment found).
- Reproduction status: STATICALLY_PROVEN (storage behavior observed in code), RUNTIME_REPRODUCED: NOT_REPRODUCED (no exploit or leak to third-party observed).
- Rationale and distinction:
  - CONFIRMED_RISK: The audit confirms plaintext persistence which materially increases the impact of a DB compromise. However, this alone does not prove an independently exploitable server-side authorization bypass (no code path found that leaks tokens to unauthenticated callers). Therefore the correct classification is CONFIRMED_RISK (high severity) rather than PROVEN_VULNERABILITY which implies an independently exploitable authorization flaw.
- Recommended remediation priority: P0 (encrypt tokens at rest, consider secrets manager, rotate on disconnect).
- Notes: `githubAccessToken` uses an encrypted shape, demonstrating precedent for encryption at rest; Gmail tokens currently lack that.

3) Finding ID: F-003
- Title: Resume template processing uses client-supplied `templateId` without post-read org ownership check
- Current severity: HIGH
- Final proposed severity: HIGH (CONFIRMED_RISK)
- Classification: CONFIRMED_RISK
- File path: `backend/src/controllers/resumeController.ts`, `backend/src/routes/resumeRoutes.ts`
- Exact symbols / lines:
  - Route: `router.post('/generate', processResumeController);` in `backend/src/routes/resumeRoutes.ts` (router uses `router.use(authenticateUser)` but NOT `enforceOrgIsolation`).
  - `processResumeController` reads `const { templateId, data, tone } = req.body; const template = await ResumeTemplate.findById(templateId);` and proceeds without verifying `template.organizationId === req.user.organizationId`.
- Source of attacker-controlled input: `templateId` provided in request body by client.
- Authentication boundary: route protected by `authenticateUser` (JWT required).
- Authorization boundary: no explicit org-isolation or role check on template ownership in controller.
- Tenant boundary: `ResumeTemplate` schema includes `organizationId` (tenant-scoped) — see `backend/src/models/ResumeTemplate.ts` (model exists as tenant resource).
- Preconditions: attacker needs knowledge of a templateId belonging to another org; object ID guessing or leakage could enable this.
- End-to-end flow: authenticated user posts `templateId` → server fetches template by id → uses template to generate resume and saves StudentResume (studentResume findOneAndUpdate uses `{ userId: req.user.userId, templateId }` but template ownership not enforced) → action occurs using that template.
- Distinctions:
  - Unauthorized template use (generation using another org's template): PROVEN (controller performs action using template without ownership check).
  - Template metadata disclosure: NOT PROVEN (no direct unauthenticated or unauthorized read endpoint returning metadata to arbitrary callers was found).
  - Template content disclosure: NOT PROVEN (no code path found that returns full template content to unauthenticated callers).
  - Cross-tenant data exposure (read/disclosure): POSSIBLE but NOT PROVEN — the risk is primarily in unauthorized use for generation rather than a proven arbitrary read leak.
- Confidence: HIGH
- False-positive risk: LOW
- Reproduction status: STATICALLY_PROVEN
- Recommended remediation priority: P0 (enforce post-read org checks)
- Notes: Enforce `template.organizationId` equals `req.user.organizationId` after `findById` read.

4) Finding ID: F-004
- Title: Use of `localStorage` for backend JWT (`authToken`)
- Current severity: MEDIUM
- Final proposed severity: MEDIUM (CONFIRMED_RISK)
- Classification: CONFIRMED_RISK
- File path: `lib/AuthContext.tsx`
- Exact symbols / lines:
  - `localStorage.setItem('authToken', data.data.token);` in `lib/AuthContext.tsx` (exchangeToken and signIn flows).
- Source of attacker-controlled input: XSS can read localStorage — requires exploit of client-side XSS.
- Authentication boundary: client-side stored JWT used for Authorization header in API calls.
- Authorization boundary: server validates JWT on each request.
- Preconditions for exploitation: presence of a successful XSS vector in the frontend; otherwise token is not exposed.
- End-to-end flow: authToken stored in localStorage → used in `Authorization: Bearer` header for API calls → if attacker obtains token via XSS, they can call APIs as that user until token expiry.
- Security consequence: Token theft allows session takeover via API.
- Confidence: HIGH (implementation confirmed)
- False-positive risk: LOW
- Reproduction status: NOT_REPRODUCED (no XSS demonstrated)
- Recommended remediation priority: P1
- Notes: Classification as CONFIRMED_RISK because implementation is present but exploitation requires XSS; recommend defense-in-depth (httpOnly cookie or strict CSP).

5) Finding ID: F-005
- Title: Gemini / AI callsites send high-sensitivity data (full resume JSON, base64 images) to external model and persist outputs
- Current severity: MEDIUM
- Final proposed severity: MEDIUM (CONFIRMED_RISK)
- Classification: CONFIRMED_RISK
- File path / symbols:
  - `backend/src/services/aiService.ts` — `enhanceResumeFields` (sends full resume JSON to Gemini), `analyzeImage` (sends base64 image inlineData)
  - `backend/src/services/documentParserService.ts` — `parseDocumentData` sends base64Data
  - `backend/src/controllers/softSkillsController.ts` — `improveSentence` writes analysis to Firestore `softskills` collection
- Data categories sent: resume JSON (personal data, education, projects), base64 images (potential PII), student identifiers may be included in prompts/context.
- Authorization before retrieval: controllers using AI are typically protected by `authenticateUser` (e.g., soft skills), but data often comes from user uploads/inputs.
- Structured output validation: responses parsed via JSON.parse after naive markdown stripping in several places (some error handling exists but limited schema enforcement).
- Output persistence: writes to Firestore collections (`softskills`, `aiChats`, `moodLogs`, `research`) observed.
- Security consequence: PII exposure to external AI provider, risk of retention in Firestore.
- Confidence: MEDIUM
- False-positive risk: LOW-MEDIUM
- Reproduction status: STATICALLY_PROVEN (calls observable in code); RUNTIME_REPRODUCED: NOT_REPRODUCED here.
- Recommended remediation priority: P1
- Notes: Recommend data minimization, redaction, and schema validation before persisting.

6) Finding ID: F-006
- Title: Cloudinary upload pipeline lacks MIME whitelist and server-side content sniffing
- Current severity: MEDIUM
- Final proposed severity: MEDIUM (CONFIRMED_RISK)
- Classification: CONFIRMED_RISK
- File path: `backend/src/services/storageService.ts`, `backend/src/routes/resumeRoutes.ts`, `backend/src/controllers/resumeController.ts`
- Exact symbols / lines:
  - Multer config in `backend/src/routes/resumeRoutes.ts` sets `limits.fileSize` but no `fileFilter`.
  - `uploadResumeTemplate` in `backend/src/services/storageService.ts` uploads buffer to Cloudinary; Cloudinary options set `resource_type: 'raw'` and folder based on `organizationId`.
- Source of attacker-controlled input: uploaded file content and filename (used to construct `public_id` after sanitization with replacement for unsafe chars).
- Preconditions: attacker must be authenticated as faculty/admin (upload route requires role check) — however sanitization of `public_id` should be hardened.
- Security consequence: possibility of uploading dangerous file types if backend processing later executes or parses them; risk of storage of unexpected content.
- Confidence: MEDIUM
- False-positive risk: MEDIUM
- Reproduction status: STATICALLY_PROVEN
- Recommended remediation priority: P2
- Notes: Implement server-side MIME whitelist and stronger filename/public_id sanitization; ensure review-before-save for templates.

7) Finding ID: F-007
- Title: Backend tests fail in CI due to missing `MONGODB_URI` for test runtime
- Current severity: HIGH (CONFIGURATION_RISK)
- Final proposed severity: HIGH (CONFIGURATION_FAILURE)
- Classification: CONFIGURATION_FAILURE
- File path: `backend/src/config/database.ts`, `backend/src/index.ts`, `backend/package.json` (test script)
- Exact symbols / lines:
  - `resolveMongoUri()` throws when `isTestRuntime()` and `MONGODB_URI` not provided pointing to a test-only DB.
  - `startServer()` in `backend/src/index.ts` calls `connectDB()` and calls `process.exit(1)` on failure (seen in test run stack: `src/index.ts:196`).
- Reproduction status: RUNTIME_REPRODUCED (running `cd backend && npm test` produced exit code 1 and stack trace to `process.exit(1)`).
- Root cause: `MONGODB_URI` environment variable not set to a test DB; test runtime check requires an explicit test DB name.
- Recommended remediation priority: P1 (fix CI/test env); tests should be run against a dedicated test DB or use mocked DB.
- Notes: This is not a code vulnerability but blocks automated test runs.

---

Summary of matrix counts:
- PROVEN_VULNERABILITY: 1 (F-001)
- CONFIRMED_RISK: 6 (F-002, F-003, F-004, F-005, F-006, F-007 (configuration))
- Remaining UNKNOWN: Growth duplicate-call root cause; full per-file ownership verification where `findById` used in non-sensitive contexts.
