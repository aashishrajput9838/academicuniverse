# 🎓 Academic Universe - Comprehensive Codebase Index

> [!NOTE]
> This document provides a detailed, hierarchical index of the Academic Universe codebase. It covers all major directories, key files, and their purposes to serve as a quick reference for development and onboarding.

---

## 🏗️ System Architecture Overview

Academic Universe is a high-performance, multi-tenant SaaS platform built for holistic student development.

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Radix UI, Zustand
- **Backend**: Node.js, Express 5, TypeScript. Currently undergoing migration to modular (DDD/DI) architecture.
- **Databases**:
  - **MongoDB (Primary)**: Stores Users, Organizations, Marks, Resumes, Sections, Roles
  - **Firestore (Real-time)**: Stores Detected Events, Logs, Research state, Documents
  - **GridFS**: Stores large files (resumes, documents, uploads)
- **AI Integration**: Google Gemini API (gemini-2.5-flash) via AI Factory pattern
- **External Integrations**: GitHub (Coding Analytics), Gmail (Event Extraction via sync), Ezone (Academic profiles), Cloudinary (Media storage)
- **Monitoring**: Sentry (Error tracking), Custom Log Analyzer

---

## 📁 Complete Directory Structure Index

### Root Level

| Path | Type | Purpose |
|------|------|---------|
| `app/` | dir | Next.js App Router frontend pages |
| `components/` | dir | Reusable React components |
| `lib/` | dir | Frontend utilities, models, and client config |
| `backend/` | dir | Express.js backend API server |
| `hooks/` | dir | Custom React hooks |
| `utils/` | dir | Shared frontend utilities |
| `styles/` | dir | Global CSS styles |
| `public/` | dir | Static assets (images, logos) |
| `scripts/` | dir | Build and utility scripts |
| `storage/` | dir | Frontend storage providers (GridFS client) |
| `logs/` | dir | Application log files |
| `analysis/` | dir | Analysis scripts and outputs |
| `audit/` | dir | Security and architecture audit documents |
| `log-analyzer/` | dir | Separate AI log analysis service |
| `tmp/` | dir | Temporary files and exports |
| `test/` | dir | Frontend test samples |

---

### 1. Frontend (`/app`, `/components`, `/lib`, `/hooks`, `/utils`)

#### 1.1 Next.js App Router (`/app`)

The frontend follows the Next.js App Router paradigm with role-based routing.

**Root & Layout:**
- `app/layout.tsx` - Root layout with AuthProvider, FirebaseInit, Toaster
- `app/page.tsx` - Landing page with role-based redirect (admin/faculty/student)
- `app/globals.css` - Global styles
- `app/error.tsx` - Global error boundary with AI log reporting
- `app/global-error.tsx` - Critical error boundary
- `app/icon.svg` - App icon

**Authentication:**
- `app/login/page.tsx` - Login page

**Admin Panel (`/app/admin`):**
- `app/admin/sections/page.tsx` - Section management
- `app/admin/assign-representative/page.tsx` - Representative assignment
- `app/admin/timetable-status/page.tsx` - Timetable upload monitoring
- `app/admin/users/page.tsx` - User management

**Faculty Dashboard (`/app/dashboard/faculty`):**
- `app/dashboard/faculty/layout.tsx` - Faculty dashboard layout
- `app/dashboard/faculty/page.tsx` - Faculty dashboard home
- `app/dashboard/faculty/ai/page.tsx` - AI assistant for faculty
- `app/dashboard/faculty/analytics/page.tsx` - Analytics dashboard
- `app/dashboard/faculty/career-growth/page.tsx` - Career growth tracking
- `app/dashboard/faculty/courses/page.tsx` - Course management
- `app/dashboard/faculty/grades/page.tsx` - Grade management
- `app/dashboard/faculty/research/page.tsx` - Research tools
- `app/dashboard/faculty/resources/page.tsx` - Resource management
- `app/dashboard/faculty/resume-templates/page.tsx` - Resume template management
- `app/dashboard/faculty/students/page.tsx` - Student management

