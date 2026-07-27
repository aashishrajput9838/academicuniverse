# Sprint-003C/D — Manual Verification Checklist

**Status:** AWAITING MANUAL VERIFICATION  
**Tester:** Human-in-the-loop required  
**Estimated Time:** 60-90 minutes  
**Prerequisites:**
- Backend running on `http://localhost:5003`
- Frontend running on `http://localhost:3000`
- MongoDB running locally
- Test user credentials:
  - Email: `2023329421.aashish@ug.sharda.ac.in`
  - GitHub username: `aashishrajput9838`
  - GitHub OAuth app configured with callback `http://localhost:5003/api/github/callback`
- Browser DevTools open (Network + Console tabs)
- Postman/curl available for direct API calls

---

## How to Use This Checklist

1. Work through each section in order
2. Mark each test case as PASS / FAIL
3. For any FAIL:
   - Note the exact error message
   - Copy relevant log lines
   - Identify the failing layer (Frontend / Backend Controller / Backend Service / Database / EventBus)
   - Do NOT modify production code
   - Report back with evidence for fix proposal

---

## Section 1: GitHub OAuth Flow

### TC-1.1: Connect GitHub Popup Opens
**Steps:**
1. Log into frontend as student user
2. Navigate to Skills page
3. Click "Connect GitHub" button
4. Observe behavior

**Expected:**
- [ ] Popup window opens (not full-page redirect)
- [ ] Popup URL is `https://github.com/login/oauth/authorize?...`
- [ ] Parent page shows "Connecting..." state
- [ ] Connect button is disabled

**Pass Criteria:** Popup opens with correct GitHub authorization URL

---

### TC-1.2: GitHub Authorization Success
**Steps:**
1. In popup, authorize the GitHub OAuth app
2. Observe popup behavior
3. Observe parent page behavior

**Expected:**
- [ ] Popup closes automatically after authorization
- [ ] Parent page receives success message (no manual refresh needed)
- [ ] Parent page shows "Syncing GitHub repositories..." status
- [ ] Status updates to "GitHub connected successfully." within 30 seconds

**Pass Criteria:** Complete OAuth flow without manual intervention

---

### TC-1.3: GitHub Authorization Denial
**Steps:**
1. Click "Connect GitHub"
2. In popup, click "Cancel" or deny authorization
3. Observe behavior

**Expected:**
- [ ] Popup closes
- [ ] Connect button is re-enabled
- [ ] Error message displayed: "GitHub connection failed"
- [ ] No unhandled exceptions in browser console

**Pass Criteria:** Graceful handling of user denial

---

### TC-1.4: Popup Communication Verification
**Steps:**
1. Open Browser DevTools → Console
2. Click "Connect GitHub"
3. Authorize in popup
4. Watch console for message events

**Expected:**
- [ ] Parent window receives `MessageEvent` with `type: "GITHUB_CONNECTED"`
- [ ] No `GITHUB_CONNECT_ERROR` event
- [ ] Popup `window.close()` executes after message delivery (check Network tab for `callback` request)

**Pass Criteria:** Message delivered before popup destruction

---

## Section 2: GitHub Sync

### TC-2.1: Sync Triggered After OAuth
**Steps:**
1. Complete GitHub OAuth flow
2. Watch backend logs
3. Wait for sync to complete

**Expected Backend Logs:**
- [ ] `Syncing GitHub data for user: <firebaseUid>`
- [ ] `GitHub OAuth token retrieved successfully`
- [ ] `Found N repositories` (expect ~80 for test user)
- [ ] `GithubRecord persisted for user: <firebaseUid>`
- [ ] `GithubUpdated event published`
- [ ] `SkillEvidence created` (multiple lines)
- [ ] `All SkillRecord projections rebuilt`
- [ ] `SkillProfileRebuilt event published`
- [ ] `Growth Hub projection rebuilt after Skills Tracker update`
- [ ] `Growth Hub projection built` with `skillsState: "AVAILABLE"` and `skillsTotal > 0`

**Pass Criteria:** All log lines appear in sequence

---

### TC-2.2: Sync API Response
**Steps:**
1. After OAuth completes, capture the `POST /api/github/sync` request
2. Inspect response

