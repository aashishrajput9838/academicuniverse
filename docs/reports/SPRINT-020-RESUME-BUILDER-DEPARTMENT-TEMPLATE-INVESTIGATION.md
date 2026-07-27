# Sprint-020: Resume Builder Department Template Investigation Report

## Issue
Faculty Resume Templates page shows 4 uploaded templates, but Student Resume Builder only shows 3. The department-specific template ("QA Department Template", Type: Department, Target: CSE) is missing for CSE students.

Expected: Student should see all global templates + all templates targeted to their department.

## Investigation Scope
- Examined: `backend/src/controllers/resumeController.ts`
- Examined: `backend/src/models/EzoneAcademicProfile.ts`
- Examined: `backend/src/models/ResumeTemplate.ts`
- Examined: `backend/src/modules/ezone/scrapers/ezone.scraper.ts`
- Examined: `components/Resume/api/resumeApi.ts`
- Examined: `app/dashboard/student/resume-builder/components/TemplateSelection/TemplateSelection.tsx`
- Examined: `app/dashboard/student/resume-builder/components/TemplateSelection/TemplateFilters.tsx`

No code was modified.

---

## 1. Complete Flow Trace

```
Faculty Upload
    │
    ▼
ResumeTemplate (Mongo)
    - templateName: "QA Department Template"
    - type: "department"
    - target: "CSE"
    │
    ▼
GET /api/resume/templates
    │
    ▼
getAvailableTemplatesController
    │
    ▼
EzoneAcademicProfile.findOne({ userId, organizationId })
    │
    ▼
profile.department  ← THIS IS THE PROBLEM
    │
    ▼
Mongo query: { $or: [{ type: 'global' }, { target: { $in: [/^CSE$/i] } }] }
    │
    ▼
Frontend receives filtered templates
    │
    ▼
TemplateSelection renders cards
```

---

## 2. Actual API Response Analysis

### 2.1 Backend Query Construction (resumeController.ts:133-216)

```javascript
// For students (non-admin/faculty):
const targets: string[] = [];

// Load EzoneAcademicProfile
const profile = await EzoneAcademicProfile.findOne({
    userId: req.user.userId,
    organizationId,
});

if (profile?.department) {
    targets.push(profile.department.trim());
} else {
    logger.warn(`No department found in EzoneAcademicProfile for user ${req.user.userId}; falling back to global templates only`);
}

const targetPatterns = targets.map(t => {
    const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${escaped}$`, 'i');
});

