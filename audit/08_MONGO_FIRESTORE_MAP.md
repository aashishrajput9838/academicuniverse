# MongoDB vs Firestore Ownership Map

Canonical MongoDB models (primary truth):
- `User` — `backend/src/models/User.ts` (canonical user, auth tokens, organizationId, roleId, github tokens, gmailTokens)
- `Mark`, `ResumeTemplate`, `StudentResume`, `Section`, `Organization`, `Role`, `Timetable`, `EzoneAcademicProfile` — `backend/src/models/*`

Firestore collections (derived/real-time/analytics):
- `detected_events` — Gmail sync events (written by `backend/src/services/gmailSyncService.ts` into Firestore)
- `aiChats`, `moodLogs`, `softskills`, `research` — AI/chat/analysis logs written to Firestore by controllers (`aiController`, `softSkillsController`, `researchController`)
- `ezoneSyncSessions`, `test_collection` — various derived data

Sync direction and duplicates:
- MongoDB → canonical for user profiles, permissions, marks, resumes, templates, and organizational data.
- Firestore → used for derived events, analytics, AI logs, and user-facing quick-read collections. Not authoritative for core domain objects.
- Example: Gmail connection status is canonical in MongoDB (`User.gmailTokens`) and not in Firestore. `getGmailStatus` reads MongoDB.

Risks found:
- Some flows rely on Firestore-derived data for UI elements (e.g., `components/GmailEvents.tsx` reads `detected_events` to display events) — ensure UI does not treat Firestore as source-of-truth for permissions or ownership.

Recommendations:
- List each domain object in a central mapping file (this document) and ensure controllers always consult MongoDB for authoritative reads/writes for those domain objects.
- If Firestore data is used for quick reads, include cross-checks to canonical MongoDB documents for authorization-sensitive operations.
