# Sprint-004 — Architecture Assessment

**Date:** 2026-07-19  
**Branch:** main  
**Assessed by:** Kilo Code CLI  
**Status:** READY FOR PLANNING

---

## 1. Architecture Overview

### Backend Modules (`backend/src/`)

| Module | Purpose |
|---|---|
| `auth/` | Strategy-based auth providers (Google, Email), resolver, registry |
| `config/` | DB, Firebase Admin, Sentry, Cloudinary, constants |
| `controllers/` | 24 Express controllers (GitHub, Gmail, Growth, Skills, Marks, etc.) |
| `core/ai/` | AI provider abstraction (Gemini, OpenRouter, Mock, Failover) |
| `events/` | EventBus (in-process pub/sub) + UaipEvents (event enum) |
| `middleware/` | Auth, error handling, performance monitoring, request ID |
| `models/` | ~40 Mongoose models |
| `modules/` | Feature modules: documentIntelligence, ezone, growth, research |
| `routes/` | 28 route files mounted under `/api` |
| `services/` | 30+ services (upload, GitHub, Gmail, analytics, OCR, parsing, classification) |
| `shared/` | Application layer (UaipFacade, moduleRegistry, routingEngine), DTOs, repositories, utilities |
| `storage/` | GridFS provider |
| `types/`, `utils/` | JWT, encryption, errors, response, logger, mongoose helpers |

### Frontend Modules (`app/`)

- `admin/` — users, sections, timetable-status, assign-representative
- `api/` — UAIP upload, Sentry example
- `dashboard/faculty/` — AI, analytics, career-growth, courses, grades, research, resources, resume-templates, students
- `dashboard/student/` — career, chatbot, code, document-intelligence, events, ezone-sync, faculty-cabin, growth, mail, overlap, profile, records, research, resume-builder, schedule, skills, soft-skills, webscrap
- **Total:** 38 `page.tsx` files

### Event Flow

- **EventBus:** `backend/src/events/EventBus.ts:6` — singleton in-process pub/sub
- **Events:** `backend/src/events/UaipEvents.ts:2` — 26 event types
- **Subscribers:**
  - `skillsEventListener.ts` — handles `GithubUpdated`, `SkillUpdated`, `SkillProfileRebuilt`
  - `growthHubSkillsIntegration.ts` — handles `SkillProfileRebuilt`, `SkillUpdated`
- **Publishers:** `analyticsService.ts:156` publishes `GithubUpdated` after GitHub sync
- **No replay/DLQ/persistence** — purely in-memory

### Authentication Flow

1. **Providers:** `auth/provider.ts` — Google, Email, Firebase strategies
2. **Resolver:** `auth/authResolver.ts` — orchestrates provider auth, upserts AuthMethod, ensures canonical user via `UserService`
3. **Service:** `services/authService.ts` — `loginWithFirebase` verifies Firebase token, detects role by email domain, finds/creates user
4. **Middleware:** `middleware/auth.ts` — `authenticateUser` verifies JWT, attaches `req.user`
5. **Token:** `utils/jwt.ts` — signs/verifies JWT with `JWT_SECRET`
6. **Note:** Two auth middlewares exist (`middleware/auth.ts` and `shared/middleware/auth.middleware.ts`) with different shapes

### Growth Pipeline

- **Controller:** `modules/growth/growth.controller.ts`
- **Profile Service:** `modules/growth/growthProfile.service.ts`
- **Projection Service:** `modules/growth/growthProjection.service.ts` — builds aggregated projection across marks/academic/ezone/github/skills
- **Integration:** `modules/growth/growthHubSkillsIntegration.ts` — subscribes to skills events, triggers Growth rebuild

### GitHub Sync Pipeline