**Expected:**
- [ ] HTTP 200
- [ ] Response body contains:
  - `success: true`
  - `repositoriesFetched: > 0`
  - `skillRecordsCreated: > 0`
  - `message: "GitHub data synced successfully"`

**Pass Criteria:** API returns success with non-zero counts

---

### TC-2.3: Manual Sync Trigger
**Steps:**
1. Navigate to Skills page
2. Click "Refresh GitHub" or equivalent manual sync button
3. Observe behavior

**Expected:**
- [ ] Sync initiates without OAuth popup
- [ ] Status shows "Syncing..."
- [ ] Completes within 30 seconds
- [ ] Skills update if new repositories exist

**Pass Criteria:** Manual sync works independently of OAuth

---

## Section 3: Repository Processing

### TC-3.1: Repository Count
**Steps:**
1. Query MongoDB directly:
   ```js
   db.githubrecords.find({ personId: <Person._id> })
   ```
2. Count repositories

**Expected:**
- [ ] GithubRecord exists for test user
- [ ] `repositories` array has > 0 items (expect ~80)
- [ ] Each repository has: `name`, `url`, `language`, `topics`, `stars`, `forks`

**Pass Criteria:** All fetched repositories persisted

---

### TC-3.2: Repository Language Distribution
**Steps:**
1. Query MongoDB:
   ```js
   db.githubrecords.findOne({ personId: <Person._id> }).languages
   ```
2. Inspect language counts

**Expected:**
- [ ] `languages` object exists
- [ ] Contains at least 3-5 distinct languages
- [ ] Each language has `count > 0` and `repos > 0`

**Pass Criteria:** Language extraction working

---

### TC-3.3: Repository Topic Classification
**Steps:**
1. Query MongoDB:
   ```js
   db.githubrecords.findOne({ personId: <Person._id> }).topics
   ```
2. Inspect topics array

**Expected:**
- [ ] `topics` array exists
- [ ] Contains ESCO-mapped topics (e.g., "programming", "web-development")
- [ ] No raw GitHub topics like "hacktoberfest" (should be filtered)

**Pass Criteria:** Topic classification and filtering working

---

## Section 4: Skill Extraction

### TC-4.1: SkillRecord Count
**Steps:**
1. Query MongoDB:
   ```js
   db.skillrecords.find({ personId: <Person._id> })
   ```
2. Count documents

**Expected:**
- [ ] > 0 SkillRecords exist (expect 5-15 based on repositories)
- [ ] Each has: `skillId`, `skillName`, `skillCategory`, `proficiencyScore`, `evidenceCount`, `status`

**Pass Criteria:** Skills extracted from repositories

---

### TC-4.2: Skill Categories
**Steps:**
1. Query MongoDB:
   ```js
   db.skillrecords.distinct("skillCategory", { personId: <Person._id> })
   ```
2. Inspect categories

**Expected:**
- [ ] At least one of: `TECHNICAL`, `SOFT`, `ACADEMIC`
- [ ] Categories match repository languages/topics

**Pass Criteria:** Skills categorized correctly

---

### TC-4.3: Proficiency Scores
**Steps:**
1. Query MongoDB:
   ```js
   db.skillrecords.find({ personId: <Person._id> }).sort({ proficiencyScore: -1 })
   ```
2. Inspect scores

**Expected:**
- [ ] Scores are numeric (0-100)
- [ ] Scores correlate with repository stars/forks/activity
- [ ] No negative scores or scores > 100

**Pass Criteria:** Proficiency calculation reasonable

---

### TC-4.4: SkillRecord Status
**Steps:**
1. Query MongoDB:
   ```js
   db.skillrecords.find({ personId: <Person._id> }).forEach(s => print(s.status))
   ```
2. Inspect statuses

**Expected:**
- [ ] All records have `status: "ACTIVE"` or `"PENDING"`
- [ ] No `status: "ARCHIVED"` for freshly synced skills

**Pass Criteria:** Fresh skills marked active/pending

---

## Section 5: Skill Evidence

### TC-5.1: Evidence Record Count
**Steps:**
1. Query MongoDB:
   ```js
   db.skillevidences.find({ personId: <Person._id> }).count()
   ```
2. Compare with SkillRecord evidence counts

**Expected:**
- [ ] Evidence count matches `SkillRecord.evidenceCount`
- [ ] Each evidence has: `skillId`, `sourceType`, `primarySource`, `payload`, `confidenceScore`

