# Authentication, Authorization & Tenant Isolation

- Auth client-side: JWT stored in `localStorage` under key `authToken`. Evidence: [lib/AuthContext.tsx](lib/AuthContext.tsx#L71-L75, L257-L259), components reading `localStorage.getItem('authToken')` (e.g., [components/UploadTimetableModal.tsx](components/UploadTimetableModal.tsx#L59)).
- Backend auth flow: controllers use `req.user` and services call `User.findById(req.user.userId)` in multiple places. Evidence: [backend/src/controllers/authController.ts](backend/src/controllers/authController.ts#L77), [backend/src/controllers/profileController.ts](backend/src/controllers/profileController.ts#L38).
- Tenant isolation findings:
  - Direct `findById(...)` calls fetch user and related objects without immediate `organizationId` enforcement in the same query (e.g., `User.findById(userId)` in [backend/src/services/gmailAuthService.ts](backend/src/services/gmailAuthService.ts#L26-L27)).
  - There are places where `organizationId` is present in requests/URLs (e.g., [utils/api/overlapAPI.ts](utils/api/overlapAPI.ts#L27-L32)).

Decision: BLOCKER for tenant isolation until a sweep verifies `organizationId` enforcement on all tenant-owned read/write operations.

Validation note: inspected and reconciled. High-risk flows (Gmail `state` callback) are PROVEN_VULNERABILITY (F-001). Client-supplied IDs used by authenticated users (e.g., `templateId`) are CONFIRMED_RISK for unauthorized use (F-003). Remaining `findById` occurrences are marked LOW risk unless they involve external input; full per-file ownership verification remains an UNKNOWN for some low-priority files.
