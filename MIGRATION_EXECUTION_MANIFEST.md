# MIGRATION_EXECUTION_MANIFEST.md

## Phase 2 Monorepo Migration Execution Manifest

**Status**: **PRE-EXECUTION MANIFEST (ANALYSIS ONLY)**  
**Branch Target**: `refactor/phase-2-shared-packages`  
**Execution Condition**: Pending User Approval — Zero Source Code Modified

---

## 1. Complete File-Level Migration Manifest

| # | Current File Path | Destination File Path | Reason for Move / Refactor | Target Package | Imports to Update | Content Type | Risk Level | Migration Action |
| :-: | :--- | :--- | :--- | :--- | :-: | :--- | :-: | :---: |
| **1** | [`app/dashboard/student/research/page.tsx`](file:///c:/github/academicuniverse.com/academicuniverse/app/dashboard/student/research/page.tsx) | `app/dashboard/student/research/page.tsx` (In Place) | Extract `ResearchPaperData` interface to eliminate circular dependencies | `packages/shared-types` | **2** | **Mixed Content** *(Flagged)* | **LOW** | **Refactor only** |
| **2** | [`types/code-arena.ts`](file:///c:/github/academicuniverse.com/academicuniverse/types/code-arena.ts) | `packages/shared-types/src/code-arena.ts` | Centralize domain types for Code Arena feature | `packages/shared-types` | **0** | **Shared Types** | **LOW** | **Move** |
| **3** | [`types/common.ts`](file:///c:/github/academicuniverse.com/academicuniverse/types/common.ts) | `packages/shared-types/src/common.ts` | Centralize generic UI and API response interfaces | `packages/shared-types` | **0** | **Shared Types** | **LOW** | **Move** |
| **4** | [`types/overlap.ts`](file:///c:/github/academicuniverse.com/academicuniverse/types/overlap.ts) | `packages/shared-types/src/overlap.ts` | Centralize Student Overlap DTOs & contracts | `packages/shared-types` | **3** | **Shared Types** | **LOW** | **Move** |
| **5** | [`types/soft-skills.ts`](file:///c:/github/academicuniverse.com/academicuniverse/types/soft-skills.ts) | `packages/shared-types/src/soft-skills.ts` | Centralize Soft Skills analysis DTOs | `packages/shared-types` | **1** | **Shared Types** | **LOW** | **Move** |
| **6** | [`types/index.ts`](file:///c:/github/academicuniverse.com/academicuniverse/types/index.ts) | `packages/shared-types/src/index.ts` | Package barrel export manifest for shared types | `packages/shared-types` | **0** | **Shared Types** | **LOW** | **Move / Refactor** |
| **7** | [`lib/utils/dateNormalizer.ts`](file:///c:/github/academicuniverse.com/academicuniverse/lib/utils/dateNormalizer.ts) | `packages/shared-utils/src/date.ts` | Share date parsing/formatting across Frontend & Backend | `packages/shared-utils` | **16** | **Shared Utilities** | **LOW** | **Move** |
| **8** | [`utils/formatters.ts`](file:///c:/github/academicuniverse.com/academicuniverse/utils/formatters.ts) | `packages/shared-utils/src/formatters.ts` | Centralize string & score formatting utilities | `packages/shared-utils` | **0** | **Shared Utilities** | **LOW** | **Move** |
| **9** | [`utils/issuerLogos.ts`](file:///c:/github/academicuniverse.com/academicuniverse/utils/issuerLogos.ts) | `packages/shared-utils/src/issuerLogos.ts` | Centralize Certificate issuer logo mappings | `packages/shared-utils` | **2** | **Shared Utilities** | **LOW** | **Move** |
| **10** | [`lib/utils.ts`](file:///c:/github/academicuniverse.com/academicuniverse/lib/utils.ts) | `packages/shared-utils/src/cn.ts` *(Re-exported locally)* | Share Tailwind classname merger (`clsx` + `tailwind-merge`) | `packages/shared-utils` | **61** | **Shared Utilities** | **LOW** | **Copy & Re-export** |
| **11** | [`components/ResearchWing/ResearchHistory.tsx`](file:///c:/github/academicuniverse.com/academicuniverse/components/ResearchWing/ResearchHistory.tsx) | `components/ResearchWing/ResearchHistory.tsx` (In Place) | Update import of `ResearchPaperData` to `@shared-types/research` | N/A (Frontend) | **1** | UI Component | **LOW** | **Refactor imports** |
| **12** | [`components/ResearchWing/FinalExport.tsx`](file:///c:/github/academicuniverse.com/academicuniverse/components/ResearchWing/FinalExport.tsx) | `components/ResearchWing/FinalExport.tsx` (In Place) | Update import of `ResearchPaperData` to `@shared-types/research` | N/A (Frontend) | **1** | UI Component | **LOW** | **Refactor imports** |

---

## 2. Mixed Concerns Analysis & Separation Proposal

### Flagged Item: `app/dashboard/student/research/page.tsx`
- **Mixed Content Summary**:
  - **Shared Types**: `export interface ResearchPaperData` (lines 14–21).
  - **Business & UI Logic**: Step navigation state, API fetch handlers (`handleSave`), rendering `ResearchWingPage` component.
- **Architectural Violation**: High-level page components MUST NOT export types consumed by child components, as this forms circular build dependencies (`page.tsx` $\leftrightarrow$ `ResearchHistory.tsx` / `FinalExport.tsx`).
- **Separation Proposal**:
  1. Create `packages/shared-types/src/research.ts`:
     ```ts
     export interface ResearchPaperData {
       id?: string;
       topic: string;
       outline: any[];
       content: Record<string, string>;
       abstract: string;
       citations: any;
     }
     ```
  2. Remove `ResearchPaperData` definition from `app/dashboard/student/research/page.tsx`.
  3. In `page.tsx`, `ResearchHistory.tsx`, and `FinalExport.tsx`, update imports to:
     ```ts
     import type { ResearchPaperData } from '@shared-types/research';
     ```

---

## 3. Dependency Impact Summary

| Dependency Impact Metric | Count / Value | Notes |
| :--- | :---: | :--- |
| **Total Files to Move** | **8 files** | `types/*` (5 files), `dateNormalizer.ts`, `formatters.ts`, `issuerLogos.ts` |
| **Total Files to Refactor / Modify** | **85 files** | Consumer files across `app/`, `components/`, `backend/src/`, and `services/` |
| **Total Import Statements to Update** | **86 statements** | Replaced deep relative/alias paths with `@shared-types/*` and `@shared-utils/*` |
| **Total Workspace Packages Affected** | **4 workspaces** | Root app, `backend`, `packages/shared-types`, `packages/shared-utils` |
| **Total TypeScript Configs Affected** | **3 configs** | [`tsconfig.base.json`](file:///c:/github/academicuniverse.com/academicuniverse/tsconfig.base.json), [`tsconfig.json`](file:///c:/github/academicuniverse.com/academicuniverse/tsconfig.json), [`backend/tsconfig.json`](file:///c:/github/academicuniverse.com/academicuniverse/backend/tsconfig.json) |
| **Estimated Git Commit Size** | **~95 files changed** | 10 new files, 8 deleted/moved files, ~77 modified consumer files |
| **New Dependencies Introduced** | **0 dependencies** | Re-uses existing workspace dependencies (`clsx`, `tailwind-merge`) |

---

## 4. Path Alias & TypeScript Resolution Integration

### Added to `tsconfig.base.json`:
```json
"paths": {
  "@/*": ["./*"],
  "@shared-types/*": ["packages/shared-types/src/*"],
  "@shared-types": ["packages/shared-types/src/index.ts"],
  "@shared-utils/*": ["packages/shared-utils/src/*"],
  "@shared-utils": ["packages/shared-utils/src/index.ts"]
}
```

### Added to `package.json` (`workspaces` array):
```json
"workspaces": [
  "apps/frontend",
  "apps/backend",
  "packages/*"
]
```

---

## 5. Execution Risk Assessment

- **Risk Rating**: **LOW**
- **Justification**:
  - No domain logic or API endpoints are being altered.
  - `lib/utils.ts` will maintain a backward-compatible shim re-exporting `cn` from `@shared-utils/cn` to guarantee zero component regression.
  - Vercel and Railway build configurations remain completely unchanged; resolution is handled transparently via standard TypeScript path alias compilation.
