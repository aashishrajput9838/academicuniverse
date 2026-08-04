# ALIAS_RESOLUTION_MAP.md

## Alias-Aware TypeScript Configuration Audit

### Executive Overview
This document presents the authoritative TypeScript path alias configuration and resolution mapping for the `academicuniverse` repository. The initial Migration Readiness Audit performed classification based purely on raw directory structures, which resulted in misclassification of source files and obscured cross-boundary architectural dependencies.

By parsing all `tsconfig*.json` configurations across the root workspace and sub-projects, we have established an explicit, deterministic alias resolution map.

---

## 1. Parsed TypeScript Configurations

| Config File | Target Environment / Context | `baseUrl` | Declared `paths` | `include` Scope | `exclude` Scope |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [`tsconfig.json`](file:///c:/github/academicuniverse.com/academicuniverse/tsconfig.json) | Root / Next.js Web App | Extends base (`./`) | `@/*` $\rightarrow$ `./*` | `app/**/*`, `components/**/*`, `hooks/**/*`, `lib/**/*`, `utils/**/*`, `next-env.d.ts`, `global.d.ts`, `instrumentation*.ts`, `sentry.*.config.ts` | `node_modules`, `backend`, `log-analyzer`, `scripts`, `test`, `tmp`, `analysis`, `audit` |
| [`tsconfig.base.json`](file:///c:/github/academicuniverse.com/academicuniverse/tsconfig.base.json) | Shared Base Compiler Options | `./` | `@/*` $\rightarrow$ `./*` | N/A | N/A |
| [`tsconfig.jest.json`](file:///c:/github/academicuniverse.com/academicuniverse/tsconfig.jest.json) | Jest Test Environment | Extends `tsconfig.json` | Inherited from `tsconfig.json` | Inherited | Inherited |
| [`backend/tsconfig.json`](file:///c:/github/academicuniverse.com/academicuniverse/backend/tsconfig.json) | Backend Express Service | `./` | `@/*` $\rightarrow$ `src/*`<br>`@storage/*` $\rightarrow$ `../storage/*` | `src/**/*` | `node_modules`, `dist`, `src/**/__tests__/**`, `src/**/*.test.ts`, `scripts/**/*` |
| [`backend/tsconfig.jest.json`](file:///c:/github/academicuniverse.com/academicuniverse/backend/tsconfig.jest.json) | Backend Jest Environment | Extends `./tsconfig.json` | Inherited from `backend/tsconfig.json` | Inherited | Inherited |
| [`backend/tsconfig.verify.json`](file:///c:/github/academicuniverse.com/academicuniverse/backend/tsconfig.verify.json) | Backend Verification Setup | Extends `./tsconfig.json` | Inherited from `backend/tsconfig.json` | Inherited | Inherited |
| [`benchmarks/tsconfig.json`](file:///c:/github/academicuniverse.com/academicuniverse/benchmarks/tsconfig.json) | Benchmark Engine | `./` | None (Relative imports only) | `./**/*.ts` | `node_modules`, `dist`, `**/*.test.ts` |
| [`log-analyzer/tsconfig.json`](file:///c:/github/academicuniverse.com/academicuniverse/log-analyzer/tsconfig.json) | MCP Microservice | `./src` | None | `src/**/*` | N/A |

---

## 2. Complete Path Alias Resolution Table

### A. Root / Next.js Context (`@/*` $\rightarrow$ `./*`)
Used primarily by Frontend components, pages, hooks, and shared client utilities.

| Imported Alias Pattern | Alias Target Pattern | Actual Physical Directory / File | Zone Classification |
| :--- | :--- | :--- | :--- |
| `@/app/*` | `./app/*` | [`app/`](file:///c:/github/academicuniverse.com/academicuniverse/app) | Frontend |
| `@/components/*` | `./components/*` | [`components/`](file:///c:/github/academicuniverse.com/academicuniverse/components) | Frontend |
| `@/hooks/*` | `./hooks/*` | [`hooks/`](file:///c:/github/academicuniverse.com/academicuniverse/hooks) | Frontend |
| `@/lib/*` | `./lib/*` | [`lib/`](file:///c:/github/academicuniverse.com/academicuniverse/lib) | Shared Utils / State |
| `@/utils/*` | `./utils/*` | [`utils/`](file:///c:/github/academicuniverse.com/academicuniverse/utils) | Shared Utils |
| `@/types/*` | `./types/*` | [`types/`](file:///c:/github/academicuniverse.com/academicuniverse/types) | Shared Types |
| `@/services/*` | `./services/*` | [`services/`](file:///c:/github/academicuniverse.com/academicuniverse/services) | Frontend Services |
| `@/constants/*` | `./constants/*` | [`constants/`](file:///c:/github/academicuniverse.com/academicuniverse/constants) | Shared Utils |
| `@/storage/*` | `./storage/*` | [`storage/`](file:///c:/github/academicuniverse.com/academicuniverse/storage) | Shared Storage |
| `@/backend/*` | `./backend/*` | [`backend/`](file:///c:/github/academicuniverse.com/academicuniverse/backend) | Backend (**Boundary Violation**) |
| `@/faculty_data.json` | `./faculty_data.json` | [`faculty_data.json`](file:///c:/github/academicuniverse.com/academicuniverse/faculty_data.json) | Asset / Data |

### B. Backend Express Service Context (`backend/tsconfig.json`)
Used internally inside the backend Express microservice.

| Imported Alias Pattern | Alias Target Pattern | Actual Physical Directory / File | Zone Classification |
| :--- | :--- | :--- | :--- |
| `@/*` | `backend/src/*` | [`backend/src/`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src) | Backend |
| `@storage/*` | `storage/*` (or `backend/src/storage/*`) | [`backend/src/storage/`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/storage) | Backend Storage |

---

## 3. Alias Misresolution Analysis & Impact

1. **Contextual Dual-Meaning of `@/*`**:
   - In Next.js / Root context, `@/` resolves to `./` (root).
   - In Backend context, `@/` resolves to `backend/src/`.
   - **Architectural Risk**: Any shared package attempting to use `@/` will fail or resolve ambiguously depending on which `tsconfig.json` is active.

2. **Backend Leaks into Next.js App Router**:
   - `app/api/uaip/upload/route.ts` imports `@/backend/src/utils/jwt`, `@/backend/src/services/upload-service`, and `@/backend/src/config/database`.
   - Under standard root Next.js configuration, `@/backend/src/...` resolves to root `backend/src/...`, bypassing clean HTTP/gRPC boundaries and coupling Next.js serverless handlers directly to Express backend service implementations.

3. **Type Leakage into Frontend Page Routes**:
   - `components/ResearchWing/FinalExport.tsx` and `components/ResearchWing/ResearchHistory.tsx` import `ResearchPaperData` via `@/app/dashboard/student/research/page`.
   - Bypasses domain type definitions and creates immediate **circular build dependencies**.
