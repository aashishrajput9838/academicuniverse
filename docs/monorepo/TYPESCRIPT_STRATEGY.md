# TypeScript Strategy

## Root configuration

Create `tsconfig.base.json` with shared compiler options:

- `target`: `ES2020`
- `module`: `ESNext` for frontend, `CommonJS` for backend
- `moduleResolution`: `bundler` for frontend, `node` for backend
- `resolveJsonModule`: true
- `esModuleInterop`: true
- `skipLibCheck`: true
- `forceConsistentCasingInFileNames`: true
- `strict`: true
- `paths`: {
  "@academicuniverse/*": ["packages/*/src"],
  "@/*": ["apps/frontend/*"]
}

## Package tsconfig

Each package must have its own `tsconfig.json`:
- `compilerOptions.composite`: true
- `outDir`: `dist`
- `rootDir`: `src`
- `declaration`: true
- `declarationMap`: true
- `incremental`: true
- `moduleResolution`: `node`
- `paths`: local workspace paths as needed
- `include`: [`src/**/*`]
- `exclude`: [`node_modules`, `dist`, `**/*.test.ts`, `**/*.spec.ts`]

## App tsconfig

### `apps/frontend/tsconfig.json`
- extends `../../tsconfig.base.json`
- `module`: `esnext`
- `jsx`: `react-jsx`
- `moduleResolution`: `bundler`
- `noEmit`: true
- `include`: app/ and components/, lib/, hooks/, utils/
- `exclude`: backend, packages, node_modules, build, .next

### `apps/backend/tsconfig.json`
- extends `../../tsconfig.base.json`
- `module`: `commonjs`
- `target`: `ES2020`
- `moduleResolution`: `node`
- `outDir`: `dist`
- `rootDir`: `src`
- `include`: [`src/**/*`, `../packages/*/src/**/*`] if package sources need compile references
- `references`: workspace package references

## Project references

Root `tsconfig.json` should declare references:
- `{ "path": "apps/frontend" }`
- `{ "path": "apps/backend" }`
- `{ "path": "packages/benchmark-generator" }`
- `{ "path": "packages/dataset-manager" }`
- `{ "path": "packages/synthetic-pipeline" }`
- `{ "path": "packages/shared-types" }`
- `{ "path": "packages/shared-utils" }`
- `{ "path": "packages/common" }`

Each package/app `tsconfig.json` should reference its package dependencies.

## Path aliases

Use package names in imports:

```ts
import { SyntheticPipeline } from '@academicuniverse/benchmark-generator';
import { DatasetManagerService } from '@academicuniverse/dataset-manager';
import { AuthPayload } from '@academicuniverse/shared-types';
```

## No oversized rootDir

- Do not use broad `rootDir` settings like `../`.
- Keep `rootDir` to each package's `src` directory.
- Use workspace packages for cross-package code sharing.
