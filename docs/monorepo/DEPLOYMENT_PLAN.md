# Deployment Plan

## Vercel Deployment

- Deploy only `apps/frontend`.
- `next.config.mjs` should be within `apps/frontend`.
- Frontend build should not import backend source.
- API routes in frontend should proxy to backend via `NEXT_PUBLIC_API_BASE_URL` or `BACKEND_API_URL`.
- Exclude backend and benchmark package source from Vercel output tracing.
- `.vercelignore` should ignore `apps/backend`, `packages/benchmark-generator`, `packages/dataset-manager`, `packages/synthetic-pipeline`, and `research` unless needed for docs.

## Railway Deployment

- Deploy only `apps/backend`.
- Backend Dockerfile should copy backend source and required packages only.
- Do not include `apps/frontend` in backend Docker context.
- Set `NODE_ENV=production`, `PORT`, and database environment variables.
- Ensure build stage includes workspace package compilation.

## Docker Strategy

- Root Dockerfile should be deprecated for backend deployment.
- Use `apps/backend/Dockerfile` for Railway.
- `COPY package*.json ./` and `COPY ../../packages ./packages` or workspace package sources as needed.
- Ensure `benchmarks` are migrated into `packages/benchmark-generator` and included via workspace deps.

## Build verification

- Frontend: `cd apps/frontend && npm run build`
- Backend: `cd apps/backend && npm run build`
- Root: `npm run typecheck`
- Root: `npm install` to wire all workspace packages.

## Environment and Secrets

- Vercel: `NEXT_PUBLIC_API_BASE_URL`
- Railway: `MONGODB_URI`, `SESSION_SECRET`, `SENTRY_DSN`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, etc.
- Both: avoid mixing env files in deployment configuration.
