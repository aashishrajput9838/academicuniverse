# TEMPLATE-VISIBILITY INVESTIGATION

**Date:** 2026-07-23  
**Symptom:** Student Resume Builder shows "No templates available". Previously the processed template was visible.  
**Scope:** Read-only investigation. No code modified.  
**Status:** Autosave fix is **not connected** to template visibility. Issue is in the template query/filter path or data state.

---

## 1. Frontend Endpoint That Loads Templates

**File:** `app/dashboard/student/resume-builder/components/ResumeBuilderPage/hooks/useTemplateSelection.ts`

Line 20:
```typescript
const data = await fetchTemplates(backendToken);
```

**File:** `components/Resume/api/resumeApi.ts`

Lines 33-36:
```typescript
export async function fetchTemplates(backendToken: string, target?: string): Promise<ResumeTemplateDTO[]> {
  const url = target ? `/api/resume/templates?target=${encodeURIComponent(target)}` : '/api/resume/templates';
  return request<ResumeTemplateDTO[]>(url, { method: 'GET' }, backendToken);
}
```

**Endpoint:** `GET /api/resume/templates` (no query parameters when called from `useTemplateSelection`)

---

## 2. Backend Route/Controller

**Route file:** `backend/src/routes/resumeRoutes.ts`

Line 31:
```typescript
router.get('/templates', getAvailableTemplatesController);
```

**Controller:** `backend/src/controllers/resumeController.ts:148-233`

```typescript
export const getAvailableTemplatesController = async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    const organizationId = req.user.organizationId;
    
    const { default: Role } = await import('../models/Role');
    const role = await Role.findById(req.user.roleId);
    const roleName = role?.name || '';
    
    // Admin/Faculty can see all templates for the org
    const isAdminOrFaculty = ['FACULTY', 'ADMIN', 'SUPER_ADMIN'].includes(roleName) || req.user.isSuperAdmin;
    
    let query: any = { organizationId };

    if (!isAdminOrFaculty) {
      const targets: string[] = [];
      if (req.query.target && typeof req.query.target === 'string') {
        targets.push(req.query.target.trim());
      }

      if (targets.length === 0) {
        try {
          const { EzoneAcademicProfile } = await import('../models/EzoneAcademicProfile');
          const profile = await EzoneAcademicProfile.findOne({
            userId: req.user.userId,
            organizationId,
          });

          logger.info("Resolved profile:", profile);
          logger.info("Resolved department:", profile?.department);

          if (profile?.department) {
            const dept = profile.department.trim();
            const aliases = DEPARTMENT_ALIASES[dept] || [];
            targets.push(dept, ...aliases);
          } else {
            logger.warn(`No department found in EzoneAcademicProfile for user ${req.user.userId}; falling back to global templates only`);
          }
        } catch (profileError) {
          logger.warn(`Failed to load EzoneAcademicProfile for user ${req.user.userId}:`, profileError);
        }

        logger.info("Targets: " + JSON.stringify(targets));
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
    }

    logger.info("Final Mongo query:", JSON.stringify(query, null, 2));

    const departmentTemplatesInDb = await ResumeTemplate.find({
      organizationId,
      type: "department"
    }).select("templateName target");
    logger.info("Department templates in DB:", departmentTemplatesInDb);

    const templates = await ResumeTemplate.find(query).sort({ createdAt: -1 }).populate('uploadedBy', 'name email');
    return sendResponse(res, 200, templates, 'Templates retrieved successfully');
  } catch (error: any) {
    logger.error('Error fetching templates:', error);
    return sendError(res, 500, 'Failed to fetch templates');
  }
};
```

---

## 3. Exact MongoDB Query Executed

### For Admin/Faculty/SuperAdmin:
```javascript
ResumeTemplate.find({ organizationId: <user's org> })
  .sort({ createdAt: -1 })
  .populate('uploadedBy', 'name email')
```

### For Students:
```javascript
ResumeTemplate.find({
  organizationId: <user's org>,
  $or: [
    { type: 'global' },
    { target: { $in: [<RegExp patterns from department + aliases>] } }
  ]
})
.sort({ createdAt: -1 })
.populate('uploadedBy', 'name email')
```

---

## 4. Filters Applied

| Filter | Source | Condition |
|--------|--------|-----------|
| `organizationId` | `req.user.organizationId` (JWT) | ALWAYS applied |
| `type: 'global'` | Hardcoded | Applied for students (non-admin/faculty) |
| `target` pattern match | `EzoneAcademicProfile.findOne({ userId, organizationId }).department` + `DEPARTMENT_ALIASES` | Applied for students |
| Admin/Faculty bypass | `Role.findById(req.user.roleId).name` | If role is FACULTY/ADMIN/SUPER_ADMIN or `isSuperAdmin`, all org templates are visible |

**Key implication:** If the student's `EzoneAcademicProfile` has no `department`, `targetPatterns` becomes `[]`. The query becomes:
```javascript
{
  organizationId: ...,
  $or: [
    { type: 'global' },
    { target: { $in: [] } }  // matches NOTHING
  ]
}
```

This returns **only** `type: 'global'` templates for the organization.

---

## 5. Why the Previously Processed Template Is No Longer Returned

### The autosave fix is NOT the cause.