**Student Dashboard (`/app/dashboard/student`):**
- `app/dashboard/student/layout.tsx` - Student dashboard layout
- `app/dashboard/student/page.tsx` - Student dashboard home
- `app/dashboard/student/career/page.tsx` - Career guidance
- `app/dashboard/student/chatbot/page.tsx` - AI chatbot
- `app/dashboard/student/code/page.tsx` - Code/GitHub analytics
- `app/dashboard/student/document-intelligence/page.tsx` - Document processing
- `app/dashboard/student/events/page.tsx` - Events timeline
- `app/dashboard/student/ezone-sync/page.tsx` - Ezone integration
- `app/dashboard/student/faculty-cabin/page.tsx` - Faculty communication
- `app/dashboard/student/growth/page.tsx` - Growth hub dashboard
  - `growthApi.ts` - Growth API client
  - `reviewApi.ts` - Review API client
  - `store/growthStore.ts` - Growth state management
  - `store/growthUploadStore.ts` - Upload state management
  - `types/growth.ts` - Growth type definitions
  - `types/growthUpload.ts` - Upload type definitions
- `app/dashboard/student/mail/page.tsx` - Gmail integration
- `app/dashboard/student/mail/[messageId]/page.tsx` - Individual message view
- `app/dashboard/student/overlap/page.tsx` - Timetable overlap engine
- `app/dashboard/student/records/page.tsx` - Academic records
- `app/dashboard/student/research/page.tsx` - Research assistant
- `app/dashboard/student/resume-builder/page.tsx` - AI resume builder
- `app/dashboard/student/skills/page.tsx` - Skills tracking
- `app/dashboard/student/soft-skills/page.tsx` - Soft skills analysis
- `app/dashboard/student/webscrap/page.tsx` - Web scraping tools

**API Routes (`/app/api`):**
- `app/api/uaip/upload/route.ts` - UAIP document upload endpoint
- `app/api/sentry-example-api/route.ts` - Sentry example API
- `app/api/sentry-example-page/page.tsx` - Sentry test page
- `app/test-crash/page.tsx` - Crash testing page

#### 1.2 React Components (`/components`)

**Shared UI Components:**
- `components/ui/` - Radix UI component library (60+ components)
  - `accordion.tsx`, `alert.tsx`, `alert-dialog.tsx`, `aspect-ratio.tsx`, `avatar.tsx`, `badge.tsx`, `breadcrumb.tsx`, `button.tsx`, `calendar.tsx`, `card.tsx`, `carousel.tsx`, `chart.tsx`, `checkbox.tsx`, `collapsible.tsx`, `command.tsx`, `context-menu.tsx`, `dialog.tsx`, `drawer.tsx`, `dropdown-menu.tsx`, `form.tsx`, `hover-card.tsx`, `input-otp.tsx`, `input.tsx`, `label.tsx`, `menubar.tsx`, `navigation-menu.tsx`, `pagination.tsx`, `popover.tsx`, `progress.tsx`, `radio-group.tsx`, `resizable.tsx`, `scroll-area.tsx`, `select.tsx`, `separator.tsx`, `sheet.tsx`, `sidebar.tsx`, `skeleton.tsx`, `slider.tsx`, `sonner.tsx`, `switch.tsx`, `tabs.tsx`, `textarea.tsx`, `toast.tsx`, `toaster.tsx`, `toggle-group.tsx`, `toggle.tsx`, `tooltip.tsx`
  - `theme-provider.tsx` - Dark/light theme provider
  - `use-toast.ts` - Toast hook
  - `use-mobile.tsx` - Mobile detection hook

