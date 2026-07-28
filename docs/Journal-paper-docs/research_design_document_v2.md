# RESEARCH DESIGN DOCUMENT (RDD) v2.0
**An Integrated SaaS Ecosystem with Document Intelligence, Event-Driven Microservices, and Multi-Tenant Role-Based Access Control for Higher Education**

**Document Version:** 2.0.0 (Audited & Implementation-Backed)  
**Author:** Principal Software Auditor & Research Verification Engineer  
**Repository:** `aashishrajput9838/academicuniverse` (`c:\github\academicuniverse.com\academicuniverse`)  
**Audit Status:** Fully Verified Against Production Codebase (0 Unverified Performance Claims)

---

## EXECUTIVE SUMMARY & SYSTEM ARCHITECTURE

### 1. Executive Summary
Modern Higher Education Institutions (HEIs) operate in a digital landscape hampered by fragmented software solutions. Students and faculty must continuously context-switch between disconnected web portals—one for term-end marks, another for daily attendance, separate tools for resume building, isolated portals for certificate validation, and third-party AI interfaces. This fragmentation incurs administrative overhead, degrades user experience, prevents real-time skill verification, and risks cross-tenant privacy leaks.

**Academic Universe** is a cloud-native Software-as-a-Service (SaaS) platform engineered to unify academic tracking, verified career profiling, document intelligence, and interactive learning into a single ecosystem. Built upon a full-stack architecture—comprising a **Next.js 14 App Router** frontend, a **Node.js/Express TypeScript** Domain-Driven Design (DDD) backend, **MongoDB Atlas**, **Firebase/Firestore**, and a dual-provider AI engine (**Google Gemini 1.5 Pro** and **OpenRouter**)—Academic Universe provides a unified digital campus platform.

---

## SECTION I: SYSTEM ARCHITECTURE & CODE TRACEABILITY

```
+---------------------------------------------------------------------------------+
|                                 CLIENT LAYER                                    |
|  Next.js 14 App Router | React 18 | Zustand Stores + Immer | Tailwind CSS      |
|  (GrowthStore, ReviewStore, AuthStore, ModuleVisibilityProvider)                |
+---------------------------------------------------------------------------------+
                                         |
                                         | HTTPS / REST APIs (JWT Bearer)
                                         v
+---------------------------------------------------------------------------------+
|                           API & MIDDLEWARE GATEWAY                              |
|  Express.js | CORS Policy | Request ID Middleware | Performance Monitor         |
|  authenticateUser Middleware | enforceOrgIsolation Middleware                  |
|  moduleGuard (In-Memory Feature Flag Enforcement)                               |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                        DOMAIN-DRIVEN APPLICATION LAYER                          |
|  +---------------------------+  +--------------------------+  +--------------+  |
|  | Document Intelligence DIC |  | Event-Driven Skill Engine|  | E-Zone Sync  |  |
|  | (OCRService, EntityDet)   |  | (SkillsEventListener)    |  | (Playwright) |  |
|  +---------------------------+  +--------------------------+  +--------------+  |
|  +---------------------------+  +--------------------------+  +--------------+  |
|  | AI Provider Factory       |  | Resume Generation Engine |  | Gmail Sync   |  |
|  | (Gemini <-> OpenRouter)   |  | (DocxTemplateFiller)     |  | (OAuth2)     |  |
|  +---------------------------+  +--------------------------+  +--------------+  |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                            DATA & PERSISTENCE LAYER                             |
|  MongoDB Atlas Cluster (Primary Data, Soft Deletes, Replica Set Transactions)   |
|  GridFS Binary Store (PDFs, Images, Certificates)                              |
|  Firebase / Firestore (Real-time events, notifications)                         |
+---------------------------------------------------------------------------------+
```

### 1. Domain-Driven Design (DDD) Layers & Code Evidence
- **Presentation Layer** (`backend/src/routes`, `backend/src/controllers`): Manages HTTP request decoding, schema validation, response formatting (`sendResponse`, `sendError`), and route mapping.
  - *Traceability*: [backend/src/routes/index.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/routes/index.ts), [backend/src/shared/utils/response.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/shared/utils/response.ts).