**Pass Criteria:** Evidence linked to skills

---

### TC-5.2: Evidence Sources
**Steps:**
1. Query MongoDB:
   ```js
   db.skillevidences.find({ personId: <Person._id> }).forEach(e => print(e.sourceType, e.primarySource))
   ```
2. Inspect sources

**Expected:**
- [ ] Sources include: `GITHUB_REPO`, `GITHUB_LANGUAGE`, `GITHUB_TOPIC`
- [ ] Each source maps back to a specific repository or language

**Pass Criteria:** Evidence traceable to GitHub data

---

### TC-5.3: Evidence Confidence Scores
**Steps:**
1. Query MongoDB:
   ```js
   db.skillevidences.find({ personId: <Person._id> }).forEach(e => print(e.confidenceScore))
   ```
2. Inspect scores

**Expected:**
- [ ] Scores are numeric (0-1)
- [ ] Scores correlate with evidence strength (stars > 0 → higher confidence)
- [ ] No negative scores or scores > 1

**Pass Criteria:** Confidence calculation reasonable

---

## Section 6: Growth Integration

### TC-6.1: Growth Projection Exists
**Steps:**
1. Query MongoDB:
   ```js
   db.growthprojections.find({ personId: <Person._id> })
   ```
2. Inspect document

**Expected:**
- [ ] GrowthProjection exists for test user
- [ ] `skills` section has `state: "AVAILABLE"` (not "EMPTY")
- [ ] `skills.value.totalSkills > 0`
- [ ] `sources.skillsTracker.state: "AVAILABLE"`

**Pass Criteria:** Growth projection reflects Skills Tracker data

---

### TC-6.2: Growth API Response
**Steps:**
1. Call `GET /api/growth/projection/me` with valid JWT
2. Inspect response

**Expected:**
- [ ] HTTP 200
- [ ] `metrics.skills.state: "AVAILABLE"`
- [ ] `metrics.skills.value.totalSkills > 0`
- [ ] `sources.skillsTracker.state: "AVAILABLE"`

**Pass Criteria:** API returns populated growth data

---

### TC-6.3: Growth Rebuild After Skill Update
**Steps:**
1. Note current `skillsTotal` in Growth projection
2. Trigger a skill update (e.g., via admin API or direct DB insert)
3. Wait 10 seconds
4. Re-query Growth projection

**Expected:**
- [ ] `skillsTotal` updates to reflect new skill
- [ ] Event log shows `SkillProfileRebuilt` published
- [ ] Event log shows `Growth Hub projection rebuilt`

**Pass Criteria:** Growth updates reactively to skill changes

---

## Section 7: Person Resolution

### TC-7.1: Existing Person Resolution
**Steps:**
1. Call `GET /api/skills/me` with valid JWT
2. Inspect response

**Expected:**
- [ ] HTTP 200
- [ ] `profileId` matches existing Person._id
- [ ] Skills array populated

**Pass Criteria:** Existing Person resolved correctly

---

### TC-7.2: New User Person Creation
**Steps:**
1. Create a new test user with no Person document
2. Log in as that user
3. Call `GET /api/skills/me`

**Expected:**
- [ ] HTTP 200 (not 500)
- [ ] New Person document created in MongoDB
- [ ] Person.userIds contains User._id
- [ ] Person.primaryEmail matches user email
- [ ] Person.primaryName matches user name

**Pass Criteria:** Placeholder Person created automatically

---

### TC-7.3: Email-Based Resolution
**Steps:**
1. Create Person document with `primaryEmail` matching user email
2. Ensure Person has NO `userIds` linked to this User._id
3. Call `GET /api/skills/me`

**Expected:**
- [ ] HTTP 200
- [ ] User._id appended to Person.userIds
- [ ] Response returns skills for that Person

**Pass Criteria:** Email lookup links User to Person

---

## Section 8: Analytics Pipeline

### TC-8.1: GithubRecord Persistence
**Steps:**
1. Complete GitHub sync
2. Query MongoDB:
   ```js
   db.githubrecords.findOne({ personId: <Person._id> })
   ```
3. Inspect document

