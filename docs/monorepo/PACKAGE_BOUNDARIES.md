# Package Boundaries

## Frontend (`apps/frontend`)

### Allowed imports
- `@academicuniverse/shared-types`
- `@academicuniverse/shared-utils`
- `@academicuniverse/common`

### Forbidden imports
- `@academicuniverse/backend`
- any `backend/` source files
- any `benchmarks/` source files
- any `research/` source files

## Backend (`apps/backend`)

### Allowed imports
- `@academicuniverse/benchmark-generator`
- `@academicuniverse/dataset-manager`
- `@academicuniverse/synthetic-pipeline`
- `@academicuniverse/shared-types`
- `@academicuniverse/shared-utils`
- `@academicuniverse/common`

### Forbidden imports
- any `apps/frontend` source files
- any `research/` source files

## Benchmark generator package (`packages/benchmark-generator`)

### Allowed imports
- `@academicuniverse/shared-types`
- `@academicuniverse/shared-utils`
- `@academicuniverse/common`

### Forbidden imports
- `apps/frontend`
- `apps/backend`
- `research/`

## Dataset manager package (`packages/dataset-manager`)

### Allowed imports
- `@academicuniverse/shared-types`
- `@academicuniverse/shared-utils`
- `@academicuniverse/common`

### Forbidden imports
- `apps/frontend`
- `apps/backend`
- `research/`

## Synthetic pipeline package (`packages/synthetic-pipeline`)

### Allowed imports
- `@academicuniverse/benchmark-generator`
- `@academicuniverse/dataset-manager`
- `@academicuniverse/shared-types`
- `@academicuniverse/shared-utils`
- `@academicuniverse/common`

### Forbidden imports
- `apps/frontend`
- `apps/backend`
- `research/`

## Shared packages (`packages/shared-types`, `packages/shared-utils`, `packages/common`)

### Allowed imports
- `@academicuniverse/shared-types` can import only type definitions and reusable domain models.
- `@academicuniverse/shared-utils` can import utility helpers and must avoid service-specific state.
- `@academicuniverse/common` can centralize shared runtime constants and low-level helpers.

### Forbidden imports
- These shared packages must never import application-specific backend or frontend code.

## Research assets (`research/`)

- Contains non-production research artifacts, papers, notebooks, and analysis.
- Must remain independent from application packages.
- May reference packages for documentation only, but not form deployable runtime dependencies.