- **Application Layer** (`backend/src/services`, `backend/src/modules/*/*.service.ts`): Orchestrates business workflows, coordinates domain services, executes database transactions, and dispatches domain events.
  - *Traceability*: [backend/src/modules/growth/growthUpload.service.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/modules/growth/growthUpload.service.ts), [backend/src/services/growthService.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/services/growthService.ts).
- **Domain Layer** (`backend/src/models`, `backend/src/shared/events`): Defines core entities, schemas (`UaipUpload`, `KnowledgeRecord`, `SkillRecord`), value objects, and domain events (`SkillUpdated`).
  - *Traceability*: [backend/src/models/UaipUpload.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/models/UaipUpload.ts), [backend/src/models/KnowledgeRecord.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/models/KnowledgeRecord.ts), [backend/src/shared/events/skillsEventListener.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/shared/events/skillsEventListener.ts).
- **Infrastructure Layer** (`backend/src/storage`, `backend/src/core/ai`, `backend/src/config`): Manages external integrations—MongoDB connection pools, GridFS streaming, Cloudinary APIs, Playwright web scrapers, and AI model providers.
  - *Traceability*: [backend/src/storage/GridFSProvider.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/storage/GridFSProvider.ts), [backend/src/core/ai/ai.factory.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/core/ai/ai.factory.ts), [backend/src/config/database.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/config/database.ts).

### 2. Multi-Tenant Authorization & Security Isolation
- **Authentication**: JWT tokens decoded via `authenticateUser` middleware in [backend/src/middleware/auth.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/middleware/auth.ts).
- **Organization Isolation**: `enforceOrgIsolation` middleware in [backend/src/middleware/auth.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/middleware/auth.ts) validates that `req.user.organizationId` matches incoming body/parameter inputs; queries append `{ organizationId: req.organizationId }`.
- **Firebase Authentication Fallback**: `authenticateFirebaseUser` in [backend/src/middleware/auth.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/middleware/auth.ts) decodes Firebase ID tokens, matching with MongoDB `User` records by `firebaseUid` or `email`.

### 3. AI Factory & Failover Pipeline
- Interface `IAIProvider` in [backend/src/core/ai/ai.provider.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/core/ai/ai.provider.ts).
- Factory `AIProviderFactory` in [backend/src/core/ai/ai.factory.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/core/ai/ai.factory.ts) manages provider initialization:
  - **Primary**: `GeminiAIProvider` ([backend/src/core/ai/gemini.provider.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/core/ai/gemini.provider.ts)) using `@google/genai` (Google Gemini 1.5 Pro).
  - **Fallback**: `OpenRouterAIProvider` ([backend/src/core/ai/openrouter.provider.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/core/ai/openrouter.provider.ts)) using Axios HTTP requests to OpenRouter (`gpt-4o-mini`).
  - **Development**: `MockAIProvider` ([backend/src/core/ai/mock.provider.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/core/ai/mock.provider.ts)).

---

## SECTION II: IMPLEMENTATION-BACKED MODULE INVENTORY

Every module specification below is verified against active production code.

---

