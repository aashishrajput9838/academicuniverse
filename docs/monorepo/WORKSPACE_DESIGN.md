# Workspace Design

## Root workspace configuration

The repo should use npm workspaces configured in root `package.json`.

### Root `package.json`

- `workspaces`: [
  "apps/frontend",
  "apps/backend",
  "packages/benchmark-generator",
  "packages/dataset-manager",
  "packages/synthetic-pipeline",
  "packages/shared-types",
  "packages/shared-utils",
  "packages/auth",
  "packages/common"
]

- `scripts`:
  - `dev:frontend`
  - `dev:backend`
  - `build`
  - `typecheck`
  - `lint`
  - `bootstrap`

- `dependencies`:
  - none except workspace tooling (if required)

## Package manifests

Each package should have a `package.json` with:
- `name`
- `version`
- `main`
- `types`
- `private: true` (for internal packages)
- `scripts` for build/test/typecheck
- `dependencies` only on workspace packages or external modules

## Example package names

- `@academicuniverse/frontend`
- `@academicuniverse/backend`
- `@academicuniverse/benchmark-generator`
- `@academicuniverse/dataset-manager`
- `@academicuniverse/synthetic-pipeline`
- `@academicuniverse/shared-types`
- `@academicuniverse/shared-utils`
- `@academicuniverse/auth`
- `@academicuniverse/common`

## Package aliases and path resolution

- Use TypeScript `paths` with package names.
- Use `moduleResolution: node` for backend packages and `moduleResolution: bundler` for frontend.
- Root `tsconfig.base.json` should define common aliases e.g. `"@academicuniverse/*": ["packages/*/src"]`.

## Workspace installation

- `npm install` at repo root should install all workspace dependencies.
- Shared packages should resolve via workspace symlinks.

## Workspace isolation

- `apps/frontend` build should not read or compile `apps/backend`.
- `apps/backend` build should not read or compile `apps/frontend`.
- Shared packages are available to both through package imports only.
