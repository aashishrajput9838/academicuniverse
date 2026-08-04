# Monorepo Migration Plan

## Phase 1: Dependency discovery

1. Scan the repository for cross-boundary imports.
2. Generate a complete dependency graph of current references.
3. Identify all backend-to-benchmarks imports and frontend-to-backend imports.
4. Record any `scripts/` or `docs/` imports that may need later review.

## Phase 2: Create workspace structure

1. Create directories:
   - `apps/frontend`
   - `apps/backend`
   - `packages/benchmark-generator`
   - `packages/dataset-manager`
   - `packages/synthetic-pipeline`
   - `packages/shared-types`
   - `packages/shared-utils`
   - `packages/common`
2. Create root `package.json` with `workspaces`.
3. Create `tsconfig.base.json`.
4. Create package `package.json`/`tsconfig.json` stubs.

## Phase 3: Move packages incrementally

1. Move frontend sources from `app/`, `components/`, `hooks/`, `lib/`, `utils/` into `apps/frontend`.
2. Move backend sources from `backend/src` into `apps/backend/src` with backend-specific config.
3. Move benchmark and dataset manager source files into package directories.
4. Keep `research/` and `docs/` in place.

## Phase 4: Update imports

1. Replace `../../../benchmarks/...` with `@academicuniverse/benchmark-generator` or `@academicuniverse/synthetic-pipeline`.
2. Replace `@/backend/...` frontend imports with HTTP API calls or `@academicuniverse/shared-types` as needed.
3. Update any shell scripts, test helpers, and docs references.

## Phase 5: Update TypeScript config

1. Configure root `tsconfig.base.json`.
2. Create `apps/frontend/tsconfig.json` and `apps/backend/tsconfig.json`.
3. Create `packages/*/tsconfig.json` with `composite: true`.
4. Add project references.
5. Validate with `npm run build` and `npm run typecheck`.

## Phase 6: Update Docker

1. Create `apps/backend/Dockerfile` for Railway.
2. Ensure Docker `COPY` only includes backend and package sources used by backend.
3. Remove `benchmarks` from backend Docker context unless package resources are required.
4. Optionally create `apps/frontend/Dockerfile` if needed for local container tests.

## Phase 7: Update Railway

1. Configure Railway service to use `apps/backend`.
2. Build only backend package and required workspace packages.
3. Set runtime env and `PORT`.
4. Verify with Railway build logs.

## Phase 8: Update Vercel

1. Configure Vercel project to use `apps/frontend`.
2. Ensure `outputFileTracingExcludes` excludes `apps/backend`, `packages/*` not needed by frontend, and `research/`.
3. Verify frontend build and API route isolation.

## Phase 9: Verification

Run after each phase:
- `npm install`
- `npm run build`
- `npm run typecheck`
- frontend build validation
- backend build validation
- Railway build verification (local simulation or config)
- Vercel build verification (local simulation or config)

## Notes

- Phase 2 must be non-destructive.
- Keep original code in place until the new workspace is fully validated.
- Stop and fix any phase failure before moving to the next phase.
