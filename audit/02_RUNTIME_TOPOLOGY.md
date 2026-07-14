# Runtime Topology

- Frontend: Next.js App Router (TypeScript) — evidence: presence of `app/` directory with `page.tsx`, `layout.tsx` (app/page.tsx, app/layout.tsx).
- Backend: Node.js + Express + TypeScript — evidence: `backend/package.json`, `backend/src/controllers/*`, `backend/ARCHITECTURE_DIAGRAM.md`.
- Primary DB: MongoDB (Mongoose) — evidence: [lib/mongodb.ts](lib/mongodb.ts#L1-L9), README note: "Primary DB: MongoDB 7 (Mongoose ODM)".
- Real-time DB: Firebase Firestore — evidence: `firestore.rules`, references in [OVERLAP_ENGINE.md](OVERLAP_ENGINE.md#L18) and `backend/src/controllers/*` using `firebaseFirestore.collection`.
- Storage: Cloudinary — evidence: [backend/src/config/cloudinary.ts](backend/src/config/cloudinary.ts#L5-L8), [backend/src/services/storageService.ts](backend/src/services/storageService.ts#L75-L86).
- AI: Google Gemini integrations and provider modules — evidence: [backend/testImage.ts](backend/testImage.ts#L9-L25), modular docs.
- Ports: local backend previously observed on port 10000 — verification: UNKNOWN (no explicit `10000` found in scanned files). Verify by checking `start-dev.bat` or `backend` run scripts.
