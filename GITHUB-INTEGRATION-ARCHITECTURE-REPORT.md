# GitHub Integration Architecture Report
**Date:** 2026-07-19  
**Sprint:** 003A Investigation  
**Status:** INVESTIGATION COMPLETE  

---

## 1. Executive Summary

The GitHub integration for Academic Universe is **partially implemented**. The OAuth flow, token storage, and basic analytics exist on the backend, but the critical path from "Connect GitHub" to "Verified Skills generated from GitHub" is **broken**. The frontend has no wired GitHub connect flow, and the backend does not publish the `GithubUpdated` event that triggers skill evidence creation.

**Verdict:** A student clicking "Connect GitHub" today will NOT see verified skills generated from GitHub.

---

## 2. Backend Investigation

### 2.1 GitHub OAuth Backend

| Component | Status | Details |
|-----------|--------|---------|
| `githubOAuthController.ts` | ✅ IMPLEMENTED | Connect, callback, disconnect, stats endpoints |
| `githubOAuthService.ts` | ✅ IMPLEMENTED | Token encryption, storage, retrieval, removal |
| `githubRoutes.ts` | ✅ IMPLEMENTED | Routes registered at `/api/github/*` |
| Environment variables | ⚠️ PARTIAL | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_TOKEN` required |

### 2.2 API Endpoints

| Endpoint | Method | Status | Purpose |
|----------|--------|--------|---------|
| `/api/github/connect` | GET | ✅ EXISTS | Initiates OAuth flow |
| `/api/github/callback` | GET | ✅ EXISTS | Handles OAuth callback |
| `/api/github/disconnect` | DELETE | ✅ EXISTS | Removes access token |
| `/api/github/stats` | GET | ✅ EXISTS | Returns developer analytics |
| `/api/github/projects` | GET | ✅ EXISTS | Returns project statistics |
| `/api/github/projects/refresh` | POST | ✅ EXISTS | Refreshes cached project stats |

### 2.3 Token Storage

| Stage | Status | Details |
|-------|--------|---------|
| OAuth token receipt | ✅ | `exchangeCodeForToken()` receives token from GitHub |
| Token encryption | ✅ | `EncryptionUtil.encrypt()` before storage |
| Token storage | ✅ | Stored in `User.githubAccessToken` (encrypted) |
| Token retrieval | ✅ | `getAccessToken()` decrypts on demand |
| Token removal | ✅ | `removeAccessToken()` clears on disconnect |

### 2.4 Repository Sync

| Stage | Status | Details |
|-------|--------|---------|
| Scheduled sync | ✅ | `schedulerService` runs every 6 hours |
| User discovery | ✅ | Finds all users with `githubAccessToken` |
| Repo fetching | ✅ | `analyticsService.fetchUserRepositories()` paginates through all repos |
| Stats calculation | ✅ | Calculates total/completed/ongoing, language distribution, stars, forks |
| **GithubRecord creation** | ❌ MISSING | `analyticsService` does NOT write to `GithubRecord` collection |
| **GithubUpdated event** | ❌ MISSING | `analyticsService` does NOT publish `GithubUpdated` event |

### 2.5 Skill Extraction

| Stage | Status | Details |
|-------|--------|---------|
| Language extraction | ✅ | `handleGithubUpdated()` in `SkillsEventListener` extracts languages from payload |
| SkillEvidence creation | ✅ | `ingestEvidence()` called for each language with `LANGUAGE-${language}` skillId |
| SkillProjection rebuild | ✅ | `rebuildAllSkillRecords()` called after evidence ingestion |
| **Event trigger** | ❌ MISSING | `GithubUpdated` event is never published for OAuth-connected users |

### 2.6 Growth Hub Integration

| Stage | Status | Details |
|-------|--------|---------|
| GitHub metrics in Growth | ✅ | `growthProjection.service.ts` reads `githubRepositoryCount` |
| Stats endpoint | ✅ | `/api/github/stats` returns developer analytics |
| Project stats endpoint | ✅ | `/api/github/projects` returns repo statistics |

---

## 3. Frontend Investigation

### 3.1 GitHub Connect Page/Component

| Component | Status | Details |
|-----------|--------|---------|
| Dedicated GitHub connect page | ❌ MISSING | No `/dashboard/student/github` or similar route |
| GitHub connect modal | ❌ MISSING | No modal or dialog for OAuth flow |
| PostMessage listener | ❌ MISSING | No code listens for `GITHUB_CONNECTED` or `GITHUB_CONNECT_ERROR` events |
| GitHub status display | ❌ MISSING | No component shows connection status or disconnect button |

### 3.2 "Connect GitHub" Button Analysis

**Location:** `app/dashboard/student/skills/components/EmptyState.tsx`

```tsx
{ icon: <Github className="w-5 h-5" />, label: 'Connect GitHub', description: 'Sync your repositories' }
```

**Status:** ❌ NOT WIRED
- The button has no `onClick` handler
- No navigation to a connect page
- No API call to `/api/github/connect`
- No popup or redirect logic
- Pure static UI element

### 3.3 Profile Page GitHub Field

**Location:** `app/dashboard/student/profile/page.tsx`

| Feature | Status | Details |
|---------|--------|---------|
| GitHub username input | ✅ EXISTS | Text input in profile form |
| OAuth connect button | ❌ MISSING | No button to initiate OAuth flow |
| Token display | ❌ MISSING | No indication of connection status |
| Disconnect button | ❌ MISSING | No way to disconnect from UI |

---

## 4. Complete Flow Analysis

### 4.1 Current Flow (What Actually Happens)

```
Student clicks "Connect GitHub"
        ↓