### MODULE 1: Growth Hub
- **Purpose**: Consolidates academic marks, attendance, connected GitHub repositories, subject performance, and certificate uploads into a single dashboard.
- **Backend Implementation**: [growth.controller.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/modules/growth/growth.controller.ts), [growthUpload.service.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/modules/growth/growthUpload.service.ts), [growthService.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/services/growthService.ts).
- **Frontend Implementation**: [app/dashboard/student/growth/page.tsx](file:///c:/github/academicuniverse.com/academicuniverse/app/dashboard/student/growth/page.tsx), [GrowthUploadPanel.tsx](file:///c:/github/academicuniverse.com/academicuniverse/components/GrowthUploadPanel.tsx), [growthUploadStore.ts](file:///c:/github/academicuniverse.com/academicuniverse/app/dashboard/student/growth/store/growthUploadStore.ts).
- **APIs**: `GET /api/growth/me`, `POST /api/growth/documents`, `GET /api/growth/uploads`, `GET /api/growth/uploads/:processingId`.
- **Collections**: `uaip_uploads`, `marks`, `ezone_academic_profiles`, `github_records`, `knowledge_records`.
- **Verification Status**: 🟢 **VERIFIED**

---

### MODULE 2: Document Intelligence Center (DIC)
- **Purpose**: Document ingestion, classification, OCR extraction, Human-in-the-Loop (HITL) review, draft saving, approval, rejection, and soft-deletion.
- **Backend Implementation**: [documentIntelligence.controller.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/modules/documentIntelligence/documentIntelligence.controller.ts), [documentIntelligence.repository.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/modules/documentIntelligence/documentIntelligence.repository.ts), [OCRService.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/services/ocr/OCRService.ts).
- **Frontend Implementation**: [app/dashboard/student/document-intelligence/page.tsx](file:///c:/github/academicuniverse.com/academicuniverse/app/dashboard/student/document-intelligence/page.tsx).
- **APIs**: `GET /api/document-intelligence/documents`, `DELETE /api/document-intelligence/documents/:processingId`, `DELETE /api/document-intelligence/documents/review-required`, `POST /api/review/:processingId/approve`, `POST /api/review/:processingId/reject`, `POST /api/review/:processingId/rollback`.
- **Collections**: `uaip_uploads`, `knowledge_records`, `review_histories`, `marks`, `certificate_records`.
- **Verification Status**: 🟢 **VERIFIED**

---

### MODULE 3: Code Arena
- **Purpose**: Algorithmic coding challenge portal with automated test execution, AI complexity diagnostics, peer reputation points, and leaderboards.
- **Backend Implementation**: [codeArena.controller.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/modules/codeArena/codeArena.controller.ts), [codeArena.service.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/modules/codeArena/codeArena.service.ts).
- **Frontend Implementation**: [app/dashboard/student/code/page.tsx](file:///c:/github/academicuniverse.com/academicuniverse/app/dashboard/student/code/page.tsx), [components/features/code-arena/](file:///c:/github/academicuniverse.com/academicuniverse/components/features/code-arena/).
- **APIs**: `GET /api/code-arena/issues`, `POST /api/code-arena/issues`, `POST /api/code-arena/solutions`, `GET /api/code-arena/reputation`, `GET /api/code-arena/leaderboard`.
- **Collections**: `code_arena_issues`, `code_arena_solutions`, `code_arena_reputations`, `code_arena_point_transactions`.
- **Verification Status**: 🟢 **VERIFIED**

---

### MODULE 4: Soft Skills Lab 2.0
- **Purpose**: Text-based communication scoring, tone identification, grammar feedback, daily challenges, and historical attempt analytics.
- **Backend Implementation**: [softSkillsController.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/controllers/softSkillsController.ts).
- **Frontend Implementation**: [app/dashboard/student/soft-skills/page.tsx](file:///c:/github/academicuniverse.com/academicuniverse/app/dashboard/student/soft-skills/page.tsx), [components/features/soft-skills/](file:///c:/github/academicuniverse.com/academicuniverse/components/features/soft-skills/).
- **APIs**: `POST /api/softskills/analyze`, `GET /api/softskills/history`, `GET /api/softskills/challenges`.
- **Collections**: `user_soft_skills_attempts`, `skills_records`.
- **Verification Status**: 🟢 **VERIFIED**

---

### MODULE 5: Resume Builder & Automated Generator
- **Purpose**: Student profile data extraction, template tag validation, placeholder injection, docxtemplater filling, PDF conversion, and thumbnail rendering.
- **Backend Implementation**: [resumeController.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/controllers/resumeController.ts), [placeholderInjector.service.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/services/placeholderInjector.service.ts), [docxTemplateFiller.service.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/services/docxTemplateFiller.service.ts).
- **Frontend Implementation**: [app/dashboard/student/resume-builder/page.tsx](file:///c:/github/academicuniverse.com/academicuniverse/app/dashboard/student/resume-builder/page.tsx).
- **APIs**: `GET /api/resume/templates`, `POST /api/resume/generate`, `POST /api/resume/parse-job`, `GET /api/resume/health`.
- **Collections**: `resume_templates`, `resume_jobs`, `student_resumes`, `resume_entities`.
- **Verification Status**: 🟢 **VERIFIED**

---

### MODULE 6: E-Zone Sync Engine
- **Purpose**: Headless browser automation for institutional portal authentication, Playwright/Cheerio scraping of marks/attendance, and optional Google Sheets archiving.
- **Backend Implementation**: [ezoneSyncService.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/modules/ezone/services/ezoneSyncService.ts), [googleSheetsService.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/modules/ezone/services/googleSheetsService.ts), [ezone-session.provider.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/modules/ezone/providers/ezone-session.provider.ts).
- **Frontend Implementation**: [app/dashboard/student/ezone-sync/page.tsx](file:///c:/github/academicuniverse.com/academicuniverse/app/dashboard/student/ezone-sync/page.tsx).
- **APIs**: `POST /api/growth/ezone-sync`.
- **Collections**: `ezone_academic_profiles`, `marks`, `attendance_cards`.
- **Verification Status**: 🟢 **VERIFIED**

---

### MODULE 7: Gmail Events & Calendar Integration
- **Purpose**: Google OAuth2 token authorization, history API polling, email message pattern parsing for academic events, and event storage.
- **Backend Implementation**: [gmailController.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/controllers/gmailController.ts), [gmailSyncService.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/services/gmailSyncService.ts), [gmailMessageService.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/services/gmailMessageService.ts).
- **Frontend Implementation**: [app/dashboard/student/events/page.tsx](file:///c:/github/academicuniverse.com/academicuniverse/app/dashboard/student/events/page.tsx).
- **APIs**: `GET /api/gmail/auth-url`, `GET /api/gmail/callback`, `GET /api/gmail/events`, `POST /api/gmail/sync`.
- **Collections**: `users` (tokens), `audit_entries`.
- **Verification Status**: 🟢 **VERIFIED**

---

### MODULE 8: Research Wing
- **Purpose**: Academic literature searching, paper abstract analysis, AI contribution summary generation, and BibTeX citation formatting.
- **Backend Implementation**: [research.controller.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/modules/research/research.controller.ts), [research.service.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/modules/research/research.service.ts).
- **Frontend Implementation**: [app/dashboard/student/research/page.tsx](file:///c:/github/academicuniverse.com/academicuniverse/app/dashboard/student/research/page.tsx).
- **APIs**: `GET /api/research/search`, `POST /api/research/analyze`, `POST /api/research/export-bibtex`.
- **Collections**: `research_paper_records`.
- **Verification Status**: 🟢 **VERIFIED**

---

### MODULE 9: Overlap Engine
- **Purpose**: Course syllabus textual comparison, credit transfer equivalence estimation, topic overlap breakdown.
- **Backend Implementation**: [overlapController.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/controllers/overlapController.ts), [overlapService.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/services/overlapService.ts).
- **Frontend Implementation**: [app/dashboard/student/overlap/page.tsx](file:///c:/github/academicuniverse.com/academicuniverse/app/dashboard/student/overlap/page.tsx).
- **APIs**: `POST /api/overlap-engine/analyze`.
- **Collections**: `subject_skill_mappings`, `marks`.
- **Verification Status**: 🟢 **VERIFIED**

---

### MODULE 10: Skills Tracker & Event-Driven Engine
- **Purpose**: Canonical skill catalogue, alias mapping, evidence linkage, and asynchronous domain event subscription (`skillsEventListener.ts`).
- **Backend Implementation**: [skillsController.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/controllers/skillsController.ts), [skillsEventListener.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/shared/events/skillsEventListener.ts), [eventBus.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/services/eventBus.ts).
- **Frontend Implementation**: [app/dashboard/student/skills/page.tsx](file:///c:/github/academicuniverse.com/academicuniverse/app/dashboard/student/skills/page.tsx).
- **APIs**: `GET /api/skills/me`, `GET /api/skills/canonical`, `POST /api/skills/evidence`.
- **Collections**: `canonical_skills`, `skill_aliases`, `skill_records`, `skill_evidences`.
- **Verification Status**: 🟢 **VERIFIED**

---

### MODULE 11: Module Management & System Visibility (Admin)
- **Purpose**: Dynamic feature flag management, global and organizational module toggling, batch updates, and zero-db-latency in-memory middleware checking (`moduleGuard`).
- **Backend Implementation**: [moduleVisibilityController.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/controllers/moduleVisibilityController.ts), [moduleVisibility.service.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/services/moduleVisibility.service.ts), [moduleVisibility.middleware.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/middleware/moduleVisibility.middleware.ts).
- **Frontend Implementation**: [app/admin/module-management/page.tsx](file:///c:/github/academicuniverse.com/academicuniverse/app/admin/module-management/page.tsx), [lib/moduleVisibility.tsx](file:///c:/github/academicuniverse.com/academicuniverse/lib/moduleVisibility.tsx).
- **APIs**: `GET /api/module-visibility`, `POST /api/module-visibility/batch`, `POST /api/module-visibility/:key/toggle`.
- **Collections**: `module_visibilities`, `module_population_logs`.
- **Verification Status**: 🟢 **VERIFIED**

---

## SECTION III: DATABASE & STORAGE ARCHITECTURE

### 1. MongoDB Replica Set Transactions & Soft Delete
Soft deletion and candidate workflows are strictly transaction-safe:
- Implementation: [documentIntelligence.repository.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/modules/documentIntelligence/documentIntelligence.repository.ts).
- Detects cluster capabilities via `admin().command({ isMaster: 1 })`.
- Executes `UaipUpload.bulkWrite` and `KnowledgeRecordModel.updateMany` inside a single session transaction (`startTransaction()`), committing or rolling back atomically.

### 2. GridFS Binary Storage
- Implementation: [GridFSProvider.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/storage/GridFSProvider.ts).
- Manages binary PDF and image stream uploads, streaming content directly from MongoDB GridFS buckets without filling Node.js RAM buffers.

---

## SECTION IV: EMPIRICAL EVALUATION & BENCHMARK PLAN

*(Note: All quantitative figures are strictly designated as pending experimental measurement to uphold peer-review integrity.)*

1. **Document Extraction Accuracy Benchmark (Pending Evaluation)**:
   - Target test set: 500 ground-truth academic marksheets and certificates.
   - Evaluation metrics: Field-level Precision, Recall, F1-Score across Gemini 1.5 Pro and OpenRouter (`gpt-4o-mini`).
   - *Status*: Experimental validation pending.

2. **System Load & Concurrency Benchmark (Pending Evaluation)**:
   - Target test tool: k6 HTTP load runner.
   - Evaluation metrics: P95 latency (ms), Memory footprint (MB), HTTP 200 throughput under 1,000 concurrent user requests.
   - *Status*: Experimental validation pending.

---

## SECTION V: FUTURE SCOPE & RESEARCH EXTENSIONS

The following features represent planned future enhancements (distinct from implemented modules):
1. **Blockchain-Backed Verifiable Credentials**: Direct issuing of W3C Verifiable Credentials (VCs) to decentralized digital wallets upon HITL document approval.
2. **Predictive Academic Trend Forecasting**: Machine learning models forecasting multi-semester SGPA trajectories based on attendance and internal assessment trends.
3. **Multilingual Voice Soft-Skills Evaluation**: Speech-to-text and acoustic pitch analysis for real-time interview preparation.