query = {
    organizationId,
    $or: [
        { type: 'global' },
        { target: { $in: targetPatterns } }
    ]
};
```

### 2.2 What the API Returns

**If `profile.department` is empty/undefined:** API returns ONLY global templates (3 templates).

**If `profile.department` were populated:** API would return global templates + department templates whose `target` exactly matches the department value.

### 2.3 Frontend Verification

The student UI (`TemplateSelection.tsx` + `TemplateFilters.tsx`) does NOT perform any additional filtering. It renders exactly what the API returns. The type filter only filters by template type, it doesn't hide department templates.

**Conclusion:** The disappearance happens in the **backend filtering**, not the frontend.

---

## 3. Student's Department Information

### 3.1 EzoneAcademicProfile Schema
```typescript
export interface IEzoneAcademicProfile extends Document {
    organizationId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    studentName: string;
    systemId: string;
    program: string;
    school: string;        // ← populated
    status: string;
    department?: string;   // ← NEVER POPULATED BY SCRAPER
    email?: string;
    semester?: string;
    // ...
}
```

### 3.2 What the Scraper Actually Extracts (ezone.scraper.ts:174-181)

```typescript
const profile = {
    studentName: findLabelValue('Name'),
    systemId: findLabelValue('System ID'),
    program: findModalLabelValue('Program [G]') || findLabelValue('Program') || findLabelValue('Course'),
    school: findLabelValue('School') || findLabelValue('Department'),  // ← Department goes here!
    semester: findLabelValue('Semester') || findLabelValue('Term'),
    status: findLabelValue('Programme Status') || findLabelValue('Status') || 'Active'
};
```

**Key observation:** `department` is **never extracted**. The `findLabelValue('Department')` result is assigned to `school`, not `department`. The scraper has no `department` property in the `profile` object at all.

### 3.3 What `school` Contains

From the RB-016 diagnostic capture (`dashboard.html`), the profile modal contains:
```html
<li><strong>Department </strong> Computer Science and Engineering</li>
<li><strong>School </strong> SUSET</li>
```

Since `school: findLabelValue('School') || findLabelValue('Department')`, and `School` is "SUSET", `school` gets "SUSET". The `Department` value "Computer Science and Engineering" is NOT extracted into any field.

### 3.4 SanitizedData Mapping (ezone.scraper.ts:469-475)

```typescript
const sanitizedData = {
    studentName: this.sanitize(rawData.profile.studentName),
    systemId: this.sanitize(rawData.profile.systemId),
    program: this.sanitize(rawData.profile.program),
    school: this.sanitize(rawData.profile.school),
    semester: this.sanitize(rawData.profile.semester),
    status: this.sanitize(rawData.profile.status),
    // ... NO department field
```

**Confirmed:** `department` is never written to MongoDB.

---

## 4. Root Cause Analysis

### Primary Root Cause: ScraperNeverPopulates `department` Field

The Ezone scraper does not extract the `department` value from the portal. Instead, it routes the Department text into `school`. The `EzoneAcademicProfile.department` field remains `undefined`.

When `getAvailableTemplatesController` checks `profile.department`, it finds `undefined`, triggers the warning:
```
No department found in EzoneAcademicProfile for user X; falling back to global templates only
```

And the query becomes:
```javascript
query = { organizationId }  // No $or filter!
```

This returns only global templates, excluding the department template.

### Secondary Root Cause: Exact-Match Regex on Full Department Name (Potential Future Issue)

Even if `department` were populated, the current matching logic uses exact-match regex:
```javascript
new RegExp(`^${escaped}$`, 'i')
```

The Ezone portal provides full department names like `"Computer Science and Engineering"`, but faculty upload templates with department codes like `"CSE"`. The regex `^CSE$` would NOT match `"Computer Science and Engineering"`.

However, this is a **secondary** issue. The **primary** blocker is that `department` is never extracted.

---

## 5. Where the Template Disappears

**Location:** `backend/src/modules/ezone/scrapers/ezone.scraper.ts:174-181`

**Exact line:**
```typescript
const profile = {
    studentName: findLabelValue('Name'),
    systemId: findLabelValue('System ID'),
    program: findModalLabelValue('Program [G]]') || findLabelValue('Program') || findLabelValue('Course'),
    school: findLabelValue('School') || findLabelValue('Department'),  // Line 178
    semester: findLabelValue('Semester') || findLabelValue('Term'),
    status: findLabelValue('Programme Status') || findLabelValue('Status') || 'Active'
    // MISSING: department: findLabelValue('Department')
};
```

The `department` field is absent from the `profile` object, so it never reaches `sanitizedData`, never reaches `EzoneAcademicProfile`, and never influences the template query.

---

## 6. Recommended Fix Strategy

### Fix 1: Extract `department` in the Scraper (Required)

In `ezone.scraper.ts`, add `department` to the `profile` object:

```typescript
const profile = {
    studentName: findLabelValue('Name'),
    systemId: findLabelValue('System ID'),
    program: findModalLabelValue('Program [G]') || findLabelValue('Program') || findLabelValue('Course'),
    school: findLabelValue('School') || '',
    department: findLabelValue('Department'),  // NEW
    semester: findLabelValue('Semester') || findLabelValue('Term'),
    status: findLabelValue('Programme Status') || findLabelValue('Status') || 'Active'
};
```

Then in `sanitizedData`, map it:
```typescript
department: this.sanitize(rawData.profile.department),
```

### Fix 2: Improve Department Matching (Recommended)

Because Ezone provides full department names but templates use codes, the matching logic should be more flexible. Options:

**Option A — Partial match:**
```javascript
const targetPatterns = targets.map(t => {
    const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escaped, 'i');  // Removed ^ and $ anchors
});
```

**Option B — Alias mapping:**
Create a mapping from full department names to codes in the controller:
```javascript
const departmentAliases: Record<string, string[]> = {
    'Computer Science and Engineering': ['CSE', 'CS', 'Computer Science'],
    'Information Technology': ['IT', 'Information Tech'],
    // ...
};
```

**Option C — Store department code separately:**
Add a `departmentCode` field to `EzoneAcademicProfile` and populate it from the portal.

### Fix 3: Add Diagnostic Logging

Add logs in `getAvailableTemplatesController` to show:
- Resolved `userId`, `organizationId`, `roleName`
- `EzoneAcademicProfile.department` value
- Constructed `targets` array
- Final Mongo query

This will make future debugging immediate.

---

## 7. Files Involved

| File | Role |
|------|------|
| `backend/src/controllers/resumeController.ts` | Backend filtering logic for student template query |
| `backend/src/modules/ezone/scrapers/ezone.scraper.ts` | **ROOT CAUSE** — missing `department` extraction |
| `backend/src/models/EzoneAcademicProfile.ts` | Schema has `department` field but scraper never populates it |
| `backend/src/models/ResumeTemplate.ts` | Template schema (type, target) |
| `components/Resume/api/resumeApi.ts` | Frontend API call |
| `app/dashboard/student/resume-builder/components/TemplateSelection/TemplateSelection.tsx` | Renders templates as received from API |
| `app/dashboard/student/resume-builder/components/TemplateSelection/TemplateFilters.tsx` | Client-side type/search filter (not the issue) |

---

## 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Department name varies across portal versions | Low | Add fallback extraction strategies |
| Multiple students share same department name | None | Organization-scoped query already filters correctly |
| Regex partial match causes false positives | Low | Only affects department templates; still requires `type: 'department'` |
| Existing profiles missing department | Medium | Backfill missing `department` values from existing `school` field where applicable |

---

## 9. Implementation Plan (Pending Approval)

1. Modify `ezone.scraper.ts` to extract `department` separately from `school`
2. Modify `sanitizedData` mapping to persist `department`
3. Improve template matching to handle full names vs codes
4. Add diagnostic logs in `getAvailableTemplatesController`
5. Verify by checking EzoneAcademicProfile has `department` populated
6. Verify by calling `/api/resume/templates` as a CSE student and confirming department template appears
