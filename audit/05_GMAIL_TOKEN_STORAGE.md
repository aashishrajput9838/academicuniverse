# Gmail Token Storage Verification

Objective: verify exact schema fields, encryption, rotation, logging, and clearing behavior.

Findings (evidence-backed):

- Schema definition: `backend/src/models/User.ts` defines `gmailTokens` as:
  - `accessToken: String`
  - `refreshToken: String`
  - `expiryDate: Number`
  Evidence: `backend/src/models/User.ts` (IGmailTokens and schema field `gmailTokens`).

- Encryption/hooks: No encryption transform, plugin, or mongoose hook protecting `gmailTokens` was found in the model. `githubAccessToken` uses `{ encryptedToken, iv }` which indicates encryption for GitHub tokens, but `gmailTokens` is stored as plain fields.
  Evidence: `backend/src/models/User.ts` (githubAccessToken shape vs gmailTokens shape).

- Storage at rest: MongoDB will store the string values as-is (no encryption observed in code). No vault/secret manager integration is used for Gmail tokens.

- Logging exposure: Code contains some diagnostic logs around Gmail flows (e.g., `console.log` in `disconnectGmail` and `getGmailStatus`) but does NOT directly print token values in main code paths. However, test scripts and tmp scripts (e.g., `backend/tmp-gmail-user-query.js`, `backend/testGmailSync.ts`) include `.select('gmailTokens.accessToken gmailTokens.refreshToken')` in queries which could cause accidental logging in test tooling. Search results: repository references to `gmailTokens.accessToken`.

- Disconnect behavior: `disconnectGmail(userId)` uses `User.updateOne({ _id: userId }, { $unset: { gmailTokens: "" } })` and then re-reads the document to verify the field removal. The controller `disconnectGmailAccount` calls this service and returns success. Evidence: `backend/src/services/gmailAuthService.ts` (disconnectGmail) and `backend/src/controllers/gmailController.ts` (disconnectGmailAccount).

- Refresh behavior: `refreshAccessToken(userId)` reads the user, uses `oauth2Client.refreshAccessToken()` then writes `user.gmailTokens = updatedTokens; await user.save();`. The code preserves existing refresh token if Google doesn't return a new one. Evidence: `backend/src/services/gmailAuthService.ts` (refreshAccessToken).

Risk assessment:
- Tokens stored in plaintext in MongoDB: MEDIUM-HIGH risk (sensitive tokens stored unencrypted). If MongoDB credentials leak, Gmail tokens would be exposed.
- Logging: No evidence of token values logged in primary service code, but some test scripts reference token fields — developers should avoid selecting raw tokens in logs and test tools.

Recommendations:
1. Adopt consistent token encryption for Gmail tokens similar to `githubAccessToken` (encrypt `accessToken` and `refreshToken` with a server-side key, store IV and rotated key metadata). Consider `node-keytar` or a dedicated secrets manager for production.
2. Minimize selecting full token values in test scripts and remove any accidental logging of tokens from debug prints.
3. On disconnect, rotate stored token metadata and revoke tokens server-side where applicable (call Google token revoke endpoint) to prevent reuse.
