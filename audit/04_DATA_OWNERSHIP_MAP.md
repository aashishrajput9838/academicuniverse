# Data Ownership Map

- MongoDB (canonical): user profiles, marks, roles, resumes, growth entities. Evidence: Mongoose models and `lib/mongodb.ts` (lib/mongodb.ts lines ~1-35) and README notes.
- Firestore (real-time/event/research): detected events, aiChats, research docs, ezoneSyncSessions. Evidence: `backend/src/services/gmailSyncService.ts` writes to `firebaseFirestore.collection('detected_events')` and `backend/src/controllers/aiController.ts` uses `firebaseFirestore.collection('aiChats')`.
- Cloudinary: resume templates and uploaded assets. Evidence: [backend/src/services/storageService.ts](backend/src/services/storageService.ts#L75-L86) and [backend/src/config/cloudinary.ts](backend/src/config/cloudinary.ts#L5-L8).
Ownership notes and unknowns:
  - Whether Firestore event documents are mirrored to MongoDB canonical collections is UNKNOWN — verify sync jobs or services (e.g., `gmailSyncService`, `gmailMessageService`).
  - Confidence per domain: MongoDB ownership: HIGH (canonical models exist for user, resume, growth). Firestore ownership: MEDIUM (used for ephemeral/event and AI logs; some services write to Firestore but full canonical mirroring not proven). Cloudinary ownership: HIGH for template storage (upload paths show org foldering), but content processing/metadata exposure unknown.
