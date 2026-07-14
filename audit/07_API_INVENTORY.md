# API Inventory (route mounts, methods, auth middleware)

Top-level mount: `app.use('/api', routes)` in `backend/src/index.ts`.

Routes (selected):
- `/api/gmail` → mount file: `backend/src/routes/gmailRoutes.ts`
  - `GET /connect` — `authenticateUser` → `connectGmail`
  - `GET /callback` — NO auth → `gmailCallback`
  - `GET /status` — `authenticateUser` → `getGmailStatus`
  - `GET /stats` — `authenticateUser` → `getGmailStatsController`
  - `GET /messages` — `authenticateUser` → `listGmailMessagesController`
  - `GET /messages/:messageId` — `authenticateUser` → `getGmailMessageController`
  - `POST /messages/:messageId/read` — `authenticateUser` → `markGmailMessageReadController`
  - `DELETE /disconnect` — `authenticateUser` → `disconnectGmailAccount`
  - `POST /sync` — `authenticateUser` → `triggerGmailSync`

- `/api/growth` → `backend/src/routes/growthRoutes.ts`
  - `GET /me` — protected by `authenticateUser, enforceOrgIsolation` → `getMyGrowthHub`

- `/api/resume` → `backend/src/routes/resumeRoutes.ts` (router uses `authenticateUser` for all)
  - `POST /templates` — `upload.single('templateFile')` + role checks in controller
  - `GET /templates` — lists org templates
  - `POST /generate` — generates resume using templateId (note: uses `findById(templateId)` without org check)

- `/api/ai` and AI endpoints: see `backend/src/routes/aiRoutes.ts` (various AI endpoints, many protected by `authenticateUser`)

Notes:
- `/api/gmail/callback` is an unauthenticated endpoint and is the critical path for OAuth token writes. Confirmed existence: `backend/src/routes/gmailRoutes.ts`.
- `/api/growth/me` exists and is protected by org isolation (evidence: `growthRoutes` uses `authenticateUser, enforceOrgIsolation`).

Actionable evidence files:
- `backend/src/routes/index.ts` — full mount list
- `backend/src/routes/gmailRoutes.ts` — Gmail endpoints and middleware per route
