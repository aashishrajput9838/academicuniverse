# Frontend State & Auth Storage Audit

Key findings:
- `AuthContext` stores the backend JWT in `localStorage` under key `authToken`. Evidence: `lib/AuthContext.tsx` (localStorage.setItem('authToken', ...)).
- `backendUser`, `backendToken` are kept in React context and used for API calls (Authorization: Bearer `backendToken`).
- No `sessionStorage` usage observed for auth.
- Some UI components read Firestore directly for event displays (e.g., `components/GmailEvents.tsx`) — possible mismatch between Firebase `uid` and Mongo `userId` mapping; frontend expects `user.firebaseUid` to correlate with Mongo `firebaseUid`.

Risks:
- Storing JWT in `localStorage` exposes it to XSS exfiltration. Consider storing in `httpOnly` cookies or secure storage for high-value tokens.

Recommendations:
- Evaluate switching to `SameSite`/`httpOnly` cookies for backend JWTs or ensure strong CSP and audit for XSS to defend localStorage use.
