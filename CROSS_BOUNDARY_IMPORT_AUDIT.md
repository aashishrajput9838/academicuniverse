# CROSS_BOUNDARY_IMPORT_AUDIT.md

## Cross-Boundary Import Audit & Architectural Enforcement

### Executive Summary
An alias-aware audit was conducted to analyze all 181 cross-boundary import edges across the 939 source files in the repository. While the majority of cross-boundary edges (174 imports) represent valid consumption of shared utilities and types by frontend components, the audit uncovered **4 critical architectural boundary violations** that violate microservice isolation and monorepo boundaries.

---

## 1. Cross-Boundary Edge Matrix

| Source Zone | Target Zone | Edge Count | Boundary Health | Status / Action Required |
| :--- | :--- | :---: | :---: | :--- |
| **Frontend** | **Shared Utils** (`lib/`, `utils/`) | 168 | Healthy | Standard UI consumption of shared utility functions and contexts |
| **Frontend Services** | **Shared Utils** (`utils/api`) | 3 | Healthy | Frontend API wrappers invoking common HTTP utilities |
| **Frontend Services** | **Shared Types** (`types/`) | 2 | Healthy | Service interfaces using domain type contracts |
| **Frontend** | **Shared Types** (`types/`) | 1 | Healthy | UI consuming shared domain contracts |
| **Shared Utils** | **Shared Types** (`types/`) | 1 | Healthy | Utility consuming shared domain contracts |
| **Frontend (App Route)** | **Backend (`backend/src`)** | **3** | **VIOLATION** | Next.js API route bypassing HTTP API and invoking backend code directly |
| **Backend (`backend/src`)**| **Benchmarks (`benchmarks/`)**| **1** | **VIOLATION** | Express backend route importing synthetic generator benchmark engine |
| **Scripts (`scripts/`)** | **Backend (`backend/src`)** | **2** | **VIOLATION** | Root script importing internal backend models and storage providers |
| **Components** | **App Page Routes (`app/`)** | **8** | **VIOLATION** | Components importing types directly from Next.js page files (Causes Circular Deps) |

---

## 2. Detailed Audit of Boundary Violations

### Violation 1: Direct Backend Invocation from Next.js App Router
- **Source File**: [`app/api/uaip/upload/route.ts`](file:///c:/github/academicuniverse.com/academicuniverse/app/api/uaip/upload/route.ts)
- **Target Files**:
  - `backend/src/utils/jwt.ts` (`import { verifyToken } from "@/backend/src/utils/jwt"`)
  - `backend/src/services/upload-service.ts` (`import { UploadService } from "@/backend/src/services/upload-service"`)
  - `backend/src/config/database.ts` (`import { connectDB } from "@/backend/src/config/database"`)
- **Severity**: **CRITICAL (HIGH RISK)**
- **Architectural Failure**: Next.js serverless route handler reaches directly into Express backend implementation files via path alias `@/backend/src/...`.
- **Impact**: Bypasses network isolation, breaks independent deployment, forces Next.js backend bundle bloat, and introduces runtime failure risks on serverless platforms (e.g. Vercel).
- **Remediation Plan for Phase 2**: Replace direct backend imports with a lightweight REST/HTTP proxy or move shared database/service code into a dedicated `@academicuniverse/core-backend` package.

---

### Violation 2: Backend Importing Benchmark Engine
- **Source File**: [`backend/src/routes/syntheticRoutes.ts`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/routes/syntheticRoutes.ts)
- **Target File**: `benchmarks/synthetic-generator/pipeline/syntheticPipeline.ts` (`import { SyntheticPipeline } from '../../../benchmarks/synthetic-generator/pipeline/syntheticPipeline'`)
- **Severity**: **HIGH**
- **Architectural Failure**: Production Express backend service imports from the standalone evaluation/benchmark suite using relative path traversal (`../../../benchmarks/...`).
- **Impact**: Couples production backend code directly to benchmark data fabricator scripts, polluting production build artifacts with testing code.
- **Remediation Plan for Phase 2**: Extract `synthetic-generator` into a shared package `@academicuniverse/synthetic-generator` or package boundary.

---

### Violation 3: Root Script Importing Internal Backend Code
- **Source File**: [`scripts/debug-document-file-endpoint.ts`](file:///c:/github/academicuniverse.com/academicuniverse/scripts/debug-document-file-endpoint.ts)
- **Target Files**:
  - `backend/src/models/UaipUpload.ts` (`import { UaipUpload } from '../backend/src/models/UaipUpload'`)
  - `backend/src/storage/GridFSProvider.ts` (`import { GridFSProvider } from '../backend/src/storage/GridFSProvider'`)
- **Severity**: **MEDIUM**
- **Architectural Failure**: Root debugging script relies on relative imports into `backend/src`.
- **Remediation Plan for Phase 2**: Move debug script inside `backend/scripts/` or consume via public package entry points.

---

### Violation 4: UI Components Importing Types from Next.js Pages
- **Source Files**:
  - [`components/ResearchWing/FinalExport.tsx`](file:///c:/github/academicuniverse.com/academicuniverse/components/ResearchWing/FinalExport.tsx)
  - [`components/ResearchWing/ResearchHistory.tsx`](file:///c:/github/academicuniverse.com/academicuniverse/components/ResearchWing/ResearchHistory.tsx)
  - [`components/GrowthUploadPanel.tsx`](file:///c:/github/academicuniverse.com/academicuniverse/components/GrowthUploadPanel.tsx)
  - [`app/dashboard/student/document-intelligence/page.tsx`](file:///c:/github/academicuniverse.com/academicuniverse/app/dashboard/student/document-intelligence/page.tsx)
- **Target Files**:
  - `app/dashboard/student/research/page.tsx`
  - `app/dashboard/student/growth/reviewApi.ts`
  - `app/dashboard/student/growth/store/growthUploadStore.ts`
- **Severity**: **HIGH (Causes Circular Dependencies)**
- **Architectural Failure**: Sub-components import data structures directly from high-level page views.
- **Remediation Plan for Phase 2**: Extract domain types into `@/types/` or feature-specific type files.