**Feature Components:**
- `components/Navbar.tsx` - Main navigation bar
- `components/HeroSection.tsx` - Landing page hero
- `components/FeaturedPrograms.tsx` - Featured programs section
- `components/CTASection.tsx` - Call to action section
- `components/Footer.tsx` - Site footer
- `components/GrowthHeader.tsx` - Growth hub header
- `components/GrowthUploadPanel.tsx` - Growth upload panel
- `components/Sidebar.tsx` - Dashboard sidebar
- `components/Announcements.tsx` - Announcements display
- `components/QuickLinks.tsx` - Quick navigation links
- `components/Testimonials.tsx` - Testimonials carousel
- `components/HeroBackground.tsx` - Hero background animation
- `components/GithubActivityCard.tsx` - GitHub activity display
- `components/GitHubProjects.tsx` - GitHub projects display
- `components/GmailEvents.tsx` - Gmail events display
- `components/FilePreviewModal.tsx` - File preview modal
- `components/UploadTimetableModal.tsx` - Timetable upload modal
- `components/AcademicProfileCard.tsx` - Academic profile card
- `components/AttendanceCard.tsx` - Attendance display card
- `components/MarksOverviewCard.tsx` - Marks overview card
- `components/SubjectPerformanceCard.tsx` - Subject performance card
- `components/FeatureSections.tsx` - Feature sections
- `components/FirebaseInit.tsx` - Firebase initialization
- `components/timetableHelper.ts` - Timetable parsing utilities

**Chat Components (`/components/chat`):**
- `ChatWindow.tsx` - Main chat interface
- `ChatInput.tsx` - Chat input component
- `MessageBubble.tsx` - Message display component
- `MoodSelector.tsx` - Mood selection for AI context

**Research Wing (`/components/ResearchWing`):**
- `TopicGenerator.tsx` - AI topic generation
- `OutlineGenerator.tsx` - AI outline generation
- `ContentWriter.tsx` - AI content writing
- `FinalizePaper.tsx` - Paper finalization
- `FinalExport.tsx` - Export functionality
- `ResearchHistory.tsx` - Research history display

**Resume Builder (`/components/Resume`):**
- `ResumeBuilder.tsx` - Main resume builder
- `TemplateList.tsx` - Template selection
- `TemplateEditor.tsx` - Template editing
- `TemplateUploadForm.tsx` - Template upload form

**Soft Skills (`/components/SoftSkills`):**
- `SentenceInput.tsx` - Sentence input for analysis
- `AnalysisResult.tsx` - Analysis results display
- `HistoryList.tsx` - History list
- `DailyChallenge.tsx` - Daily challenge component

**Ezone (`/components/ezone`):**
- `LiveSyncLogs.tsx` - Ezone sync logs display

#### 1.3 Frontend Libraries (`/lib`)

**Core Utilities:**
- `lib/utils.ts` - cn() utility for class merging (clsx + tailwind-merge)
- `lib/mongodb.ts` - MongoDB connection utility (cached)
- `lib/firebase.ts` - Firebase client initialization
- `lib/AuthContext.tsx` - Authentication context provider

**API Clients (`/lib/api`):**
- `lib/api/ezone.ts` - Ezone API client
- `lib/api/timetableService.ts` - Timetable service client
- `lib/api/overlapAPI.ts` - Overlap engine API client
- `utils/api.ts` - General API utilities
- `utils/eventClassification.ts` - Event classification utilities

**Frontend Models (`/lib/models`):**
- `User.ts` - User type definitions
- `AcademicGrowthMetrics.ts` - Growth metrics types
- `AchievementVerification.ts` - Achievement types
- `ResearchProject.ts` - Research project types
- `CodingStats.ts` - Coding statistics types

#### 1.4 Custom Hooks (`/hooks`)

- `hooks/use-toast.ts` - Toast notification hook
- `hooks/use-mobile.tsx` - Mobile viewport detection hook

---

### 2. Backend (`/backend/src`)

The backend is an Express application currently being migrated from MVC to modular DDD/DI architecture.

#### 2.1 Entry Point & Configuration

- `backend/src/index.ts` - Main entry point, Express app setup, middleware, routes
- `backend/src/config/` - Configuration files
  - `database.ts` - MongoDB connection
  - `firebaseAdmin.ts` - Firebase Admin initialization
  - `cloudinary.ts` - Cloudinary configuration
  - `sentry.ts` - Sentry error tracking setup
  - `constants.ts` - Application constants
  - `index.ts` - Config barrel export

#### 2.2 Core Infrastructure (`/backend/src/core`)