❌ NOTHING HAPPENS (button not wired)
```

### 4.2 Expected Flow (What Should Happen)

```
Student clicks "Connect GitHub"
        ↓
Frontend opens popup to /api/github/connect
        ↓
Backend redirects to GitHub OAuth
        ↓
Student authorizes on GitHub
        ↓
GitHub redirects to /api/github/callback
        ↓
Backend exchanges code for token
        ↓
Backend stores encrypted token in User.githubAccessToken
        ↓
Backend returns HTML with postMessage
        ↓
Frontend receives GITHUB_CONNECTED event
        ↓
Frontend closes popup and refreshes skills
        ↓
Scheduler (every 6 hours) calls analyticsService
        ↓
analyticsService fetches repos from GitHub API
        ↓
❌ MISSING: analyticsService does NOT create GithubRecord
❌ MISSING: analyticsService does NOT publish GithubUpdated event
        ↓
❌ BROKEN: SkillsEventListener never receives GithubUpdated
        ↓
❌ BROKEN: No SkillEvidence created from GitHub
        ↓
❌ BROKEN: No SkillProjection rebuild
        ↓
❌ BROKEN: Skills Intelligence page shows no GitHub skills
```

### 4.3 Missing Stages

| # | Stage | Status | Missing Piece |
|---|-------|--------|---------------|
| 1 | GitHub OAuth | ✅ | None |
| 2 | Token storage | ✅ | None |
| 3 | Repository sync | ⚠️ | No GithubRecord creation, no GithubUpdated event |
| 4 | Skill extraction | ❌ | Not triggered because event is never published |
| 5 | SkillEvidence creation | ❌ | Code exists but never runs |
| 6 | SkillProjection rebuild | ❌ | Code exists but never runs |
| 7 | Skills Intelligence refresh | ❌ | No event listener for GitHub updates |

---

## 5. Root Cause Analysis

### 5.1 Why "Connect GitHub" Does Nothing

1. **EmptyState.tsx** buttons have no `onClick` handlers
2. No frontend GitHub connect page exists
3. No postMessage listener exists for OAuth callback

### 5.2 Why GitHub Skills Are Never Created

1. `analyticsService.processDeveloperAnalytics()` only returns stats — it does not persist data
2. No code path creates `GithubRecord` documents from OAuth-connected users
3. No code path publishes `GithubUpdated` event for OAuth-connected users
4. `SkillsEventListener.handleGithubUpdated()` exists but is never triggered
5. The `GithubAdapter` in `routingEngine.ts` is only used for document uploads (UAIP pipeline), not for GitHub OAuth data

### 5.3 Why the Scheduler Doesn't Create Skills

The scheduler calls `analyticsService.processDeveloperAnalytics()` which:
- Fetches repositories ✅
- Calculates statistics ✅
- Returns `DeveloperStats` object ✅
- Does NOT write to `GithubRecord` ❌
- Does NOT publish `GithubUpdated` ❌
- Does NOT create `SkillEvidence` ❌

---

## 6. Missing Integration Plan

### 6.1 Backend Changes Required

| # | Component | Change | Priority |
|---|-----------|--------|----------|
| 1 | `analyticsService.ts` | Add `persistGithubRecord()` method that writes `GithubRecord` and publishes `GithubUpdated` event | HIGH |
| 2 | `schedulerService.ts` | Call `persistGithubRecord()` after `processDeveloperAnalytics()` | HIGH |
| 3 | `githubOAuthController.ts` | Add `syncGithubData()` endpoint to trigger immediate sync after OAuth | HIGH |
| 4 | `githubRoutes.ts` | Register `POST /api/github/sync` route | HIGH |

### 6.2 Frontend Changes Required

| # | Component | Change | Priority |
|---|-----------|--------|----------|
| 1 | `EmptyState.tsx` | Wire "Connect GitHub" button to open OAuth popup | HIGH |
| 2 | `useEffect` in page | Add `postMessage` listener for `GITHUB_CONNECTED`/`GITHUB_CONNECT_ERROR` | HIGH |
| 3 | `ProfilePage.tsx` | Add "Connect GitHub" button with OAuth flow | MEDIUM |
| 4 | New component | `GitHubConnectModal` or similar for OAuth initiation | MEDIUM |
| 5 | Skills page | Show GitHub connection status on skill cards | LOW |

### 6.3 End-to-End Flow After Fixes

```
Student clicks "Connect GitHub"
        ↓
