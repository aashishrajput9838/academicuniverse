# Frontend State & UX Surfaces

Auth storage: `localStorage` used for `authToken`. Evidence: [lib/AuthContext.tsx](lib/AuthContext.tsx#L71-L75, L257-L259), components call `localStorage.getItem('authToken')` (e.g., [components/UploadTimetableModal.tsx](components/UploadTimetableModal.tsx#L59)).

Validation note: storage behavior is CONFIRMED_RISK; exploitation requires XSS (no XSS demonstrated here). Recommend P1 remediation planning.
Gmail UI: `components/GmailEvents.tsx` reads `gmail_success`/`gmail_error` URL params. Evidence: [components/GmailEvents.tsx](components/GmailEvents.tsx#L54-L61).

Validation note: UI reads these params and calls backend `/api/gmail/status`; no direct client-side write to user records observed (backend callback is unauthenticated). See F-001 in evidence matrix.
- Live sync / logs: `components/ezone/LiveSyncLogs.tsx` uses Firestore `onSnapshot('ezoneSyncSessions', sessionId)` to present live session logs. Evidence: [components/ezone/LiveSyncLogs.tsx](components/ezone/LiveSyncLogs.tsx#L50-L59).