- `backend/src/core/ai/` - AI Provider infrastructure
  - `ai.provider.ts` - IAIProvider interface
  - `ai.factory.ts` - AI Provider factory (singleton pattern)
  - `gemini.provider.ts` - Google Gemini implementation
  - `openrouter.provider.ts` - OpenRouter implementation
  - `mock.provider.ts` - Mock provider for testing
  - `failover.provider.ts` - Failover provider for resilience
  - `index.ts` - Core AI exports

#### 2.3 Authentication (`/backend/src/auth`)

New DDD-style auth module:
- `provider.ts` - IAuthProvider interface
- `providerRegistry.ts` - Provider registry
- `emailProvider.ts` - Email/password provider
- `googleProvider.ts` - Google OAuth provider
- `resolverInstance.ts` - Auth resolver singleton
- `authResolver.ts` - Authentication orchestrator
- `authRequest.dto.ts` - Auth request DTO
- `authResponse.dto.ts` - Auth response DTO

#### 2.4 Legacy MVC Architecture (`/backend/src/controllers`, `/services`, `/models`, `/routes`)

**Controllers (18 files):**
- `authController.ts` - Authentication endpoints
- `marksController.ts` - Marks/academic records
- `githubController.ts` - GitHub integration
- `githubOAuthController.ts` - GitHub OAuth flow
- `gmailController.ts` - Gmail integration
- `aiController.ts` - AI assistant endpoints
- `dashboardController.ts` - Dashboard data
- `growthController.ts` - Growth hub
- `overlapController.ts` - Timetable overlap
- `resumeController.ts` - Resume builder
- `researchController.ts` - Research assistant
- `softSkillsController.ts` - Soft skills analysis
- `profileController.ts` - User profiles
- `sectionController.ts` - Section management
- `usersController.ts` - User management
- `reviewController.ts` - Document review
- `academicRecordController.ts` - Academic records

**Services (27+ files):**
- `authService.ts` - Authentication business logic
- `userService.ts` - User management
- `githubService.ts` - GitHub API integration
- `githubOAuthService.ts` - GitHub OAuth
- `gmailAuthService.ts` - Gmail authentication
- `gmailMessageService.ts` - Gmail message operations
- `gmailSyncService.ts` - Gmail event sync
- `aiService.ts` - Gemini AI integration
- `overlapService.ts` - Timetable overlap calculation
- `resumeService.ts` - Resume generation (DOCX)
- `growthService.ts` - Growth hub metrics
- `schedulerService.ts` - Background job scheduling
- `upload-service.ts` - File upload handling
- `documentParserService.ts` - Document parsing orchestration
- `pipeline-orchestrator.ts` - UAIP pipeline orchestration
- `eventBus.ts` - In-process event bus
- `logForwarder.ts` - Log forwarding
- `exportService.ts` - Data export
- `analyticsService.ts` - Analytics calculations
- `roleDetectionService.ts` - Role detection logic
- `roleService.ts` - Role management
- `storageService.ts` - Storage abstraction
- `classification/` - Document classification
  - `DocumentClassifier.ts` - ML-based document classification
- `parsing/` - Document parsing
  - `ParserFactory.ts` - Parser factory
  - `pdfParser.ts` - PDF parsing
  - `excelParser.ts` - Excel parsing
  - `csvParser.ts` - CSV parsing
  - `imageParser.ts` - Image parsing
  - `txtParser.ts` - Text file parsing
  - `ParserService.ts` - Parsing orchestration
  - `ParserInterface.ts` - Parser interface
- `ocr/` - Optical character recognition
  - `OCRFactory.ts` - OCR provider factory
  - `OCRService.ts` - OCR orchestration
  - `IOcrProvider.ts` - OCR provider interface
  - `providers/TesseractProvider.ts` - Tesseract implementation
  - `repositories/IOcrIdempotencyRepository.ts` - OCR idempotency interface
  - `repositories/MongoOcrIdempotencyRepository.ts` - MongoDB implementation