1. **Controller:** `controllers/githubController.ts` + `githubOAuthController.ts`
2. **Service:** `services/githubService.ts` — PAT-based repo topic classification
3. **OAuth Service:** `services/githubOAuthService.ts` — OAuth token encrypt-at-rest
4. **OAuth Callback:** `controllers/githubOAuthController.ts:63` — returns HTML page that `postMessage`s to `window.opener`
5. **Sync Entry:** `controllers/githubController.ts:252` → `analyticsService.syncGithubData` → publishes `GithubUpdated` event

---

## 2. Technical Debt

### Critical

| File:Line | Description | Recommended Action |
|---|---|---|
| `backend/src/index.ts:109-142` | CORS permits `origin === null`/`''` and `*.vercel.app` with `credentials: true` — enables credentialed cross-origin requests from arbitrary subdomains | Disallow null origin; restrict to explicit allowlist |
| `backend/src/controllers/githubOAuthController.ts:129,167` | `postMessage` uses target origin `'*'` — leaks code/token state to any window | Use specific frontend origin in `postMessage` target |
| `backend/src/services/authService.ts:130-140` | Mock token fallback when Firebase Admin isn't initialized — if misconfigured in prod, anyone authenticates | Gate mock path behind `NODE_ENV==='development'`; hard-fail otherwise |
| `backend/src/index.ts:146` | Session secret defaults to `'fallback_session_secret'` when `SESSION_SECRET` unset — session forgery risk | Fail fast if unset in production |

### High

| File:Line | Description | Recommended Action |
|---|---|---|
| `backend/src/index.ts:39-47` | `CONFIG_AUDIT` logs all env vars containing 'client'/'google' (incl. client secrets partially) to stdout at every startup | Remove debug env dumping before prod; redact fully |
| `backend/src/**` | No schema validation library (no Joi/Zod/express-validator anywhere in deps or code) — request bodies accepted untyped | Add Zod/Joi validation middleware for all POST/PUT |
| `backend/src/**` | ~88% of controller/service modules have no unit test | Add unit tests for security-critical controllers first |
| `backend/src/shared/middleware/auth.middleware.ts:32-37` | Failsafe hack parsing `roleId` for stringified JSON object via regex on corrupted tokens — masks real serialization bug | Fix token encoding at source; remove regex workaround |
| `backend/src/*` | 577 `as any` casts across codebase — defeats type safety | Introduce typed interfaces/DTOs; remove `any` |

### Medium

| File:Line | Description | Recommended Action |
|---|---|---|
| `backend/src/index.ts` | No `helmet` and no `express-rate-limit` anywhere — missing security headers + no rate limiting on auth/OAuth/login endpoints | Add `helmet()` and rate-limit middleware |
| `backend/src/modules/growth/growthProjection.service.ts:78` | Builds projection with 6 parallel source queries, several doing multiple `find().sort().lean()` over whole collections with no pagination and no indexed filters beyond `_id`/`organizationId` | Add compound indexes; paginate |
| `backend/src/modules/growth/growthProjection.service.ts:350` | `getGithubMetrics` calls live GitHub API on every projection when cache misses — expensive external call inside aggregation | Cache projection; refresh async |
| `backend/src/models/*` | No index definitions inspected on models — lookups by `organizationId`, `personId`, `firebaseUid`, `githubUsername` are unindexed → collection scans at scale | Add indexes for hot query fields |
| `backend/src/shared/middleware/auth.middleware.ts` vs `middleware/auth.ts` | Two competing auth middlewares with different shapes (`req.user.userId` vs `req.user._id`) | Consolidate to one typed middleware |
| `backend/src/*` | 244 `console.log` statements in source (debug scripts aside) | Route through the `Logger` utility uniformly |

### Low

