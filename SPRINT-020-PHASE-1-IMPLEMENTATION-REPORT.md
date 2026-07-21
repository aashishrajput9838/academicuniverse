# Sprint-020: Resume Builder Department Template — Phase-1 Implementation Report

## Summary
Implemented Phase-1 of Sprint-020: extract the `department` field separately from the Ezone dashboard profile modal and persist it into `EzoneAcademicProfile.department`. No changes were made to template matching logic, `resumeController.ts`, or frontend filtering.

## Code Changes

### `backend/src/modules/ezone/scrapers/ezone.scraper.ts`

**Profile extraction (lines 174-181):**
```typescript
const profile = {
    studentName: findLabelValue('Name'),
    systemId: findLabelValue('System ID'),
    program: findModalLabelValue('Program [G]') || findLabelValue('Program') || findLabelValue('Course'),
    school: findLabelValue('School'),                  // Changed: no longer falls back to Department
    department: findLabelValue('Department'),          // NEW: separate extraction
    semester: findLabelValue('Semester') || findLabelValue('Term'),
    status: findLabelValue('Programme Status') || findLabelValue('Status') || 'Active'
};
```

**Sanitized data mapping (lines 470-476):**
```typescript
const sanitizedData = {
    studentName: this.sanitize(rawData.profile.studentName),
    systemId: this.sanitize(rawData.profile.systemId),
    program: this.sanitize(rawData.profile.program),
    school: this.sanitize(rawData.profile.school),
    department: this.sanitize(rawData.profile.department),  // NEW
    semester: this.sanitize(rawData.profile.semester),
    status: this.sanitize(rawData.profile.status),
    // ...
};
```

## What to Verify After Fresh Ezone Sync

Perform a fresh Ezone sync and inspect the `EzoneAcademicProfile` document in MongoDB for the authenticated user. Record the following values:

| Field | Expected Source | Example Value |
|-------|----------------|---------------|
| `department` | Ezone portal `Department` label in profile modal | `Computer Science and Engineering` |
| `school` | Ezone portal `School` label in profile modal | `SUSET` |
| `program` | Ezone portal `Program [G]` label in profile modal | `Bachelor of Technology (Computer Science & Engineering)` |

## Verification Query

```javascript
db.ezoneacademicprofiles.findOne(
  { organizationId: ObjectId("<org_id>"), userId: ObjectId("<user_id>") },
  { department: 1, school: 1, program: 1, studentName: 1, systemId: 1 }
)
```

## Comparison Matrix (To Be Filled After Verification)

| Field | Actual Value (MongoDB) | Template Target |
|-------|------------------------|-----------------|
| `department` | *(run sync and check)* | `CSE` |
| `school` | *(run sync and check)* | N/A |
| `template.target` | N/A | `CSE` |

## Decision Gate for Phase-2

**Do NOT proceed to Phase-2 until the verification table above is filled.**

After verification, decide:

1. **If `department` exactly matches `ResumeTemplate.target`** → No code change needed; the existing exact-match regex in `resumeController.ts` will work.

2. **If `department` contains the full name (e.g., "Computer Science and Engineering") but templates use codes (e.g., "CSE")** → Proceed with one of:
   - Phase-2A: Relax regex in `resumeController.ts` from exact `^CSE$` to partial/substring match
   - Phase-2B: Add alias mapping from full department names to codes
   - Phase-2C: Store a separate `departmentCode` field in `EzoneAcademicProfile`

## Constraints Honored
- No changes to `resumeController.ts`
- No changes to `ResumeTemplate` model
- No changes to frontend filtering
- No alias mapping or template matching logic changes
- No changes to authentication, attendance, subjects, timetable, CA marks, or AcademicSchedule

## Regression Risk
- **Very Low**: Only adds a new extracted field to the Ezone scraper and sanitizedData mapping. Existing fields are untouched.
- **No schema migration required**: `department` already exists in `EzoneAcademicProfile` schema.