Frontend opens popup to /api/github/connect
        ↓
GitHub OAuth flow completes
        ↓
Backend stores token, returns HTML with postMessage
        ↓
Frontend receives GITHUB_CONNECTED, closes popup
        ↓
Frontend calls POST /api/github/sync
        ↓
Backend fetches repos, creates GithubRecord
        ↓
Backend publishes GithubUpdated event
        ↓
SkillsEventListener.handleGithubUpdated()
        ↓
Creates SkillEvidence for each language
        ↓
Rebuilds all SkillProjections
        ↓
Frontend refreshes Skills Intelligence
        ↓
Student sees "Python" with evidence from GitHub
```

### 6.4 API Contract Additions

```
POST /api/github/sync
Headers: Authorization: Bearer <token>
Response: {
  "success": true,
  "message": "GitHub data synced successfully",
  "data": {
    "repositoriesFetched": 42,
    "languagesExtracted": 8,
    "skillsCreated": 8,
    "projectionsRebuilt": 1
  }
}
```

---

## 7. Verification Plan

### 7.1 Backend Verification

1. **OAuth Flow**
   - `GET /api/github/connect` returns 302 redirect to GitHub
   - `GET /api/github/callback` exchanges code for token
   - Token is encrypted and stored in `User.githubAccessToken`

2. **Sync Flow**
   - `POST /api/github/sync` fetches repos
   - `GithubRecord` is created/updated
   - `GithubUpdated` event is published
   - `SkillsEventListener` processes event
   - `SkillEvidence` documents are created
   - `SkillRecord` projections are rebuilt

3. **Scheduler**
   - Cron job runs every 6 hours
   - All connected users are processed
   - Skills are created/updated for all users

### 7.2 Frontend Verification

1. **Connect Button**
   - Clicking "Connect GitHub" opens popup
   - Popup navigates to `/api/github/connect`
   - After OAuth, popup closes automatically
   - Skills page refreshes automatically

2. **PostMessage Listener**
   - `GITHUB_CONNECTED` triggers profile refresh
   - `GITHUB_CONNECT_ERROR` shows error toast
   - Popup closes on both success and error

3. **Skills Display**
   - GitHub skills appear in Skills Intelligence
   - Evidence shows GitHub as source
   - Confidence and proficiency are calculated correctly

---

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| GitHub API rate limits | MEDIUM | HIGH | Implement request caching and backoff (already partially implemented) |
| Token encryption key rotation | LOW | HIGH | Document key rotation procedure |
| Large repo lists cause timeouts | MEDIUM | MEDIUM | Implement pagination and async processing |
| Skills created without student action | LOW | MEDIUM | Only create skills from connected GitHub accounts |
| EventBus message loss | LOW | MEDIUM | Implement event persistence or idempotency |

---

## 9. Recommendation

**Do NOT proceed with frontend-only fixes.** The core issue is backend: the GitHub data never reaches the Skills Tracker. The correct implementation order is:

1. **Backend first:** Fix `analyticsService` to persist `GithubRecord` and publish `GithubUpdated`
2. **Backend second:** Add `POST /api/github/sync` endpoint
3. **Frontend third:** Wire buttons and add postMessage listener
4. **Testing:** Verify end-to-end flow with real GitHub OAuth

Only after the backend flow is complete will the "Connect GitHub" button actually produce verified skills.

---

*Report generated by Kilo — GitHub Integration Investigation*