| File:Line | Description | Recommended Action |
|---|---|---|
| `backend/src/services/upload-service.ts:31,80` | TODO hook noted in doc comment; duplicate-upload path uses `console.log` | Wire the publish event; replace with logger |
| `backend/src/services/ocr/engines/PaddleOcrEngine.ts:9` | Throws "not implemented" — dead code/incomplete engine referenced by factory | Remove or implement; don't ship throw-only engine |
| `backend/src/scripts/*` | One-off verify/debug scripts in `src/` and ship with build | Move to `tools/`; exclude from compile/test |
| `backend/src/index.ts:82,174` | Sentry handlers labeled "placeholder" in comments — ambiguity about whether active | Clarify/init Sentry explicitly |
| `app/**` | No evidence of pagination/`react-query` caching in reviewed pages; multiple `store/*` zustand stores fetch on mount | Add pagination + request caching |
| `backend/src/*` bundle | Next frontend ships `sentry-example-page`, `test-crash` as real routes | Remove debug routes from prod build |

---

## 3. Remaining Incomplete Features

| File:Line | Severity | Description |
|---|---|---|
| `app/dashboard/faculty/career-growth/page.tsx:115-125` | Low | "Coming Soon" placeholder module rendered in UI |
| `app/dashboard/student/skills/components/RelatedSkillsPanel.tsx:21` | Low | "This feature is coming soon" stub panel |
| `backend/src/controllers/githubOAuthController.ts:114-139` | Medium | OAuth callback returns raw HTML and only `postMessage` to opener; does not actually redirect/complete handshake via query params (comment admits "for now") |
| `backend/src/modules/ezone/scrapers/ezone.scraper.ts` + `ezone-session.provider.ts` | Medium | Entire Ezone module depends on Playwright scraping of `student.sharda.ac.in` — brittle, no API, likely breaks on UI change |
| `backend/src/services/upload-service.ts:31` | Low | Upload service doc explicitly notes downstream event-emit hook is a TODO |

---

## 4. Broken or Partially Implemented APIs

| File:Line | Severity | Description |
|---|---|---|
| `backend/src/controllers/githubController.ts:59,169,237` | Medium | `getProjectStats`/`refresh`/`sync` hard-check `userRole.name === 'STUDENT'` but `userRole` is `(user.roleId as any)` after `.populate('roleId')` — if populate fails or role name differs, 403s incorrectly. Also duplicates logic 3× |
| `backend/src/controllers/githubOAuthController.ts:221-223` | Low | `getDeveloperStats` swallows "GitHub access token" errors into a 200 with null — confusing contract |
| `app/dashboard/student/events/page.tsx:11` | Low | Page copy claims events are "automatically detected from your Gmail" — depends on Gmail sync pipeline completeness |

---

## 5. Missing Tests

| Area | Severity | Description |
|---|---|---|
| Controllers | High | All 24 controllers untested, including security-critical: `githubController.ts`, `githubOAuthController.ts`, `gmailController.ts`, `authController.ts`, `usersController.ts`, `profileController.ts`, `growthController.ts`, `reviewController.ts` |
| Services | High | All services untested: `authService.ts`, `githubService.ts`, `githubOAuthService.ts`, `analyticsService.ts`, `exportService.ts`, `gmailAuthService.ts`, `gmailSyncService.ts`, `resumeService.ts`, `overlapService.ts`, `userService.ts`, `roleService.ts`, `growthService.ts`, `storageService.ts`, `pipeline-orchestrator.ts` |
| Models | Medium | 0 model tests (schemas, hooks, indexes) for ~40 models |
| Integration | High | 0 route-integration tests beyond one e2e (`skillsTracker.e2e.test.ts`). GitHub OAuth round-trip, Gmail OAuth, upload→pipeline event flow, and growth projection aggregation have no integration coverage |

---

## 6. Missing Validation

| File:Line | Severity | Description |
|---|---|---|
| `backend/src/**` | High | No schema validation library (no Joi/Zod/express-validator anywhere in deps or code). Request bodies accepted untyped |
| `backend/src/controllers/githubOAuthController.ts:65` | Medium | `code`/`state` from query only type-checked (`typeof === 'string'`); no length/format/encoding validation |
| `backend/src/modules/growth/growth.controller.ts:95-97` | Medium | `limit`/`cursor` parsed from query with no upper bound → unbounded queries (`Number(rawLimit)` can be huge) |
| `backend/src/services/upload-service.ts:60` | Low | File size limit read from env with `|| 50` but no validation that it's a sane number |
| `backend/src/index.ts:147` | Medium | Session cookie `maxAge` 24h, `secure` only in prod; `sameSite` not set → CSRF surface for session-based OAuth |

