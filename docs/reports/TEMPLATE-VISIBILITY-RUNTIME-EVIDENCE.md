# TEMPLATE-VISIBILITY RUNTIME EVIDENCE REPORT

**Date:** 2026-07-23  
**Scope:** Read-only runtime evidence capture. No code modified.  
**Evidence source:** Live server process + MongoDB query + HTTP response.

---

## 1. Runtime HTTP Response

**Request:**
```
GET http://localhost:5003/api/resume/templates
Authorization: Bearer <valid JWT for student user>
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Templates retrieved successfully",
  "data": []
}
```

**Result:** 0 templates returned.

---

## 2. Resolved User (from server logs)

**Log entry at `2026-07-23 21:58:57:5857`:**
```json
{"userId":"6a58b65d816b680ebffb8b89","organizationId":"6a58b59aa8c379340d290b31","roleName":""}
```

| Field | Value |
|-------|-------|
| `userId` | `6a58b65d816b680ebffb8b89` |
| `organizationId` | `6a58b59aa8c379340d290b31` |
| `roleName` | `""` (empty string — role lookup returned falsy, so `role?.name || ''` evaluated to `''`) |

---

## 3. Student's Department from `EzoneAcademicProfile`

**Log entry at `2026-07-23 21:58:57:5857`:**
```json
{"level":"info","message":"Resolved department:","metadata":{"environment":"development"},"service":"academic-universe-backend","timestamp":"2026-07-23 21:58:57:5857"}
```

The next log line in the same request shows the full resolved profile document. Extracted `department` value:

| Field | Value |
|-------|-------|
| `department` | `"Computer Science and Engineering"` |
| `userId` | `6a58b65d816b680ebffb8b89` |
| `organizationId` | `6a58b59aa8c379340d290b31` |

---

## 4. Final Mongo Query Fragments (from server logs)

**Log entries at `2026-07-23 21:58:57:5857`:**

```json
{"level":"info","message":"Targets: [\"Computer Science and Engineering\",\"CSE\",\"CS\",\"Computer Science\"]",...}
```

```json
{"level":"info","message":"Final Mongo query:",...}
```

The `Final Mongo query:` log line uses `winston` with a stringified JSON passed as the second argument:
```typescript
logger.info("Final Mongo query:", JSON.stringify(query, null, 2));
```

Winston v3 treats the second argument as `meta` metadata. Because the value is a **string** rather than an object, it is not serialized into the `metadata` field of the JSON log output. Therefore the exact query object is not present in the log file.

However, the query can be reconstructed deterministically from the captured inputs:

**Inputs:**
- `organizationId` = `6a58b59aa8c379340d290b31`
- `roleName` = `""` (empty — not in `['FACULTY', 'ADMIN', 'SUPER_ADMIN']`, not `isSuperAdmin`)
- `targets` = `["Computer Science and Engineering","CSE","CS","Computer Science"]`

**Reconstructed query:**
```javascript
{
  organizationId: "6a58b59aa8c379340d290b31",
  $or: [
    { type: "global" },
    { target: { $in: [/^Computer Science and Engineering$/i, /^CSE$/i, /^CS$/i, /^Computer Science$/i] } }
  ]
}
```

---

## 5. Number of Templates Returned

**0** (empty array).

---

## 6. Complete Documents Returned

None. `data: []`.

---

## 7. Exact Query Condition That Excluded the Template

MongoDB contains exactly **one** template document:

| Field | Value |
|-------|-------|
| `_id` | `6a623e2f1e856c580f6d1355` |
| `templateName` | `"Validation Template"` |
| `type` | `"global"` |
| `target` | `""` |
| `organizationId` | `6a623e2f1e856c580f6d1353` |

The executed query filters by:
1. `organizationId: "6a58b59aa8c379340d290b31"` (student's organization)

The template's `organizationId` is `6a623e2f1e856c580f6d1353`, which does **not** match the student's `organizationId`.

**This is the condition that excluded the template.**

Since the `organizationId` filter is applied unconditionally to every request (`resumeController.ts:172`):
```typescript
let query: any = { organizationId };
```

...the template is filtered out at the **top level** before the `$or` on `type`/`target` is even evaluated.

---

## 8. Does the Template Exist in MongoDB?

**Yes.** It exists at `organizationId: 6a623e2f1e856c580f6d1353`.

It does **not** exist in the student's organization (`6a58b59aa8c379340d290b31`).

---

## 9. Summary

| Evidence | Value |
|----------|-------|
| HTTP status | 200 |
| Templates returned | 0 |
| User `organizationId` | `6a58b59aa8c379340d290b31` |
| Template `organizationId` | `6a623e2f1e856c580f6d1353` |
| Template exists in MongoDB? | Yes |
| Template in student's org? | No |
| Excluding filter | `organizationId` mismatch |
| Department resolved? | `"Computer Science and Engineering"` |
| Role resolved? | Empty (`""`) — role lookup returned falsy |

**Root cause:** The single resume template in the database belongs to a different organization than the authenticated student. The `getAvailableTemplatesController` unconditionally filters by `req.user.organizationId`, so no templates are visible to this student.

---

*End of report.*
