# RESUME-TEMPLATE-DISAPPEARANCE INVESTIGATION

**Date:** 2026-07-23  
**Symptom:** ResumeTemplate document uploaded via faculty UI (`templateName="test"`) disappeared from `resumetemplates` collection.  
**Current DB state:** Only seeded `"Validation Template"` document remains.  
**Scope:** Read-only investigation. No code modified.

---

## 1. Complete Inventory: Every Place That Writes to or Deletes from `resumetemplates`

### 1.1 Write / Update Operations

| File | Line | Operation | Trigger | Scope |
|------|------|-----------|---------|-------|
| `backend/src/controllers/resumeController.ts` | 126-136 | `new ResumeTemplate({...}).save()` | Faculty UI upload (`POST /api/resume/templates`) | Creates one new document |
| `backend/src/controllers/resumeController.ts` | 427 | `ResumeTemplate.findByIdAndUpdate(templateId, { $set: updatePayload }, { new: true })` | Faculty UI processing (`POST /templates/:id/process`) | Updates existing document |
| `backend/src/models/__tests__/ResumeTemplateSchema.test.ts` | 62-72, 99-118 | `new ResumeTemplate({...}).save()` | Jest test execution | Creates temporary test documents |
| `backend/src/models/__tests__/ResumeTemplateSchema.test.ts` | 100-118 | Creates document with `templateName: 'Validation Template'` | Jest test execution | Creates persistent test document |

**No other source files create or update `ResumeTemplate` documents.**

- `backend/scripts/seed.ts` does NOT create `ResumeTemplate` documents.
- `backend/scripts/seedSections.ts` creates `Section` documents only.
- `backend/scripts/deleteDemoTemplates.js` only deletes templates with a specific `fileUrl`.

### 1.2 Delete Operations

| File | Line | Operation | Filter | Trigger | Scope |
|------|------|-----------|--------|---------|-------|
| `backend/src/models/__tests__/ResumeTemplateSchema.test.ts` | 17 | `ResumeTemplate.deleteMany({})` | **Empty filter — deletes ALL documents** | `beforeEach` hook — runs before EVERY test in this file | Mass deletion of entire collection |
| `backend/scripts/deleteDemoTemplates.js` | 8 | `db.collection('resumetemplates').deleteMany({ fileUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx' })` | Specific `fileUrl` | Manual script execution | Deletes only demo templates |
| `backend/src/controllers/__tests__/resumeBuilderWorkflow.test.ts` | 135 | `MockedResumeTemplate.deleteMany` (mocked) | N/A — mocked | Jest test execution | No real deletion |
| `backend/src/models/__tests__/ResumeTemplateSchema.test.ts` | 13 | `await mongoose.disconnect()` | N/A | `afterAll` hook | Connection teardown only |

**No other source files delete `ResumeTemplate` documents.**

### 1.3 Seed / Bootstrap Operations

| File | Line | Operation | Target Collection | ResumeTemplates? |
|------|------|-----------|-------------------|------------------|
| `backend/scripts/seed.ts` | 30-36 | Commented-out `deleteMany` calls | Multiple | No — all commented out |
| `backend/src/index.ts` | 191-253 | Server startup | None | No — only connects DB, starts event listeners |

**No seed script creates `ResumeTemplate` documents.**

---

## 2. Runtime Evidence from MongoDB

### 2.1 Current Collection State

Query executed at `2026-07-23 22:07:42 IST`:

```javascript
db.resumetemplates.find({})
```

**Result:** Exactly **1** document:

```json
{
  "_id": "6a623e2f1e856c580f6d1355",
  "templateName": "Validation Template",
  "type": "global",
  "target": "",
  "organizationId": "6a623e2f1e856c580f6d1353",
  "fileUrl": "https://example.com/template2.docx",
  "createdAt": "2026-07-23T16:15:43.700Z",
  "updatedAt": "2026-07-23T16:15:43.700Z"
}
```

**No `templateName: "test"` document exists.**

### 2.2 Template Lifecycle Timestamps

| Template | Created | Source |
|----------|---------|--------|
| `"Validation Template"` | `2026-07-23 16:15:43 UTC` | `ResumeTemplateSchema.test.ts` |
| `"test"` (user-uploaded) | Unknown — **document no longer exists** | Faculty UI upload |

The `"Validation Template"` creation timestamp (`16:15:43 UTC` / `21:45:43 IST`) falls within today's development session. This is direct evidence that the test file was executed today.

---

## 3. Full Call Graph: What Removed the `"test"` Template

### 3.1 Trigger Path

```
npm test (or npx jest)
  └── Jest runner discovers test files via jest.config.cjs testMatch pattern:
        **/__tests__/**/*.test.ts
  └── Loads backend/src/models/__tests__/ResumeTemplateSchema.test.ts
       ├── beforeEach Hook (line 16-18)
       │    └── ResumeTemplate.deleteMany({})    <-- DELETES ALL TEMPLATES
       │         └── MongoDB: db.resumetemplates.deleteMany({})
       │              └── Removes the user-uploaded "test" template
       │
       ├── Test 1 (line 20-35)
       │    └── new ResumeTemplate({ templateName: 'Test Template', ... }).save()
       │         └── Creates "Test Template" document
       │
       ├── beforeEach Hook (line 16-18) — runs BEFORE Test 2
       │    └── ResumeTemplate.deleteMany({})    <-- DELETES "Test Template" TOO
       │
       ├── Test 2 (line 37-81)
       │    └── new ResumeTemplate({ templateName: 'Validation Template', ... }).save()
       │         └── Creates "Validation Template" document
       │
       └── afterAll Hook (line 12-14)
            └── mongoose.disconnect()
```

### 3.2 Why the `"test"` Template Is Gone

