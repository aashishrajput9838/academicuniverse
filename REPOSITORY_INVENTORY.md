# REPOSITORY_INVENTORY.md

## Alias-Aware Monorepo Inventory Audit

### Executive Summary
Following the initial Migration Readiness Audit, an alias-aware re-parsing was conducted. By resolving TypeScript path aliases (`@/*`, `@storage/*`) across all root and sub-project `tsconfig` manifests, source files were accurately mapped to their architectural zones.

This inventory provides the updated, definitive counts for all TypeScript/JavaScript source files and assets.

---

## 1. Architectural Zone Classification Summary

| Zone Name | File Count (TS/TSX) | Primary Physical Location | Architectural Role & Description |
| :--- | :---: | :--- | :--- |
| **Backend** | **543** | [`backend/src/`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src) | Express API, MongoDB models, Domain Controllers, Services, Event Listeners, Auth Providers |
| **Frontend** | **269** | [`app/`](file:///c:/github/academicuniverse.com/academicuniverse/app), [`components/`](file:///c:/github/academicuniverse.com/academicuniverse/components), [`hooks/`](file:///c:/github/academicuniverse.com/academicuniverse/hooks) | Next.js 16 App Router pages, React 19 Components, Custom Hooks, UI Primitives (Radix/Shadcn) |
| **Benchmarks** | **89** | [`benchmarks/`](file:///c:/github/academicuniverse.com/academicuniverse/benchmarks), `backend/benchmarks` | Official 500-Document Benchmark, Synthetic Data Fabricator, Metric Calculators, Evaluation Runners |
| **Shared Utils** | **26** | [`lib/`](file:///c:/github/academicuniverse.com/academicuniverse/lib), [`utils/`](file:///c:/github/academicuniverse.com/academicuniverse/utils), [`storage/`](file:///c:/github/academicuniverse.com/academicuniverse/storage), [`constants/`](file:///c:/github/academicuniverse.com/academicuniverse/constants) | Firebase/Mongo Context, Date Normalizers, API Request Wrappers, GridFS Providers, App Constants |
| **Shared Types** | **5** | [`types/`](file:///c:/github/academicuniverse.com/academicuniverse/types) | Global DTO definitions, Domain Contracts (`code-arena`, `overlap`, `soft-skills`, `common`) |
| **Frontend Services**| **4** | [`services/`](file:///c:/github/academicuniverse.com/academicuniverse/services) | Frontend client service wrappers connecting UI to API endpoints |
| **Backend Microservice**| **2** | [`log-analyzer/src/`](file:///c:/github/academicuniverse.com/academicuniverse/log-analyzer/src) | AI-powered log analysis MCP microservice |
| **Scripts** | **1** | [`scripts/`](file:///c:/github/academicuniverse.com/academicuniverse/scripts) | Build and debugging scripts (`debug-document-file-endpoint.ts`) |
| **TOTAL** | **939** | Entire Monorepo Workspace | **Alias-Resolved Active Source Inventory** |

---

## 2. Detailed Breakdown by Directory

### A. Frontend Zone (269 Files)
- **Pages & App Routes (`app/`)**: 108 files
  - Admin Dashboard: 5 files (`app/admin/*`)
  - Student Dashboard: 58 files (`app/dashboard/student/*`)
  - Faculty Dashboard: 15 files (`app/dashboard/faculty/*`)
  - API Routes (Next.js): 5 files (`app/api/*`)
  - Root Layouts & Pages: 25 files (`app/page.tsx`, `app/layout.tsx`, etc.)
- **React Components (`components/`)**: 146 files
  - UI Component Primitives (`components/ui/`): 53 files
  - Feature Modules (`codeArena`, `ResearchWing`, `SoftSkills`, `Resume`, etc.): 61 files
  - Shared Layout & Common: 32 files
- **Custom React Hooks (`hooks/`)**: 8 files
- **Root Client Configs**: 7 files (`instrumentation.ts`, `sentry.*.config.ts`, etc.)

### B. Backend Zone (543 Files)
- **Controllers & Routes**: 65 files (`backend/src/controllers/`, `backend/src/routes/`)
- **Domain Services & Orchestrators**: 112 files (`backend/src/services/`)
- **Shared Domain Kernel**: 84 files (`backend/src/shared/`)
- **Data Models (Mongoose/MongoDB)**: 56 files (`backend/src/models/`)
- **Core AI Providers & Adapters**: 14 files (`backend/src/core/`)
- **Evaluation & Benchmark Subsystem**: 42 files (`backend/src/benchmark/`)
- **Automated Test Suites**: 170 files (`backend/src/__tests__/`, `backend/src/**/__tests__/`)

### C. Benchmarks Zone (89 Files)
- **Synthetic Data Generator**: 28 files (`benchmarks/synthetic-generator/`)
- **Evaluators, Metrics & Statistics**: 18 files (`benchmarks/evaluators/`, `benchmarks/metrics/`, `benchmarks/statistics/`)
- **Pipeline & Ground Truth**: 12 files (`benchmarks/ground-truth/`, `benchmarks/pipeline/`)
- **Test Suites & Validation**: 31 files (`benchmarks/tests/`, `benchmarks/validation/`, `backend/benchmarks/`)

### D. Shared Infrastructure & Utilities (35 Files)
- **Shared Utils (`lib/`, `utils/`, `constants/`, `storage/`)**: 26 files
- **Shared Types (`types/`)**: 5 files
- **Frontend Services (`services/`)**: 4 files

---

## 3. Non-TypeScript Research & Python Inventory
In addition to the 939 TypeScript source files, the repository contains research pipelines and analysis engines:
- **`paper_pipeline/`**: 7 Python files (equations, parser, renderer, validator)
- **`formula_engine/`**: 7 Python files (Math converter, extractor, golden dataset, publisher)
- **`paper-draft-v1/`**: Research paper manuscripts, LaTeX templates, and figures
- **`analysis/`**: Repair and validation Python tools
