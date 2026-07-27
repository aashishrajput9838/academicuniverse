# Sprint-004 — Implementation Plan

**Date:** 2026-07-19  
**Branch:** main  
**Duration:** 4 weeks  
**Team:** 1-2 engineers  
**Status:** READY FOR REVIEW

---

## Sprint-004 Goals

1. **Security Hardening** — Add security headers, rate limiting, fix CORS and OAuth callback security
2. **Validation Layer** — Introduce schema validation for all incoming requests
3. **Test Coverage** — Add unit tests for security-critical paths
4. **Performance Foundation** — Add database indexes and pagination
5. **Code Quality** — Reduce technical debt in auth and logging

---

## Phase 1: Security Hardening (Week 1)

### 1.1 Add Helmet and Rate Limiting

**Files to modify:**
- `backend/src/index.ts` — add `helmet()` and `express-rate-limit` middleware
- `backend/package.json` — add dependencies: `helmet`, `express-rate-limit`

**Implementation:**
```ts
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Security headers
app.use(helmet());

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: 'Too many login attempts, please try again later',
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/github/connect', authLimiter);
```

**Impact:** High — prevents brute-force attacks and adds standard security headers  
**Risk:** Low — well-tested middleware, minimal configuration  
**Effort:** Small (~2 hours)

### 1.2 Fix CORS Configuration

**Files to modify:**
- `backend/src/index.ts:109-142`

**Implementation:**
- Remove `origin === null`/`''` allowance when `credentials: true`
- Replace `*.vercel.app` wildcard with explicit frontend origins
- Add `sameSite: 'lax'` to CORS credentials

**Impact:** High — prevents credential leakage to arbitrary origins  
**Risk:** Medium — must ensure frontend origins are correctly enumerated  
**Effort:** Small (~1 hour)

### 1.3 Fix postMessage Target Origin

**Files to modify:**
- `backend/src/controllers/githubOAuthController.ts:129,167`

**Implementation:**
```ts
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Success
window.opener.postMessage({ type: 'GITHUB_CONNECTED', ... }, FRONTEND_URL);

// Error
window.opener.postMessage({ type: 'GITHUB_CONNECT_ERROR', ... }, FRONTEND_URL);
```

**Impact:** High — prevents token/code leakage to malicious windows  
**Risk:** Low — explicit origin is safer than wildcard  
**Effort:** Small (~30 minutes)

### 1.4 Gate Mock Auth Fallback

**Files to modify:**
- `backend/src/services/authService.ts:130-140`

**Implementation:**
```ts
if (process.env.NODE_ENV !== 'production' && !firebaseAdmin.initialized) {
  // Mock fallback only in development
  return mockAuthLogin(request);
}
throw new Error('Firebase Admin not initialized');
```

**Impact:** High — prevents accidental authentication bypass in production  
**Risk:** Low — adds explicit environment check  
**Effort:** Small (~30 minutes)

### 1.5 Fail Fast on Missing Session Secret

**Files to modify:**
- `backend/src/index.ts:146`

**Implementation:**
```ts
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret && process.env.NODE_ENV === 'production') {
  throw new Error('SESSION_SECRET is required in production');
}
app.use(session({ secret: sessionSecret || 'fallback_session_secret', ... }));
```

**Impact:** High — prevents session forgery in production  
**Risk:** Low — fails fast with clear error  
**Effort:** Small (~15 minutes)

---

## Phase 2: Validation Layer (Week 1-2)

### 2.1 Add Zod Validation Middleware

**Files to create:**
- `backend/src/middleware/validation.ts` — generic validation wrapper

**Files to modify:**
- `backend/package.json` — add `zod` dependency
- All controller files — add validation schemas

**Implementation:**
```ts
import { z } from 'zod';

const createGithubMappingSchema = z.object({
  subjectCode: z.string().min(1),
  skillId: z.string().min(1),
  skillName: z.string().min(1),
  skillCategory: z.enum(['TECHNICAL', 'SOFT', 'ACADEMIC']),
  relevanceWeight: z.number().min(0).max(1),
});

export const validateBody = (schema: z.ZodSchema) => (req: any, res: any, next: any) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error });
  }
  req.body = result.data;
  next();
};
```

**Impact:** High — prevents invalid data from entering business logic  
**Risk:** Medium — must cover all endpoints without breaking existing clients  
**Effort:** Large (~3-4 days)

### 2.2 Consolidate Auth Middleware

**Files to modify:**
- `backend/src/middleware/auth.ts` — keep as canonical
- `backend/src/shared/middleware/auth.middleware.ts` — deprecate or remove
- All controllers — update imports to use canonical middleware

**Impact:** Medium — reduces confusion and inconsistent `req.user` shapes  
**Risk:** Medium — must ensure all call sites are updated  
**Effort:** Medium (~1 day)

---

## Phase 3: Testing (Week 2-3)

### 3.1 Unit Tests for Security-Critical Controllers

**Files to create:**
- `backend/src/controllers/__tests__/githubController.test.ts`
- `backend/src/controllers/__tests__/githubOAuthController.test.ts`
- `backend/src/controllers/__tests__/gmailController.test.ts`
- `backend/src/controllers/__tests__/authController.test.ts`

**Test coverage targets:**
- Authentication flow (login, token refresh)
- GitHub OAuth flow (connect, callback, disconnect)
- Gmail OAuth flow (connect, callback, disconnect)
- Authorization checks (role-based access)

**Impact:** High — prevents regressions in security-critical paths  
**Risk:** Low — tests are additive, no production changes  
**Effort:** Medium (~2-3 days)

### 3.2 Unit Tests for Core Services

