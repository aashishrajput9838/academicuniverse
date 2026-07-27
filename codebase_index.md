# 🎓 Academic Universe - Comprehensive Codebase Index

> [!NOTE]
> This document provides a detailed, hierarchical index of the Academic Universe codebase. It covers all major directories, key files, modules, and their purposes to serve as an authoritative reference for development, architecture, and onboarding.

---

## 🏗️ System Architecture Overview

Academic Universe is a high-performance, multi-tenant SaaS platform built for university student development, academic intelligence, placement readiness, and campus collaboration.

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Radix UI, Lucide Icons, Zustand
- **Backend**: Node.js, Express 5, TypeScript. Modular Domain-Driven Architecture (DDD / DI pattern).
- **Databases**:
  - **MongoDB (Primary)**: Stores Users, Organizations, Marks, Resumes, Code Arena Points Ledger (`CodeArenaPointTransaction`), Roles, Certificates
  - **Firestore (Real-time)**: Stores Soft Skills History, Detected Events, Logs, Research state, Documents
  - **GridFS**: Stores large files (resumes, documents, PDFs, timetables, media uploads)
- **AI Engine**: Google Gemini API (`gemini-2.5-flash`) via AI Factory pattern & specialized prompt evaluators
- **External Integrations**: GitHub (Coding Analytics), Gmail (Event Extraction via sync), Ezone (Academic profiles), Cloudinary (Media storage), External Recommended Soft Skills Platforms (Yoodli, Talkivo, Speakili, VoiceCoach AI, Practice Academy)
- **Monitoring**: Sentry (Error tracking), Custom Log Analyzer

---

## 📁 Complete Directory Structure Index

### Root Level

| Path | Type | Purpose |
|------|------|---------|
| `app/` | dir | Next.js App Router frontend pages |
| `components/` | dir | Reusable React components & feature modules |
| `components/common/` | dir | Shared UI primitives (LoadingSpinner, SearchBar, StatCard, EmptyState, SectionHeader) |
| `components/layout/` | dir | Core layout components (Navbar, Sidebar, Footer) |
| `components/features/` | dir | Feature-grouped UI components (soft-skills, code-arena, research, ezone, certificates, growth, integrations, schedule, academic, landing) |
| `components/ui/` | dir | Base Radix UI primitives |
| `services/` | dir | Frontend API services layer (`softSkills`, `overlap`, `codeArena`) |
| `types/` | dir | Centralized TypeScript definitions (`common`, `soft-skills`, `overlap`, `code-arena`) |
| `hooks/` | dir | Custom React hooks (`useCopyToClipboard`, `useDebounce`, `useAsyncState`) |
| `constants/` | dir | Centralized application constants (`app.ts`) |
| `utils/` | dir | Shared frontend utilities (`formatters.ts`, `api.ts`, `api/`) |
| `docs/` | dir | Documentation, setup guides (`docs/guides/`) & sprint reports (`docs/reports/`) |
| `scripts/` | dir | Build, migration, and launcher scripts (`start-dev.bat`, `start-dev.ps1`) |
| `tmp/` | dir | Temporary files & inspection scratchpad (`tmp/scratch/`, `tmp/inspection/`) |
| `backend/` | dir | Express.js backend API server & DDD modules |

---

### 1. Frontend (`/app`, `/components`, `/services`, `/types`, `/hooks`, `/utils`)

#### 1.1 Next.js App Router (`/app`)

- `app/layout.tsx` - Root layout with AuthProvider & providers
- `app/page.tsx` - Landing page with role-based redirect
- `app/admin/` - Admin portal routes
- `app/dashboard/faculty/` - Faculty dashboard routes
- `app/dashboard/student/` - Student dashboard routes (`soft-skills`, `overlap`, `code`, `resume-builder`, `growth`, `career`, `research`, `records`, `skills`, `ezone-sync`, `mail`, `events`, `chatbot`, `faculty-cabin`, `webscrap`)

#### 1.2 Feature Component Modules (`/components/features`)

- `components/features/soft-skills/` - Soft Skills Lab 2.0 components (`AnalysisResult`, `SentenceInput`, `PracticeModeSelector`, `DailyChallenge`, `PersonalProgressDashboard`, `HistoryList`, `AttemptDetailModal`, `RecommendedPlatforms`)
- `components/features/code-arena/` - Code Arena components (`CodeArenaNav`, `CodeArenaStatsBar`, `ArenaPointsCard`, `IssueCard`, `IssueFormWizard`, `LeaderboardTable`, `SubmitSolutionModal`)
- `components/features/research/` - Research Wing components (`TopicGenerator`, `OutlineGenerator`, `ContentWriter`, `FinalizePaper`, `ResearchHistory`)
- `components/features/ezone/` - Ezone components (`LiveSyncLogs`)
- `components/features/certificates/` - Certificate components (`CertificatePreviewModal`, `CertificateThumbnailGallery`)
- `components/features/growth/` - Growth Hub components (`GrowthUploadPanel`, `GrowthHeader`)
- `components/features/integrations/` - Third-party integration components (`GitHubProjects`, `GithubActivityCard`, `GmailEvents`)
- `components/features/schedule/` - Timetable components (`TimetableGrid`, `WeeklyTimetable`, `TodaySchedule`, `NextClassWidget`, `UploadTimetableModal`)
- `components/features/academic/` - Academic display components (`AcademicProfileCard`, `AttendanceCard`, `MarksOverviewCard`, `SubjectPerformanceCard`)
- `components/features/landing/` - Landing page components (`HeroSection`, `HeroBackground`, `FeaturedPrograms`, `CTASection`, `Testimonials`, `FeatureSections`, `Announcements`, `QuickLinks`)

---

## 📊 Summary Statistics

| Category | Count |
| :--- | :--- |
| **Frontend App Pages** | 25+ |
| **Frontend Components** | 100+ |
| **Frontend Services** | 3 (`softSkills`, `overlap`, `codeArena`) |
| **Centralized Types** | 4 modules (`soft-skills`, `overlap`, `code-arena`, `common`) |
| **Backend Controllers** | 18 |
| **Backend DDD Modules** | 5 |

---

*Index updated following Project Structure Restructuring Sprint.*
