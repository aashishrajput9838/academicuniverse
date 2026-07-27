# Draft API Contract Report

**Date:** 2026-07-22  
**Flow:** `ResumeForm.loadDraft()` → `fetchDraft()` → `GET /api/resume/draft`

---

## 1. Endpoint Called

`fetchDraft(backendToken, templateId)` in `components/Resume/api/resumeApi.ts:53` calls:

```
GET /api/resume/draft?templateId=<templateId>
```

Backed by `getSavedResumeController` in `backend/src/controllers/resumeController.ts:291`.

---

## 2. Actual HTTP Response Body

When **no draft exists** for the user/template:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Draft retrieved successfully",
  "data": null
}
```

Source: `sendResponse(res, 200, studentResume ? studentResume.filledData : null, ...)` at `resumeController.ts:307`.

---

## 3. Frontend Expectation vs Backend Contract

### Frontend (`resumeApi.ts:24-27`)

```typescript
const payload = await response.json();
if (!payload?.success || !payload?.data) {
    throw new Error('Invalid API response');
}
```

### Backend (`response.ts:20-25`)

```typescript
return res.status(statusCode).json({
    success: true,
    statusCode,
    message,
    data,   // <-- can be null
});
```

---

## 4. Why `if (!payload.success || !payload.data)` Fails

When no draft exists, the backend returns:

- `payload.success` = `true`  → `!payload.success` = `false` ✓
- `payload.data` = `null`     → `!payload.data` = `true`  ✗

The second condition `!payload.data` treats `null` as an invalid response. However, `null` is the **explicit, intended value** for "no draft saved yet" — the controller intentionally returns `null` when `StudentResume.findOne()` returns no document.

The frontend guard clause assumes `data` is always a truthy object/array. It does not account for endpoints where `null` is a valid, successful payload.

---

## 5. Contract Mismatch Summary

| Aspect | Backend | Frontend |
|---|---|---|
| Success indicator | `success: true` | Checked ✓ |
| Data presence | `data: null` (valid) | `!payload.data` rejects `null` |
| HTTP status | `200 OK` | `response.ok` passes ✓ |
| Endpoint semantics | "No draft yet" = valid empty state | Treats empty state as invalid response |

---

## 6. Root Cause

The `request<T>()` helper in `resumeApi.ts` is shared across all endpoints. Its guard clause `!payload?.data` is appropriate for endpoints that always return collections or objects (e.g., `fetchTemplates`, `generateResume`), but it is **incorrect for `fetchDraft`**, which legitimately returns `null` when the user has not yet saved a draft.

The backend contract is correct. The frontend's generic response validator does not accommodate `null` data.