**Models (30 files - Mongoose Schemas):**
- `User.ts` - User schema
- `Organization.ts` - Organization schema
- `Role.ts` - Role schema
- `Permission.ts` - Permission schema
- `RolePermission.ts` - Role-Permission junction
- `Section.ts` - Section schema
- `Mark.ts` - Marks schema
- `AcademicRecord.ts` - Academic record schema
- `AcademicSchedule.ts` - Schedule schema
- `Timetable.ts` - Timetable schema
- `Document.ts` - Document schema
- `DocumentRegistry.ts` - Document registry schema
- `Person.ts` - Person schema
- `AuthMethod.ts` - Auth method schema
- `ReviewHistory.ts` - Review history schema
- `EzoneAcademicProfile.ts` - Ezone profile schema
- `GithubRecord.ts` - GitHub record schema
- `ResearchPaperRecord.ts` - Research paper schema
- `ResumeTemplate.ts` - Resume template schema
- `StudentResume.ts` - Student resume schema
- `GrowthHubRecord.ts` - Growth hub record schema
- `CareerRecord.ts` - Career record schema
- `CertificateRecord.ts` - Certificate schema
- `ExperienceRecord.ts` - Experience schema
- `KnowledgeRecord.ts` - Knowledge record schema
- `KnowledgeJob.ts` - Knowledge job schema
- `UaipUpload.ts` - UAIP upload schema
- `AILogAnalysis.ts` - AI log analysis schema
- `AuditEntry.ts` - Audit trail schema
- `index.ts` - Model barrel export

**Routes (22 files):**
- `index.ts` - Route barrel export with all mounted paths
- `authRoutes.ts` - `/auth`
- `marksRoutes.ts` - `/marks`
- `githubRoutes.ts` - `/github`
- `gmailRoutes.ts` - `/gmail`
- `aiRoutes.ts` - `/ai`
- `dashboardRoutes.ts` - `/dashboard`
- `overlapRoutes.ts` - `/overlap-engine`
- `resumeRoutes.ts` - `/resume`
- `timetableRoutes.ts` - `/timetable`
- `sectionRoutes.ts` - `/sections`
- `usersRoutes.ts` - `/users`
- `logRoutes.ts` - `/logs`
- `softSkillsRoutes.ts` - `/softskills`
- `growthRoutes.ts` - `/growth`
- `documentRegistryRoutes.ts` - `/document-registry`
- `exportRoutes.ts` - `/export`
- `reviewRoutes.ts` - `/review`
- `documentIntelligenceRoutes.ts` - `/document-intelligence`
- `profileRoutes.ts` - `/profile`
- `academicRecordRoutes.ts` - `/academic-record`
- `researchRoutes.ts` - `/research` (modular)

#### 2.5 Modular Architecture (`/backend/src/modules`)

New feature-based modules following DDD/DI patterns:

**Research Module (`/backend/src/modules/research`):**
- `research.controller.ts` - HTTP request handling
- `research.service.ts` - Business logic
- `research.repository.ts` - Firestore data access
- `research.types.ts` - Type definitions
- `research.routes.ts` - Route definitions
- `index.ts` - Module exports

**Growth Module (`/backend/src/modules/growth`):**
- `growth.controller.ts` - Growth endpoints
- `growthProfile.service.ts` - Growth profile logic
- `growthProfile.types.ts` - Profile types
- `growthProjection.service.ts` - Growth projections
- `growthProjection.types.ts` - Projection types
- `growthUpload.service.ts` - Upload handling
- `documentRegistry.controller.ts` - Document registry
- `growth.types.ts` - Growth types

**Document Intelligence Module (`/backend/src/modules/documentIntelligence`):**
- `documentIntelligence.controller.ts` - Document endpoints
- `documentIntelligence.service.ts` - Document processing logic
- `documentIntelligence.repository.ts` - Data access
- `documentIntelligence.types.ts` - Type definitions
- `__tests__/documentDeletion.test.ts` - Deletion tests