---

## 7. Security Improvements

| File:Line | Severity | Description |
|---|---|---|
| `backend/src/index.ts` | High | No `helmet` and no `express-rate-limit` anywhere — missing security headers + no rate limiting on auth/OAuth/login endpoints |
| `backend/src/index.ts:109-142` | High | CORS permits `origin === null`/`''` and `*.vercel.app` with `credentials: true` |
| `backend/src/controllers/githubOAuthController.ts:129,167` | High | OAuth callback `postMessage` uses target origin `'*'` |
| `backend/src/index.ts:146` | High | Session secret fallback |
| `backend/src/services/authService.ts:130-140` | High | Mock auth fallback |
| `backend/src/events/EventBus.ts:20-22` | Low | Listener errors swallowed (`console.error` only); failing subscriber silently drops events |
| `backend/src/controllers/*.controller.ts` | Medium | Sensitive data (emails, userIds, githubUsernames) logged at `info`/`error` |
| `backend/src/modules/ezone/scrapers/ezone.scraper.ts:10-38` | Medium | Sanitization is regex-based strip-list (blacklist) for HTML/JS — fragile |

---

## 8. Performance Improvements

| File:Line | Severity | Description |
|---|---|---|
| `backend/src/modules/growth/growthProjection.service.ts:78` | Medium | 6 parallel source queries over whole collections with no pagination and no indexed filters |
| `backend/src/services/githubService.ts:29-54` | Low | In-memory cache is process-local, unbounded, and shared across all users — not multi-instance safe |
| `backend/src/modules/growth/growthProjection.service.ts:350` | Medium | `getGithubMetrics` calls live GitHub API on every projection when cache misses |
| `backend/src/models/*` | Medium | No index definitions — lookups by `organizationId`, `personId`, `firebaseUid`, `githubUsername` are unindexed |
| `app/**` | Low | No evidence of pagination/`react-query` caching in reviewed pages |
| `backend/src/*` bundle | Low | Next frontend ships `sentry-example-page`, `test-crash` as real routes |

---

## 9. Developer Experience Improvements

| File:Line | Severity | Description |
|---|---|---|
| `backend/src/index.ts:16-47` | Medium | Startup prints `=== INDEX.TS STARTED ===` and full CONFIG_AUDIT block on every boot — noisy, leaks config shape |
| `backend/src/**` | Medium | No env-var validation (no `zod`/joi/`envalid`). Required vars only partially checked; silent `||` fallbacks |
| `backend/src/scripts/*` | Low | One-off verify/debug scripts in `src/` and ship with build |
| `backend/src/index.ts:82,174` | Low | Sentry handlers labeled "placeholder" in comments |
| `backend/src/shared/middleware/auth.middleware.ts` vs `middleware/auth.ts` | Low | Two competing auth middlewares with different shapes |
| `backend/src/services/upload-service.ts:80` | Low | `console.log` for duplicate-upload path instead of `logger` |
| Docs | Low | Multiple root-level markdown reports but no consolidated `ARCHITECTURE.md` |

---

## 10. Sprint-004 Implementation Plan

### Phase 1: Security Hardening (Week 1)

| Priority | Task | Impact | Risk | Effort |
|---|---|---|---|---|
| P0 | Add `helmet` and `express-rate-limit` middleware | High | Low | Small |
| P0 | Fix CORS null-origin + `*.vercel.app` wildcard | High | Medium | Small |
| P0 | Fix `postMessage` target origin from `'*'` to explicit frontend URL | High | Low | Small |
| P1 | Gate mock auth fallback to development only | High | Low | Small |
| P1 | Fail fast on missing `SESSION_SECRET` in production | High | Low | Small |
| P2 | Redact sensitive env vars from startup logs | Medium | Low | Small |

