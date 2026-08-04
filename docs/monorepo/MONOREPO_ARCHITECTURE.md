# Academic Universe Monorepo Architecture

## Goals

- Establish clean package boundaries between frontend, backend, benchmark engine, dataset manager, shared utilities, and research assets.
- Preserve all existing functionality.
- Eliminate cross-boundary relative imports.
- Enable independent deployment for Vercel (frontend) and Railway (backend).
- Use npm workspaces and TypeScript project references.

## Proposed Monorepo Layout

```
academicuniverse/
├── apps/
│   ├── frontend/            # Next.js 16 App Router
│   └── backend/             # Express backend service
├── packages/
│   ├── benchmark-generator/ # reusable benchmark generator package
│   ├── dataset-manager/     # reusable dataset manager package
│   ├── synthetic-pipeline/  # orchestration package for synthetic generation
│   ├── shared-types/        # shared TypeScript interfaces and domain models
│   ├── shared-utils/        # shared utility functions
│   ├── auth/                # reusable auth helper package if needed
│   └── common/              # common runtime helpers and constants
├── research/                # research assets and notebooks
├── docs/
├── scripts/
├── package.json
├── tsconfig.base.json
└── pnpm-workspace.yaml / package.json workspaces
```

## Package Boundaries

### frontend
- May import only:
  - `@academicuniverse/shared-types`
  - `@academicuniverse/shared-utils`
  - `@academicuniverse/common`
- Must never import backend source.
- Communicates to backend only via HTTP.

### backend
- May import:
  - `@academicuniverse/benchmark-generator`
  - `@academicuniverse/dataset-manager`
  - `@academicuniverse/synthetic-pipeline`
  - `@academicuniverse/shared-types`
  - `@academicuniverse/shared-utils`
  - `@academicuniverse/common`
- Must never import frontend source.

### benchmark-generator / dataset-manager / synthetic-pipeline
- Must remain independent reusable packages.
- Should not import frontend.
- Benchmark generator may depend on `shared-types` and `shared-utils`.

### research/
- Contains research artifacts and papers.
- No production package dependencies required.

## Deployment Architecture

- Vercel deploys only `apps/frontend`.
- Railway deploys only `apps/backend`.
- Shared packages are dependencies of apps/backend but not bundled into frontend.
- Root-level `.vercelignore` / Vercel project settings should exclude backend and packages not required by frontend.

## TypeScript Strategy

- Use `tsconfig.base.json` at repo root.
- Each package has its own `tsconfig.json`.
- Use `composite: true` and project references for packages.
- Use path aliases for local workspace package imports.
- Avoid oversized `rootDir` hacks.

## Import Strategy

Replace cross-package relative imports with package imports such as:

```ts
import { SyntheticPipeline } from '@academicuniverse/benchmark-generator';
import { DatasetManagerService } from '@academicuniverse/dataset-manager';
import { SomeType } from '@academicuniverse/shared-types';
```

## Non-destructive migration phases

1. Generate dependency graph.
2. Create workspace structure without moving business logic.
3. Move packages incrementally.
4. Update imports.
5. Update TypeScript configs.
6. Update Docker/Railway/Vercel.
7. Verify builds.

## Constraints

- Do not remove features.
- Do not change business logic.
- Do not modify production APIs unnecessarily.
- Do not alter research asset behavior.