**Ezone Module (`/backend/src/modules/ezone`):**
- `controllers/ezone.controller.ts` - Ezone endpoints
- `routes/ezone.routes.ts` - Ezone routes
- `services/ezone.service.ts` - Core Ezone service
- `services/ezoneSyncService.ts` - Sync orchestration
- `services/ezoneDataMapper.ts` - Data mapping
- `services/ezoneDataValidator.ts` - Data validation
- `services/ezone-logger.service.ts` - Ezone logging
- `services/googleSheetsService.ts` - Google Sheets integration
- `repositories/ezone.repository.ts` - Data access
- `providers/ezone-session.provider.ts` - Session management
- `scrapers/ezone.scraper.ts` - Web scraping
- `scrapers/ezone.explorer.ts` - Explorer utilities
- `utils/ezoneUtils.ts` - Ezone utilities
- `index.ts` - Module exports

#### 2.6 Shared Infrastructure (`/backend/src/shared`)

**Application Layer:**
- `shared/application/routingEngine.ts` - UAIP routing engine
- `shared/application/timetableHelper.ts` - Timetable parsing
- `shared/application/uaipConfig.ts` - UAIP configuration
- `shared/application/UaipDocumentAi.service.ts` - Document AI service
- `shared/application/UaipFacade.ts` - Facade for UAIP pipeline
- `shared/application/UaipFacade.types.ts` - Facade type definitions

**Repositories:**
- `shared/repositories/academicRecord.repository.ts` - Academic record access
- `shared/repositories/certificateRecord.repository.ts` - Certificate access
- `shared/repositories/document.repository.ts` - Document access
- `shared/repositories/documentRegistry.repository.ts` - Registry access
- `shared/repositories/experienceRecord.repository.ts` - Experience access
- `shared/repositories/knowledgeJob.repository.ts` - Knowledge job access

**Services:**
- `shared/services/academicRecord.service.ts` - Academic record logic
- `shared/services/certificate.service.ts` - Certificate logic
- `shared/services/documentProcessing.service.ts` - Document processing
- `shared/services/documentStorage.service.ts` - Document storage
- `shared/services/experience.service.ts` - Experience logic
- `shared/services/knowledgeDispatcher.service.ts` - Knowledge dispatch
- `shared/services/knowledgeQueue.service.ts` - Knowledge queue
- `shared/services/ocr.service.ts` - OCR service
- `shared/services/personResolver.service.ts` - Person resolution
- `shared/services/review.service.ts` - Review logic

**Middleware:**
- `shared/middleware/auth.middleware.ts` - Authentication middleware
- `shared/middleware/index.ts` - Middleware barrel

**Utilities:**
- `shared/utils/index.ts` - Utility barrel
- `shared/utils/jwt.util.ts` - JWT utilities
- `shared/utils/logger.util.ts` - Logger utilities
- `shared/utils/response.util.ts` - Response helpers

**Enums:**
- `shared/enums/knowledgeJobStatus.enum.ts` - Knowledge job states

**Errors:**
- `shared/errors/custom.error.ts` - Custom error classes
- `shared/errors/index.ts` - Error barrel

**Documents:**
- `shared/document/document.types.ts` - Document type definitions

**Tests:**
- `shared/application/__tests__/timetableHelper.test.ts`
- `shared/application/__tests__/UaipDocumentAi.test.ts`

#### 2.7 Other Backend Structure

**Storage (`/backend/src/storage`):**
- `StorageProvider.ts` - Storage abstraction interface
- `GridFSProvider.ts` - GridFS implementation

**Events (`/backend/src/events`):**
- `EventBus.ts` - In-process event bus
- `UaipEvents.ts` - UAIP event definitions

**Utils (`/backend/src/utils`):**
- `encryption.ts` - Encryption utilities
- `errors.ts` - Error classes
- `exportUtils.ts` - Export utilities
- `jwt.ts` - JWT generation/verification
- `logger.ts` - Winston logger setup
- `mongooseHelpers.ts` - Mongoose utilities
- `response.ts` - Response helpers
- `stageLogger.ts` - Stage logging
- `timetableParser.ts` - Timetable parsing

**Scripts (`/backend/src/scripts`):**
- `improve_inspect.ts` - Runtime inspection
- `improve_runtime_debug.ts` - Runtime debugging
- `improve_runtime_debug2.ts` - Runtime debugging v2