**Expected:**
- [ ] GithubRecord exists
- [ ] `personId` is canonical Person._id (not User._id)
- [ ] `organizationId` matches user's organization
- [ ] `repositories` array populated
- [ ] `languages` object populated
- [ ] `topics` array populated
- [ ] `syncedAt` timestamp is recent

**Pass Criteria:** GithubRecord persisted with correct identity

---

### TC-8.2: Event Publication
**Steps:**
1. Complete GitHub sync
2. Inspect backend logs for event publications

**Expected:**
- [ ] `GithubUpdated` event published with payload:
  - `personId: <Person._id>`
  - `organizationId: <orgId>`
  - `firebaseUid: <firebaseUid>`
- [ ] `SkillProfileRebuilt` event published after skill processing

**Pass Criteria:** Events published with correct payload

---

### TC-8.3: SkillEvidence Ingestion
**Steps:**
1. Complete GitHub sync
2. Query MongoDB:
   ```js
   db.skillevidences.find({ personId: <Person._id> }).count()
   ```
3. Compare with GithubRecord repositories count

**Expected:**
- [ ] Evidence count > 0
- [ ] Each repository produced at least one evidence record
- [ ] Evidence linked to correct `personId` (Person._id)

**Pass Criteria:** Evidence ingestion pipeline working

---

## Section 9: Disconnect/Reconnect

### TC-9.1: Disconnect GitHub
**Steps:**
1. Navigate to Settings or GitHub connection section
2. Click "Disconnect GitHub"
3. Confirm action
4. Observe behavior

**Expected:**
- [ ] GitHub access token removed from User document
- [ ] `githubUsername` cleared from User document
- [ ] GithubRecord archived or deleted
- [ ] SkillRecords from GitHub sources marked inactive
- [ ] UI updates to show "Connect GitHub" button

**Pass Criteria:** Clean disconnection

---

### TC-9.2: Reconnect GitHub
**Steps:**
1. After disconnecting, click "Connect GitHub" again
2. Complete OAuth flow
3. Verify sync

**Expected:**
- [ ] New OAuth flow initiates
- [ ] New access token stored
- [ ] New GithubRecord created (or old one updated)
- [ ] Skills re-extracted and re-projected
- [ ] Growth Hub updates accordingly

**Pass Criteria:** Clean reconnection with full sync

---

## Section 10: Regression Scenarios

### TC-10.1: Existing User with Pre-Existing Person
**Steps:**
1. Log in as user who already has Person document linked
2. Navigate to Skills page
3. Verify skills load

**Expected:**
- [ ] No errors
- [ ] Skills load from existing SkillRecords
- [ ] No duplicate Person created
- [ ] Growth Hub shows correct totals

**Pass Criteria:** Backward compatibility maintained

---

### TC-10.2: User Without GitHub Connected
**Steps:**
1. Log in as user without GitHub connection
2. Navigate to Skills page
3. Observe behavior

**Expected:**
- [ ] Skills page loads without errors
- [ ] Shows empty state or placeholder skills
- [ ] No unhandled exceptions

**Pass Criteria:** Graceful handling of missing GitHub

---

### TC-10.3: Token Expiry During Sync
**Steps:**
1. Connect GitHub
2. Manually expire the stored access token in DB
3. Trigger manual sync

**Expected:**
- [ ] Sync fails gracefully
- [ ] Error message: "GitHub access token expired"
- [ ] UI prompts user to reconnect
- [ ] No unhandled exceptions

**Pass Criteria:** Graceful token expiry handling

---

### TC-10.4: Network Failure During Sync
**Steps:**
1. Connect GitHub
2. Block network access to `api.github.com` (hosts file or firewall)
3. Trigger manual sync

**Expected:**
- [ ] Sync fails gracefully
- [ ] Error message about network/GitHub API
- [ ] UI remains responsive
- [ ] No infinite loading spinner

**Pass Criteria:** Graceful network failure handling

---

### TC-10.5: Concurrent Sync Requests
**Steps:**
1. Connect GitHub
2. Trigger sync from two browser tabs simultaneously
3. Observe behavior

**Expected:**
- [ ] Only one sync executes at a time (or both complete without corruption)
- [ ] Final state is consistent
- [ ] No duplicate SkillRecords or Evidence
- [ ] No unhandled exceptions

**Pass Criteria:** Concurrency safety

---

## Section 11: JWT Authentication Verification

