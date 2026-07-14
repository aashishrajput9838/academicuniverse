# Gmail Reality Audit

Evidence summary:

- `backend/src/controllers/gmailController.ts` mounts routes `/connect`, `/callback`, `/status`, `/messages`, `/disconnect`, `/sync` under `/api/gmail`.
- `getGmailStatus` uses `User.findById(userId).lean()` and returns `connected: userLean?.hasOwnProperty('gmailTokens')` — status derived from MongoDB `User.gmailTokens`, not Firestore.
- `gmailAuthService.handleGmailCallback` saves tokens directly to `user.gmailTokens` and uses `user.save()`; `disconnectGmail` uses `updateOne({ $unset: { gmailTokens: '' } })` to remove them.
- `backend/src/models/User.ts` defines `gmailTokens` as plain fields `{ accessToken, refreshToken, expiryDate }` (no encryption wrapper), while `githubAccessToken` uses `{ encryptedToken, iv }` shape indicating encryption at rest for GitHub tokens.
- Frontend: `components/GmailEvents.tsx` calls `/api/gmail/status`, `/api/gmail/connect`, `/api/gmail/sync`, `/api/gmail/disconnect` and expects `detected_events` in Firestore for rendered events.

Risks & Recommendations:

- Token storage: Gmail tokens are stored unencrypted in MongoDB — recommend encrypting with same pattern as `githubAccessToken` or using a secrets manager (HIGH).
- Callback path (`/callback`) relies on `state` param containing `userId` — this is an external input and must be validated using a server-side nonce/session mapping to prevent token write to an arbitrary user (HIGH).
- Sync flows: callback-initiated sync can run immediately without authenticated request — ensure the sync validates origin and associates any events with expected `organizationId`/`firebaseUid` (MEDIUM).

Confirmed behaviors:

- `getGmailStatus` uses MongoDB user doc to determine connection status (correct canonical source).
- `disconnectGmail` unsets `gmailTokens` and verifies removal.

Action items:

- Encrypt Gmail tokens at rest and rotate tokens on disconnect.
- Replace `state` with a cryptographically-bound nonce stored server-side (or encode organizationId in signed state) and verify on callback.
- Add organizationId verification on any callback-initiated write/sync action.

Validation update:

- The `state` handling is confirmed to use raw `userId` in `getGmailAuthUrl` and `gmailCallback` consumes it directly without verification (see audit/14_EVIDENCE_VALIDATION_MATRIX.md F-001). The static control flow that allows selecting the target `User` document based on the `state` parameter is present in code and therefore classified as PROVEN_VULNERABILITY (STATICALLY_PROVEN). No runtime exploit was performed.
- The Gmail token storage is confirmed to persist plaintext `accessToken`/`refreshToken` strings into MongoDB via `user.gmailTokens`. This is classified as a CONFIRMED_RISK (high severity) because while storage is plaintext and increases impact of DB compromise, no direct unauthenticated token-read path was found in code. See audit/14_EVIDENCE_VALIDATION_MATRIX.md F-002 for detailed rationale.