**Input Data (`/backend/src/input data`):**
- `download.xls` - Sample input data

**Runtime:**
- `runtime_instrument.js` - Runtime instrumentation

---

### 3. Backend Tests (`/backend/test`, `/backend/tests`)

**Unit/Integration Tests:**
- `backend/tests/gmailAuth.test.ts` - Gmail auth tests
- `backend/tests/gmailTokenEncryption.test.ts` - Token encryption tests
- `backend/tests/growth.test.ts` - Growth service tests
- `backend/tests/rbac.test.ts` - RBAC tests
- `backend/tests/research-ai.test.ts` - Research AI tests
- `backend/tests/research-history.test.ts` - Research history tests
- `backend/tests/research.service.test.ts` - Research service tests
- `backend/tests/export.spec.ts` - Export tests
- `backend/tests/export.test.ts` - Export unit tests
- `backend/tests/mocks/` - Test mocks
- `backend/test/samples/` - Test sample files
- `backend/services/__tests__/PipelineOrchestrator.test.ts`
- `backend/services/classification/__tests__/DocumentClassifier.test.ts`
- `backend/modules/documentIntelligence/__tests__/documentDeletion.test.ts`

---

### 4. Log Analyzer (`/log-analyzer`)

Separate service for AI-powered log analysis:
- `log-analyzer/package.json` - Dependencies
- `log-analyzer/src/server.ts` - Express server
- `log-analyzer/src/aiService.ts` - AI analysis service
- `log-analyzer/tsconfig.json` - TypeScript config

---

### 5. GitHub Workflows (`/.github/workflows`)

- `.github/workflows/ci.yml` - Main CI pipeline
- `.github/workflows/rbac-integration.yml` - RBAC integration tests

---

### 6. Key Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Root dependencies and scripts |
| `tsconfig.json` | Root TypeScript configuration |
| `tailwind.config.ts` | Tailwind CSS configuration |
| `next.config.mjs` | Next.js configuration |
| `postcss.config.mjs` | PostCSS configuration |
| `eslint.config.mjs` | ESLint configuration |
| `components.json` | shadcn/ui component configuration |
| `jest.config.cjs` | Jest test configuration |
| `firebase.json` | Firebase hosting configuration |
| `firestore.indexes.json` | Firestore composite indexes |
| `firestore.rules` | Firestore security rules |
| `.firebaserc` | Firebase project aliases |
| `Dockerfile` | Docker container definition |
| `sentry.edge.config.ts` | Sentry Edge configuration |
| `sentry.server.config.ts` - Sentry Server configuration |
| `global.d.ts` | Global TypeScript declarations |
| `next-env.d.ts` | Next.js environment types |
| `instrumentation.ts` | OpenTelemetry instrumentation |
| `instrumentation-client.ts` | Client-side instrumentation |
| `.env.example` | Environment variables template |
| `.env.local` | Local environment overrides |
| `.env` | Environment variables |
| `serviceAccountKey.json` | Firebase service account key |

---

## 🔑 Key Concepts & Workflows

### Multi-Tenancy & RBAC
- Every user belongs to an `organizationId`
- Roles: `STUDENT`, `FACULTY`, `ADMIN`, `SUPER_ADMIN`
- Permissions-based access control (RBAC)
- Automatic role assignment based on email domains (e.g., `@ug.sharda.ac.in` → STUDENT)

### Authentication Flow
1. Frontend uses Firebase Auth to get ID token
2. Token sent to backend `/auth` endpoints
3. Backend verifies Firebase token
4. Backend issues custom JWT with embedded permissions
5. Frontend stores JWT for subsequent requests

### Modular Backend Migration
- Legacy MVC: Controllers → Services → Models
- New Modular: Controller → Service → Repository per feature
- Research module is the reference implementation
- Ezone module follows similar pattern
- Growth and Document Intelligence partially modularized

### AI Factory Pattern
- `backend/src/core/ai/ai.factory.ts` - Singleton factory
- `IAIProvider` interface abstracts AI implementation
- Current providers: Gemini, OpenRouter, Mock, Failover
- Easy to swap underlying models