**Files to create:**
- `backend/src/services/__tests__/authService.test.ts`
- `backend/src/services/__tests__/githubService.test.ts`
- `backend/src/services/__tests__/githubOAuthService.test.ts`
- `backend/src/services/__tests__/analyticsService.test.ts`

**Test coverage targets:**
- Token generation and verification
- GitHub API integration (mocked)
- GitHub OAuth token exchange (mocked)
- Analytics sync pipeline

**Impact:** High — ensures core business logic correctness  
**Risk:** Low — tests are additive  
**Effort:** Medium (~2-3 days)

### 3.3 Database Index Tests

**Files to create:**
- `backend/src/models/__tests__/index.test.ts`

**Test coverage targets:**
- Verify indexes exist on hot query fields
- Verify unique constraints
- Verify compound indexes for common filters

**Impact:** Medium — prevents performance regressions  
**Risk:** Low — tests are additive  
**Effort:** Small (~1 day)

---

## Phase 4: Performance (Week 3-4)

### 4.1 Add Database Indexes

**Files to modify:**
- `backend/src/models/User.ts` — add index on `firebaseUid`, `githubUsername`
- `backend/src/models/Person.ts` — add compound index on `organizationId + userIds`
- `backend/src/models/SkillRecord.ts` — add compound index on `organizationId + personId`
- `backend/src/models/GithubRecord.ts` — add compound index on `organizationId + personId`

**Implementation:**
```ts
userSchema.index({ firebaseUid: 1 }, { sparse: true });
userSchema.index({ githubUsername: 1 }, { sparse: true });
personSchema.index({ organizationId: 1, userIds: 1 });
skillRecordSchema.index({ organizationId: 1, personId: 1, proficiencyScore: -1 });
```

**Impact:** High — eliminates collection scans for common queries  
**Risk:** Low — indexes are additive, no query changes  
**Effort:** Medium (~1 day)

### 4.2 Add Pagination to Growth Projection

**Files to modify:**
- `backend/src/modules/growth/growthProjection.service.ts:78`
- `backend/src/controllers/growthController.ts`

**Implementation:**
- Add `limit` and `cursor` parameters to projection queries
- Return paginated results with `nextCursor`
- Default limit: 20, max limit: 100

**Impact:** Medium — prevents unbounded memory usage  
**Risk:** Low — additive pagination, existing behavior preserved for default limit  
**Effort:** Medium (~1 day)

### 4.3 Cache GitHub Metrics

**Files to modify:**
- `backend/src/modules/growth/growthProjection.service.ts:350`

**Implementation:**
- Cache `getGithubMetrics` results in Redis or DB
- Refresh cache async after GitHub sync
- TTL: 1 hour

**Impact:** Medium — reduces external API calls and latency  
**Risk:** Medium — introduces new dependency (Redis) or cache invalidation complexity  
**Effort:** Medium (~2 days)

---

## Phase 5: Code Quality (Week 4)

### 5.1 Replace console.log with Logger

**Files to modify:**
- All files with `console.log` (244 occurrences)

**Impact:** Low — improves log consistency  
**Risk:** Low — no behavior change  
**Effort:** Small (~2 hours)

### 5.2 Move Debug Scripts

**Files to move:**
- `backend/src/scripts/*` → `tools/scripts/`

**Impact:** Low — cleans up source tree  
**Risk:** Low — no production impact  
**Effort:** Small (~1 hour)

### 5.3 Remove Incomplete Code

**Files to modify:**
- `backend/src/services/ocr/engines/PaddleOcrEngine.ts:9` — remove or implement
- `backend/src/services/upload-service.ts:31` — implement event-emit hook
- `app/dashboard/faculty/career-growth/page.tsx:115-125` — remove or feature-flag
- `app/dashboard/student/skills/components/RelatedSkillsPanel.tsx:21` — remove or feature-flag

**Impact:** Low — reduces confusion and bundle size  
**Risk:** Low — incomplete code is not functional anyway  
**Effort:** Small (~2 hours)

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| CORS change breaks frontend | Medium | High | Test all frontend routes; maintain allowlist |
| Zod validation rejects valid requests | Medium | High | Review all existing controllers; add backward-compatible schemas |
| Index creation impacts write performance | Low | Medium | Test write latency; add indexes during low-traffic window |
| Cache invalidation bugs | Medium | Medium | Start with TTL-based cache; add cache-busting on sync |
| Test flakiness in CI | Low | Low | Add retry logic; stabilize external API mocks |

---

## Dependencies

| Dependency | Version | Purpose |
|---|---|---|
| `helmet` | ^8.0.0 | Security headers |
| `express-rate-limit` | ^7.0.0 | Rate limiting |
| `zod` | ^3.22.0 | Schema validation |
| `redis` (optional) | ^4.0.0 | GitHub metrics cache |

---

## Success Metrics

| Metric | Target | Measurement |
|---|---|---|
| Security headers score | A+ on securityheaders.com | External scan |
| Rate limiting effectiveness | 0 brute-force successes | Auth log analysis |
| Test coverage | >60% for controllers/services | Jest coverage report |
| API validation coverage | 100% POST/PUT routes | Route audit |
| Database query performance | <100ms p95 for skill queries | APM/profiling |
| Error rate | <0.1% 5xx responses | Error tracking |

---

## Out of Scope

- Frontend redesign or new pages
- Mobile app development
- Third-party integrations beyond GitHub/Gmail
- Infrastructure changes (deployment, hosting)
- Database schema migrations beyond indexes

---

## Next Steps

1. Review and approve Sprint-004 plan
2. Create feature branches: `security-hardening`, `validation-layer`, `test-coverage`, `performance`
3. Begin Phase 1 (Security Hardening) — lowest risk, highest impact
4. Daily standups to track progress
5. Code review required for all changes
