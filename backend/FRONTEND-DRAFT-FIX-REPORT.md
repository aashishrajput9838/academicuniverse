# Frontend Draft Fix Report

**Date:** 2026-07-22  
**Files Modified:**
- `components/Resume/api/resumeApi.ts`
- `ResumeForm.tsx` (verified, no change required)

---

## 1. Endpoint Investigated

`fetchDraft(backendToken, templateId)` calls:

```
GET /api/resume/draft?templateId=<templateId>
```

Backend controller: `getSavedResumeController` in `backend/src/controllers/resumeController.ts:291`

---

## 2. Actual Backend Response (no draft exists)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Draft retrieved successfully",
  "data": null
}
```

This is the **intended** backend contract. `null` means "no saved draft."

---

## 3. Root Cause in Frontend

The generic `request<T>()` helper in `components/Resume/api/resumeApi.ts:25` had:

```typescript
if (!payload?.success || !payload?.data) {
    throw new Error('Invalid API response');
}
```

When `fetchDraft()` received a valid response with `data: null`:
- `payload.success` = `true` → `!payload.success` = `false` ✓
- `payload.data` = `null` → `!payload.data` = `true` ✗

Result: threw `"Invalid API response"` even though the request succeeded.

---

## 4. Fix Applied

### `components/Resume/api/resumeApi.ts`

**Added optional `requireData` parameter to `request()`:**

```typescript
async function request<T>(
  endpoint: string,
  options: RequestInit,
  backendToken: string,
  requireData: boolean = true
): Promise<T> {
```

**Updated guard clause:**

```typescript
if (!payload?.success || (requireData && payload?.data == null)) {
    throw new Error('Invalid API response');
}
```

- Default `requireData = true` preserves strict validation for `fetchTemplates` and `generateResume`.
- `fetchDraft()` passes `false`, allowing `null` data.

**Updated `fetchDraft()` call:**

```typescript
export async function fetchDraft(backendToken: string, templateId: string): Promise<Record<string, any> | null> {
  return request<Record<string, any> | null>(
    `/api/resume/draft?templateId=${encodeURIComponent(templateId)}`,
    { method: 'GET' },
    backendToken,
    false
  );
}
```

### `ResumeForm.tsx`

**No change required.** The existing code already handles `null` correctly:

```typescript
const draft = await fetchDraft(backendToken, template._id);
if (draft) {
  setFormData(draft);
}
```

When `draft` is `null`, `formData` remains `{}` (the initial `useState` value), so the form starts empty as intended.

---

## 5. Validation Preserved

| Endpoint | `requireData` | Behavior |
|---|---|---|
| `fetchTemplates()` | `true` (default) | Rejects if `data` is `null` or missing |
| `generateResume()` | `true` (default) | Rejects if `data` is `null` or missing |
| `fetchDraft()` | `false` | Accepts `data: null` as valid "no draft" state |

---

## 6. Typecheck Results

**Command:** `npx tsc --noEmit` (from repo root)

**Result:** No type errors in `components/Resume/api/resumeApi.ts` or `app/dashboard/student/resume-builder/components/ResumeForm/ResumeForm.tsx`.

Pre-existing type errors in unrelated files (`app/dashboard/student/growth/page.tsx`, `backend/src/core/ai/gemini.provider.ts`, etc.) remain unchanged.

---

## 7. Frontend Tests

No frontend test suite exists in this repository. All test files are located under `backend/` and use Jest. The root `package.json` does not define a frontend test script.

---

## 8. Summary

- **Backend unchanged.** The API contract `{ success: true, data: null }` for missing drafts is preserved.
- **Frontend fix is minimal and targeted.** Only the generic `request()` helper signature and the `fetchDraft()` call site were updated.
- **No breaking changes.** `fetchTemplates` and `generateResume` retain their strict data-presence validation.
- **ResumeForm behavior unchanged.** It already treated a falsy draft as "start empty."