### TC-11.1: Token Generation
**Steps:**
1. Log in via frontend
2. Inspect JWT payload (jwt.io or backend decode)
3. Verify claims

**Expected Claims:**
- [ ] `userId` — User._id
- [ ] `email` — User email
- [ ] `name` — User display name (optional but present)
- [ ] `organizationId` — Organization._id
- [ ] `roleId` — Role._id
- [ ] `permissions` — Array of permission names
- [ ] `isSuperAdmin` — Boolean
- [ ] `iat` — Issued at timestamp
- [ ] `exp` — Expiration timestamp (7 days from now)

**Pass Criteria:** JWT contains all required claims

---

### TC-11.2: Token Verification
**Steps:**
1. Copy JWT from browser localStorage
2. Call `GET /api/skills/me` with `Authorization: Bearer <token>`
3. Verify response

**Expected:**
- [ ] HTTP 200
- [ ] Response contains skills data

**Pass Criteria:** Token verification works consistently

---

### TC-11.3: Legacy Token (Without name)
**Steps:**
1. Generate JWT without `name` claim (simulate legacy token)
2. Call `GET /api/skills/me`

**Expected:**
- [ ] HTTP 200 (not 500)
- [ ] Person resolved via userId or email lookup
- [ ] Skills returned

**Pass Criteria:** Backward compatibility with legacy tokens

---

## Section 12: Database Consistency

### TC-12.1: Person Document Integrity
**Steps:**
1. Query MongoDB:
   ```js
   db.people.find({ organizationId: <orgId> }).forEach(p => {
     print(p._id, p.primaryEmail, p.userIds.map(id => id.toString()))
   })
   ```
2. Verify all Person documents

**Expected:**
- [ ] Every Person has `userIds` array
- [ ] Every `userIds` entry is a valid User._id
- [ ] No duplicate Person documents for same email
- [ ] `primaryEmail` matches a User email

**Pass Criteria:** Person documents are consistent

---

### TC-12.2: SkillRecord-Person Linkage
**Steps:**
1. Query MongoDB:
   ```js
   db.skillrecords.find({ personId: <Person._id> }).count()
   ```
2. Verify all SkillRecords for test user

**Expected:**
- [ ] All SkillRecords have `personId = Person._id` (not User._id)
- [ ] All SkillRecords have `organizationId` matching Person.organizationId
- [ ] No orphaned SkillRecords (personId referencing non-existent Person)

**Pass Criteria:** SkillRecords linked to canonical Person

---

### TC-12.3: Evidence-Record Consistency
**Steps:**
1. Query MongoDB:
   ```js
   db.skillevidences.find({ personId: <Person._id> }).forEach(e => {
     print(e.skillId, e.personId)
   })
   ```
2. Verify all Evidence documents

**Expected:**
- [ ] Every Evidence has `personId = Person._id`
- [ ] Every Evidence has `skillId` matching an existing SkillRecord
- [ ] No orphaned Evidence

**Pass Criteria:** Evidence linked to valid skills

---

## Failure Triage Template

For any FAIL, collect:

```
Test Case: TC-XX.X
Status: FAIL
Error Message: <exact error>
HTTP Status: <if applicable>
Request URL: <if applicable>
Request Body: <if applicable>
Response Body: <if applicable>

Backend Logs:
- <copy relevant log lines>

Frontend Console:
- <copy relevant console errors>

Failing Layer: [Frontend / Backend Controller / Backend Service / Database / EventBus / Network]

Root Cause Analysis:
- <explain what went wrong>

Smallest Possible Fix:
- <describe minimal code change needed>
- Files to modify: <list>
- Risk: <Low/Medium/High>
```

---

## Completion Criteria

Sprint-003C/D is VERIFIED only when:

- [ ] All Section 1-4 tests pass (GitHub OAuth, Sync, Repository, Skills)
- [ ] All Section 5-6 tests pass (Evidence, Growth)
- [ ] All Section 7-8 tests pass (Person Resolution, Analytics)
- [ ] All Section 9-10 tests pass (Disconnect/Reconnect, Regression)
- [ ] All Section 11-12 tests pass (JWT, Database)
- [ ] Zero FAIL items remain open
- [ ] All fixes proposed and implemented

Do not proceed to Sprint-004 until this checklist is fully green.
