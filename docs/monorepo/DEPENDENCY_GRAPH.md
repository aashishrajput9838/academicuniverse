# Dependency Graph

## Current inferred dependencies

- `app/` frontend imports:
  - direct backend helpers in `app/api/uaip/upload/route.ts`
  - shared utility files via `@/*` alias

- `backend/` imports:
  - `../../../benchmarks/...` from `backend/src/routes/syntheticRoutes.ts`
  - likely other cross-boundary imports from backend to `benchmarks/`

- `benchmarks/` currently stands as a separate area with no workspace package boundaries.

## Target workspace dependency graph

```
apps/frontend -> @academicuniverse/shared-types
              -> @academicuniverse/shared-utils

apps/backend -> @academicuniverse/benchmark-generator
              -> @academicuniverse/dataset-manager
              -> @academicuniverse/synthetic-pipeline
              -> @academicuniverse/shared-types
              -> @academicuniverse/shared-utils

packages/synthetic-pipeline -> @academicuniverse/benchmark-generator
                            -> @academicuniverse/dataset-manager
                            -> @academicuniverse/shared-types
                            -> @academicuniverse/shared-utils

packages/benchmark-generator -> @academicuniverse/shared-types
                             -> @academicuniverse/shared-utils

packages/dataset-manager -> @academicuniverse/shared-types
                          -> @academicuniverse/shared-utils

packages/shared-utils -> @academicuniverse/shared-types
packages/common -> @academicuniverse/shared-types
```

## Notes

- The current repo should be audited for untracked package dependencies.
- `apps/backend` backend should import benchmark code only through workspace packages.
- Existing backend routes that use `benchmarks/` must be lifted into package APIs.
