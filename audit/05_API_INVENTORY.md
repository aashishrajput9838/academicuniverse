# API Inventory (initial)

- Growth endpoints: `/api/growth/me` — evidence: [backend/tests/growth.test.ts](backend/tests/growth.test.ts#L47-L57) and frontend fetch at [app/dashboard/student/growth/page.tsx](app/dashboard/student/growth/page.tsx#L147).
- Gmail endpoints: controllers and services present under `backend/src/controllers/gmailController.ts` and `backend/src/services/gmailAuthService.ts`. Concrete routes observed: `GET /api/gmail/connect` (authenticated), `GET /api/gmail/callback` (unauthenticated), `GET /api/gmail/status` (authenticated), `POST /api/gmail/sync` (authenticated) — see `backend/src/routes/gmailRoutes.ts` and `backend/src/controllers/gmailController.ts`.
- Storage endpoints: resume/template upload uses Cloudinary via `storageService.ts` — evidence: [backend/src/services/storageService.ts](backend/src/services/storageService.ts#L75-L86).
- AI endpoints: `backend/src/controllers/aiController.ts` interacts with `aiChats` in Firestore and a provider layer.