The autosave fix (`AUTOSAVE-ARCHITECTURE-FIX`) only changed:
1. Backend: Added `POST /api/resume/draft` route and `saveDraftController`
2. Frontend: `useAutoSave.ts` now calls `saveDraftApi()` instead of `generateResume()`

None of these changes touch:
- `GET /api/resume/templates`
- `getAvailableTemplatesController`
- `ResumeTemplate` model
- `EzoneAcademicProfile` query
- JWT/auth middleware

**The template visibility path is completely independent of the autosave path.**

### Possible actual causes for zero results:

| Cause | How to verify | Likelihood |
|-------|---------------|------------|
| **A. Template `type` is not `'global'`** | Check `ResumeTemplate.type` in MongoDB. If it's `'department'` or `'section'`, it requires a matching `target` pattern. | High |
| **B. Student's `EzoneAcademicProfile.department` is missing/empty** | Check `EzoneAcademicProfile` document for the student. If `department` is null/undefined/empty, `targetPatterns` is `[]` and only global templates are visible. | High |
| **C. Template `target` does not match department aliases** | Check `ResumeTemplate.target` vs `DEPARTMENT_ALIASES` in `resumeController.ts:12-22`. The target must exactly match a department name or alias (case-insensitive). | Medium |
| **D. `organizationId` mismatch** | Compare `ResumeTemplate.organizationId` with `req.user.organizationId` in JWT. If they differ, the template is invisible. | Medium |
| **E. Template was deleted or `fileUrl` is invalid** | Check if the `ResumeTemplate` document still exists in MongoDB. | Low |
| **F. Role changed from admin/faculty to student** | Check `User.roleId` and `Role.name`. If role changed, the student filter logic now applies. | Low |

---

## 6. Verify Whether the Template Still Exists in MongoDB

The investigation cannot confirm this without database access. However, the query at line 227:
```typescript
const templates = await ResumeTemplate.find(query).sort({ createdAt: -1 }).populate('uploadedBy', 'name email');
```

...returns successfully (because `sendResponse` is called), but with an empty array. This means:
- The query executed without errors
- Zero documents matched the filters
- The template document either doesn't exist, or its fields don't match the filters

---

## 7. Exact Query and Why It Returns Zero Templates

### Exact query for a student with no department:
```javascript
{
  organizationId: ObjectId("..."),
  $or: [
    { type: 'global' },
    { target: { $in: [] } }
  ]
}
```

**Why it returns zero templates:**
- If no `ResumeTemplate` documents exist with `organizationId: <user's org>` AND `type: 'global'`, the result is empty.
- The `$in: []` clause on `target` matches nothing, so department/section templates are excluded.

### Exact query for a student with department "CSE":
```javascript
{
  organizationId: ObjectId("..."),
  $or: [
    { type: 'global' },
    { target: { $in: [/^CSE$/i, /^CS$/i, /^Computer Science$/i, /^Computer Science and Engineering$/i] } }
  ]
}
```

**Why it might return zero templates:**
- If the template's `target` is `"CSE"` but the student's `EzoneAcademicProfile.department` is `"Computer Science and Engineering"`, the aliases include `/^CSE$/i`, so it WOULD match.
- If the template's `target` is `"IT"` but the student's department is `"CSE"`, it would NOT match.
- If the template's `type` is `'department'` and `target` is `"CSE"`, but the student has no `EzoneAcademicProfile`, only global templates are visible.

---

## 8. Evidence to Collect

To pinpoint the exact cause, collect the following from the running backend:

1. **Server logs** — `getAvailableTemplatesController` logs at lines 160-167 and 219-225:
   ```
   Resume Template Debug
   { userId, organizationId, roleName }
   Final Mongo query: <json>
   Department templates in DB: <array>
   ```

2. **Direct MongoDB query** — Run in MongoDB shell/Compass:
   ```javascript
   db.resumetemplates.find({ organizationId: <student's org> }).pretty()
   ```
   Check each document's `type` and `target` fields.

3. **EzoneAcademicProfile check** — Run:
   ```javascript
   db.ezoneacademicprofiles.findOne({ userId: <student's userId>, organizationId: <student's org> })
   ```
   Check if `department` exists and what its value is.

4. **User role check** — Verify the student's JWT contains the expected `roleId` and `organizationId`.

5. **Network tab** — Confirm the frontend is calling `GET /api/resume/templates` without a `target` query parameter, and the response is `{ success: true, data: [] }`.

---

## 9. Summary

| Question | Answer |
|----------|--------|
| Frontend endpoint | `GET /api/resume/templates` via `fetchTemplates()` |
| Backend controller | `getAvailableTemplatesController` (`resumeController.ts:148`) |
| Query | `ResumeTemplate.find({ organizationId, $or: [{ type: 'global' }, { target: { $in: targetPatterns } }] })` for students |
| Why templates empty | One of: no global templates for org, no department/target match, missing EzoneAcademicProfile, or org mismatch |
| Autosave fix responsible? | **No.** Autosave and template loading are independent code paths. |
| Next step | Check MongoDB for `ResumeTemplate` documents and `EzoneAcademicProfile` for the student. The server logs at `resumeController.ts:160-225` will show the exact query and why it matched zero documents. |

---

*End of report.*