### Phase 2: Validation & Type Safety (Week 1-2)

| Priority | Task | Impact | Risk | Effort |
|---|---|---|---|---|
| P0 | Add Zod validation middleware for all POST/PUT routes | High | Medium | Large |
| P1 | Replace 577 `as any` casts with typed interfaces/DTOs | High | Medium | Large |
| P1 | Consolidate duplicate auth middleware into one typed middleware | Medium | Medium | Medium |
| P2 | Add request validation for GitHub OAuth callback params | Medium | Low | Small |

### Phase 3: Testing (Week 2-3)

| Priority | Task | Impact | Risk | Effort |
|---|---|---|---|---|
| P0 | Add unit tests for security-critical controllers (auth, GitHub, Gmail) | High | Low | Medium |
| P0 | Add unit tests for core services (auth, GitHub, analytics) | High | Low | Medium |
| P1 | Add model tests for schemas, hooks, indexes | Medium | Low | Medium |
| P1 | Add integration tests for GitHub OAuth round-trip | Medium | Medium | Large |
| P2 | Add integration tests for Gmail OAuth and upload pipeline | Medium | Medium | Large |

### Phase 4: Performance & Observability (Week 3-4)

| Priority | Task | Impact | Risk | Effort |
|---|---|---|---|---|
| P1 | Add compound indexes for hot query fields (`organizationId`, `personId`, `firebaseUid`, `githubUsername`) | High | Low | Medium |
| P1 | Add pagination to growth projection and list endpoints | Medium | Low | Medium |
| P2 | Replace in-memory GitHub cache with Redis/DB-backed cache | Medium | Medium | Medium |
| P2 | Cache growth projection; refresh async | Medium | Low | Medium |
| P3 | Add structured startup logger replacing CONFIG_AUDIT block | Low | Low | Small |

### Phase 5: Code Quality (Week 4)

| Priority | Task | Impact | Risk | Effort |
|---|---|---|---|---|
| P2 | Replace 244 `console.log` with `Logger` utility | Low | Low | Small |
| P2 | Move debug scripts from `src/scripts/` to `tools/` | Low | Low | Small |
| P3 | Remove incomplete Ezone scraper or implement resilience | Medium | Medium | Medium |
| P3 | Implement upload service event-emit hook | Low | Low | Small |
| P3 | Clean up placeholder UI components (career-growth, RelatedSkillsPanel) | Low | Low | Small |

---

## Prioritized Sprint-004 Backlog

### Sprint-004.1 (Must Have)
1. Security headers + rate limiting (`helmet`, `express-rate-limit`)
2. Fix CORS null-origin wildcard
3. Fix `postMessage` target origin
4. Gate mock auth fallback to development
5. Fail fast on missing `SESSION_SECRET`

### Sprint-004.2 (Should Have)
6. Add Zod validation middleware
7. Unit tests for auth/GitHub/Gmail controllers
8. Unit tests for auth/GitHub/analytics services
9. Add database indexes for hot query fields
10. Consolidate duplicate auth middleware

### Sprint-004.3 (Nice to Have)
11. Replace `as any` casts with typed DTOs
12. Add pagination to growth projection
13. Add integration tests for critical OAuth flows
14. Replace in-memory GitHub cache with Redis
15. Developer experience improvements (logging, scripts, docs)

---

## Assumptions & Limitations

- **Assessment based on static code analysis** only — no runtime profiling or load testing was performed
- **Test coverage estimates** based on file count comparison; actual coverage may vary
- **Security findings** are based on common OWASP patterns; full security audit requires dynamic analysis
- **Performance recommendations** are based on code inspection; actual bottlenecks require profiling
- **No code modifications were made** during this assessment

---

## Next Steps

1. Review and approve Sprint-004.1 scope
2. Create feature branches for each priority track
3. Begin with security hardening (low risk, high impact)
4. Follow with validation layer (enables safer refactoring)
5. Parallel track: test coverage expansion
