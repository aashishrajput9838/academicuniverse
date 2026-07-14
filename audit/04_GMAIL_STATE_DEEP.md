# Gmail OAuth `state` Deep Trace

Summary:
- `getGmailAuthUrl(userId)` generates an OAuth URL and sets `state: userId` (plain string). Evidence: `backend/src/services/gmailAuthService.ts` (getGmailAuthUrl).
- The OAuth callback handler `gmailCallback` reads `state` from the query and treats it as `userId`, then calls `handleGmailCallback(code, userId)` which updates `User.findById(userId)` and writes `user.gmailTokens`.
  Evidence: `backend/src/controllers/gmailController.ts` (gmailCallback) and `backend/src/services/gmailAuthService.ts` (handleGmailCallback).

Exact observed behavior (proof):
- State creation: `getGmailAuthUrl` sets `state: userId` and returns the URL to the authenticated user (controller `connectGmail` calls it). There is NO cryptographic signing, nonce, or server-side mapping of `state`.
- State contents: raw `userId` (string form of MongoDB ObjectId). Not encoded, not signed, not timestamped.
- Session binding: No server-side session or temporary store binds the generated `state` to an authenticated browser session. The connect flow simply returns the URL to the client.
- Callback verification: `gmailCallback` only checks `if (!code || !state)` and then treats `state` as `userId`; there is NO verification of state integrity, expiry, or origin.
- Replay prevention: None observed. No one-time nonce, no expiry stored, no server-side mapping to prevent replay.

Exploitability analysis (proof-backed):
- Attack path: Any external actor who can perform an OAuth consent flow using the application's client_id & redirect_uri can provide an arbitrary `state` value pointing to a target `userId` and complete Google consent. When Google redirects to the app's `/callback` with `code` and `state`, the app will exchange `code` for tokens and write them into the MongoDB user identified by the `state` value.
- Feasibility considerations:
  - The OAuth client_id and redirect URI are not secrets; they are required to construct the consent URL and are typically discoverable from the client or environment. Therefore an attacker can craft the URL manually.
  - The app does not require the redirect to carry any browser session cookie or server-side nonce to validate that the `state` was generated for that session.
  - Google will return the same `state` value the initiator provided — so the attacker controls the `state` round-trip.
- Consequences:
  - Tokens from the consenting Google account (attacker's account) will be written to the target user's `gmailTokens` field. This allows the attacker to cause inbox data to be synced into the victim's account or to make the victim's account act on behalf of the attacker's mailbox (privacy/integrity violation).
  - Because `gmailTokens` are used as the canonical connection indicator (`getGmailStatus` checks for its presence), the victim will appear 'connected' to the attacker's mailbox.

Severity classification (evidence-based):
- Proven exploitability: YES — the code paths demonstrate a complete exploit path with no server-side validation between state and authenticated session.
- Severity: HIGH — writing attacker-controlled OAuth tokens into another user's account results in data integrity and privacy violations (attacker's mailbox content mapped into victim's account), and can be automated at scale.

Remediation (prioritized):
1. Replace raw `state` usage with a server-generated cryptographic nonce bound to an authenticated session (store nonce → userId mapping server-side with short expiry). On callback verify nonce exists, matches userId, and is not replayed.
2. Alternatively, encode and sign the `state` with an HMAC containing userId and expiry using a server secret, and verify signature and expiry on callback.
3. Require callback to occur with a session cookie (or perform additional backend checks) so that only the user who initiated the flow can complete it.
4. Add logging/alerts for callback events where `state` userId differs from an authenticated session (for future hardening).

References:
- `backend/src/services/gmailAuthService.ts` (getGmailAuthUrl, handleGmailCallback)
- `backend/src/controllers/gmailController.ts` (connectGmail, gmailCallback, getGmailStatus)