1. **Faculty UI upload** creates the `"test"` template via `uploadTemplateController` → `new ResumeTemplate(...).save()`. Document exists in MongoDB.

2. **Test execution begins.** Jest loads `ResumeTemplateSchema.test.ts`.

3. **`beforeEach` at line 17 executes:**
   ```typescript
   await ResumeTemplate.deleteMany({});
   ```
   This issues `db.resumetemplates.deleteMany({})`, which removes **every** document in the collection, including the user-uploaded `"test"` template.

4. **Test 2's `beforeEach` runs again** before the second test, deleting the `"Test Template"` created by Test 1.

5. **Test 2 creates `"Validation Template"`** via `new ResumeTemplate({ templateName: 'Validation Template', ... }).save()`.

6. **Tests complete.** There is **no `afterEach` cleanup** in this file. The `"Validation Template"` document remains in the database.

7. **Final state:** Only `"Validation Template"` exists. The user-uploaded `"test"` template is permanently removed.

---

## 4. Why Other Candidates Are Eliminated

| Candidate | Evidence | Verdict |
|-----------|----------|---------|
| `deleteDemoTemplates.js` | Deletes only `fileUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx'`. The uploaded `"test"` template has a Cloudinary URL, not this demo URL. | **Eliminated** |
| `seed.ts` | All `deleteMany` calls are commented out (lines 30-36). Does not touch `ResumeTemplate` at all. | **Eliminated** |
| `tests/growth.test.ts` | Uses `mongoose.connection.dropDatabase()` which would drop the **entire** database, not just one collection. The database still contains users, roles, and other collections, so this did NOT run. Also does not match Jest `testMatch` pattern. | **Eliminated** |
| `processTemplateController` | Uses `findByIdAndUpdate`, never deletes documents. | **Eliminated** |
| `getAvailableTemplatesController` | Read-only — `find()` with filters. | **Eliminated** |
| `uploadTemplateController` | Creates new documents via `new ResumeTemplate(...).save()`. Does not delete or replace existing documents. | **Eliminated** |
| `src/index.ts` startup | Only connects DB and starts subsystems. No data initialization or clearing. | **Eliminated** |
| CI workflow (`.github/workflows/rbac-integration.yml`) | Uses separate database: `MONGODB_URI: mongodb://localhost:27017/academic_universe_test`. Does not affect development database `academic_universe`. | **Eliminated** |

---

## 5. When This Code Executes

### `ResumeTemplateSchema.test.ts:17` — `beforeEach`

**Execution frequency:** Before **every** test case in the file.

**Trigger conditions:**
- Must run `npm test` or `npx jest` (or any command that invokes Jest) from the `backend/` directory.
- Uses `MONGODB_URI` from environment (defaults to `mongodb://localhost:27017/academic_universe` from `.env.development`).
- Connects directly to the **development database** — not an isolated test database.

**Current file has 2 test cases**, meaning `deleteMany({})` executes **twice** per test run.

### `ResumeTemplateSchema.test.ts:100-118` — Test 2 creates `"Validation Template"`

**Execution frequency:** Once per test run (during Test 2).

**Result:** Leaves a permanent `"Validation Template"` document in the development database because there is no `afterEach` cleanup.

---

## 6. Root Cause Summary

| Question | Answer |
|----------|--------|
| Which code removed the `"test"` template? | `backend/src/models/__tests__/ResumeTemplateSchema.test.ts` line 17: `await ResumeTemplate.deleteMany({});` |
| When does it execute? | In the `beforeEach` hook, before every test case in the file |
| Who/what triggered it? | Running `npm test` / `npx jest` locally against the development database |
| Is the deletion document-specific? | **No** — empty filter `{}` deletes ALL documents unconditionally |
| Is there cleanup? | **No** — `afterAll` only disconnects mongoose; documents created during tests remain |
| Why does `"Validation Template"` remain? | Test 2 creates it after the second `deleteMany({})`, and no cleanup runs afterward |
| Why doesn't CI affect this? | CI uses `academic_universe_test` database; local `npm test` uses `academic_universe` |

---

## 7. Evidence Checklist

| Evidence Item | Source | Value |
|---------------|--------|-------|
| Current template count | MongoDB query | 1 |
| Existing template name | MongoDB query | `"Validation Template"` |
| Existing template `createdAt` | MongoDB query | `2026-07-23T16:15:43.700Z` |
| User-uploaded template | MongoDB query | **0 documents with `templateName: "test"`** |
| Code that mass-deletes templates | Source code | `ResumeTemplateSchema.test.ts:17` |
| Code that creates `"Validation Template"` | Source code | `ResumeTemplateSchema.test.ts:100-118` |
| Test database in CI | `.github/workflows/rbac-integration.yml` | `academic_universe_test` |
| Development database | `.env.development` | `academic_universe` |
| Jest testMatch pattern | `jest.config.cjs` | `**/__tests__/**/*.test.ts` — matches `ResumeTemplateSchema.test.ts` |
| No `afterEach` cleanup | `ResumeTemplateSchema.test.ts` | Confirmed missing |

---

## 8. Conclusion

The `"test"` template was deleted by `backend/src/models/__tests__/ResumeTemplateSchema.test.ts:17`, which calls `ResumeTemplate.deleteMany({})` in a `beforeEach` hook. This hook executes unconditionally before every test case in that file. When `npm test` was run locally, the hook deleted all documents in the `resumetemplates` collection, including the user-uploaded `"test"` template. The second test case then created the `"Validation Template"`, which remains because there is no cleanup in `afterEach` or `afterAll`.

**No schema migration, seed script, production controller, or server startup code is responsible.** The deletion is entirely attributable to the test file’s `beforeEach` hook running against the development database.
