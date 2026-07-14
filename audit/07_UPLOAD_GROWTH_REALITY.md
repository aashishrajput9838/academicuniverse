# Upload & Growth Reality

Growth summary:
- Frontend fetch to `/api/growth/me` at [app/dashboard/student/growth/page.tsx](app/dashboard/student/growth/page.tsx#L147).
- Backend tests exercise `/api/growth/me` repeatedly: [backend/tests/growth.test.ts](backend/tests/growth.test.ts#L47-L57).
- Duplicate calls present in tests and observed in frontend component lifecycle; root cause unresolved — requires runtime tracing in dev (React Strict Mode/double mount, network retries, or test harness behavior).

Uploads (timetables/resumes): Cloudinary-based in `storageService.ts` (`upload_stream`). Evidence: [backend/src/services/storageService.ts](backend/src/services/storageService.ts#L78-L86).

Validation note: Growth duplicate-call is marked UNKNOWN for root cause until a dev runtime trace is performed; do not assume code bug without runtime evidence.