### UAIP (Universal Academic Intelligence Pipeline)
- Unified document processing pipeline
- Handles upload, parsing, OCR, classification, AI extraction
- Facade pattern (`UaipFacade.ts`) encapsulates complexity
- Used by Growth, Document Intelligence, and other modules

### Growth Hub
- Aggregates metrics from multiple sources (Marks, GitHub, Ezone, Resume)
- State machine pattern: `AVAILABLE`, `EMPTY`, `NOT_CONNECTED`, `NOT_SYNCED`, `UNAVAILABLE`, `ERROR`
- Upload-based processing through UAIP

### Document Intelligence
- Multi-format document parsing (PDF, Excel, CSV, Images, Text)
- OCR via Tesseract
- AI-powered classification and extraction
- Document registry for tracking

---

## 📊 File Count Summary

| Category | Approximate Count |
|----------|-------------------|
| Frontend Pages | 25+ |
| Frontend Components | 90+ |
| Backend Controllers | 18 |
| Backend Services | 27+ |
| Backend Models | 30 |
| Backend Routes | 22 |
| Backend Modules | 4 (Research, Growth, Document Intelligence, Ezone) |
| Test Files | 15+ |
| Configuration Files | 15+ |
| Utility Files | 30+ |

---

## 📝 Key Documentation Files

For deeper dives into specific areas:

- [README.md](file:///c:/github/academicuniverse.com/academicuniverse/README.md): Main project overview and setup
- [DEVELOPMENT_SETUP.md](file:///c:/github/academicuniverse.com/academicuniverse/DEVELOPMENT_SETUP.md): Development environment setup
- [AI_CONTEXT.txt](file:///c:/github/academicuniverse.com/academicuniverse/AI_CONTEXT.txt): Condensed technical context
- [OVERLAP_ENGINE.md](file:///c:/github/academicuniverse.com/academicuniverse/OVERLAP_ENGINE.md): Overlap engine documentation
- [GITHUB_INTEGRATION.md](file:///c:/github/academicuniverse.com/academicuniverse/GITHUB_INTEGRATION.md): GitHub integration guide
- [GITHUB_OAUTH_SETUP.md](file:///c:/github/academicuniverse.com/academicuniverse/GITHUB_OAUTH_SETUP.md): GitHub OAuth setup
- [SENTRY_SETUP.md](file:///c:/github/academicuniverse.com/academicuniverse/SENTRY_SETUP.md): Sentry error tracking setup
- [backend/ARCHITECTURE_DIAGRAM.md](file:///c:/github/academicuniverse.com/academicuniverse/backend/ARCHITECTURE_DIAGRAM.md): Backend architecture visualization
- [backend/MODULAR_ARCHITECTURE_GUIDE.md](file:///c:/github/academicuniverse.com/academicuniverse/backend/MODULAR_ARCHITECTURE_GUIDE.md): New modular architecture guide
- [backend/MODULARIZATION_PLAN.md](file:///c:/github/academicuniverse.com/academicuniverse/backend/MODULARIZATION_PLAN.md): Migration roadmap
- [backend/MODULARIZATION_SUMMARY.md](file:///c:/github/academicuniverse.com/academicuniverse/backend/MODULARIZATION_SUMMARY.md): Migration summary
- [backend/MODULE_3_CLOSURE_REPORT.md](file:///c:/github/academicuniverse.com/academicuniverse/backend/MODULE_3_CLOSURE_REPORT.md): Module closure report
- [backend/README.md](file:///c:/github/academicuniverse.com/academicuniverse/backend/README.md): Backend-specific documentation
- [backend/FIREBASE_INTEGRATION.md](file:///c:/github/academicuniverse.com/academicuniverse/backend/FIREBASE_INTEGRATION.md): Firebase integration details
- [backend/LOGGER_EXAMPLES.md](file:///c:/github/academicuniverse.com/academicuniverse/backend/LOGGER_EXAMPLES.md): Logging examples
- [audit/](file:///c:/github/academicuniverse.com/academicuniverse/audit/): Security and architecture audit documents (15+ files)

---

*Index generated through comprehensive codebase exploration.*
