# Sprint-020: Resume Builder Department Template — Phase-2 Implementation Report

## Summary
Implemented department alias mapping in `resumeController.ts` to bridge the gap between full department names stored in `EzoneAcademicProfile` and abbreviated target codes used in `ResumeTemplate`. No frontend, schema, or global-template behavior changes were made.

## Code Changes

### `backend/src/controllers/resumeController.ts`

**Added `DEPARTMENT_ALIASES` mapping:**
```typescript
const DEPARTMENT_ALIASES: Record<string, string[]> = {
  'Computer Science and Engineering': ['CSE', 'CS', 'Computer Science'],
  'Information Technology': ['IT', 'Information Tech'],
  'Electronics and Communication Engineering': ['ECE', 'Electronics'],
  'Mechanical Engineering': ['ME', 'Mechanical'],
  'Civil Engineering': ['CE', 'Civil'],
  'Electrical and Electronics Engineering': ['EEE', 'Electrical'],
  'VLSI Design and Technology': ['VLSI'],
  'Artificial Intelligence and Machine Learning': ['AIML', 'AI ML'],
  'Computer Science': ['CSE', 'CS'],
};
```

**Updated target resolution logic:**
```typescript
if (profile?.department) {
  const dept = profile.department.trim();
  const aliases = DEPARTMENT_ALIASES[dept] || [];
  targets.push(dept, ...aliases);
}
```

**Before:**
```typescript
if (profile?.department) {
  targets.push(profile.department.trim());
}
```

## Verification Steps (To Be Performed)

### 1. Restart Backend
```bash
cd backend
npm run dev
```

### 2. Perform Fresh API Verification
As an authenticated CSE student, call:
```
GET /api/resume/templates
Authorization: Bearer <student_token>
```

**Expected response:** Array of 4 template objects:
- QA Department Template (type: "department", target: "CSE")
- QA Test Global Template (type: "global")
- QA Test Global Template (type: "global")
- kushagra pdf (type: "global" or "department")

**Diagnostic logs to confirm:**
```
Resume Template Debug {"userId":"...","organizationId":"...","roleName":"STUDENT"}
Resolved profile: { ..., department: "Computer Science and Engineering", ... }
Resolved department: Computer Science and Engineering
Targets: ["Computer Science and Engineering","CSE","CS","Computer Science"]
```

### 3. Live Verification from Student Resume Builder UI
1. Log in as a CSE student
2. Navigate to `/dashboard/student/resume-builder`
3. Confirm template selection shows all 4 templates
4. Confirm the "QA Department Template" card is visible
5. Confirm global templates are still visible

## How It Works

When a student's `EzoneAcademicProfile.department` is `"Computer Science and Engineering"`:

1. `targets` array becomes:
   ```
   ["Computer Science and Engineering", "CSE", "CS", "Computer Science"]
   ```

2. Regex patterns generated:
   ```
   [
     /^Computer Science and Engineering$/i,
     /^CSE$/i,
     /^CS$/i,
     /^Computer Science$/i
   ]
   ```

3. Mongo `$or` query:
   ```json
   {
     "organizationId": "...",
     "$or": [
       { "type": "global" },
       { "target": { "$in": [ /^CSE$/i, /^CS$/i, /^Computer Science$/i ] } }
     ]
   }
   ```

4. `ResumeTemplate` with `target: "CSE"` matches `/^CSE$/i` → included.

## Regression Risk

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Alias mapping incomplete for other departments | Low | Unmapped departments fall back to exact-match on full name |
| Duplicate targets causing redundant regex | Very Low | `$in` deduplicates; harmless |
| Global templates accidentally filtered | None | Global `$or` clause is unchanged |
| Case sensitivity issues | None | Regex uses `i` flag |

## What Was NOT Changed

- Frontend components (`TemplateSelection.tsx`, `TemplateFilters.tsx`)
- `ResumeTemplate` schema
- `AcademicSchedule` integration
- Authentication, attendance, subjects, timetable, CA marks
- Ezone scraper (Phase-1 already extracted `department` field)

## Constraints Honored

- No frontend modifications
- No ResumeTemplate schema modifications
- Global template behavior unchanged
- Only backend department matching logic updated
- No alias mapping in scraper or frontend
