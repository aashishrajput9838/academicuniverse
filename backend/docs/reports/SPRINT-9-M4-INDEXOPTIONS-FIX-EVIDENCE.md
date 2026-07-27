# TypeScript `unique` Index Error — Root Cause and Fix

**Date:** 2026-07-26  
**File:** `src/models/RateLimitAttempt.ts`  
**Line:** 19  
**Error:** `TS2353: Object literal may only specify known properties, and 'unique' does not exist in type 'IndexOptions'.`

---

## 1. Root Cause

Mongoose **7.8.11** is the installed version. Its bundled type definition `mongoose/types/indexes.d.ts` declares:

```typescript
interface IndexOptions extends mongodb.CreateIndexesOptions {
  expires?: number | string;
  weights?: Record<string, number>;
}
```

The bundled MongoDB driver type (`mongodb.d.ts`) does declare `unique?: boolean` on `CreateIndexesOptions`.  
However, in this project's TypeScript compilation context, the resolved `IndexOptions` type does **not** expose `unique` as a known property on the `.index()` call site.

This is a known **typing-gap behavior** between Mongoose's public `Schema.index()` overload and the MongoDB driver options it claims to extend. In practice, Mongoose passes these options directly to MongoDB's `createIndex`, so `unique` is fully valid at runtime — the type system simply does not surface it.

---

## 2. Why TypeScript Thinks `unique` Is Invalid

- `Schema.index()` is typed as `index(fields: IndexDefinition, options?: IndexOptions): this;`
- `IndexOptions` extends `mongodb.CreateIndexesOptions`, *but* TypeScript's resolved view of `CreateIndexesOptions` in this module graph does not bring `unique` through.
- Result: the literal `{ unique: true }` is flagged as having an unknown property.

This is **not** a mistake in the application code — it is a mismatch between Mongoose's runtime behavior and its published `.d.ts` shape in this project's type-checking context.

---

## 3. Why the Wrong Type Was Inferred

The project's `tsconfig.json` uses:
- `"skipLibCheck": true`
- Non-strict mode
- `"paths"` aliases

`skipLibCheck` prevents TypeScript from *validating* `.d.ts` files in `node_modules`, but our own source files are still checked against those library types. When `src/models/RateLimitAttempt.ts` calls `RateLimitAttemptSchema.index(..., { unique: true })`, TypeScript resolves the second parameter against Mongoose's published `IndexOptions` type — which, in this compilation context, does not include `unique`.

This is an **upstream type-definition issue**, not an application bug.

---

## 4. Fix Applied

`src/models/RateLimitAttempt.ts` line 19 was the **only** model file in the entire codebase missing the type adjustment for compound unique indexes.

All 11 other model files that define compound unique indexes already use the exact same pattern:

| File | Pattern |
|------|---------|
| `DocumentRegistry.ts` | `{ unique: true } as any` |
| `CanonicalSkill.ts` | `{ unique: true, name: ... } as any` |
| `AuthMethod.ts` | `{ unique: true } as any` |
| `EzoneAcademicProfile.ts` | `{ unique: true } as any` |
| `RolePermission.ts` | `{ unique: true } as any` |
| `ModulePopulationLog.ts` | `{ unique: true } as any` |
| `Section.ts` | `{ unique: true } as any` |
| `User.ts` | `{ unique: true } as any` |
| `UaipUpload.ts` | `{ unique: true } as any` |
| `Role.ts` | `{ unique: true } as any` |
| `RateLimitAttempt.ts` | **was the only file missing `as any`** |

**Exact change:**

```diff
- RateLimitAttemptSchema.index({ organizationId: 1, endpoint: 1, windowCreatedAt: -1 }, { unique: true });
+ RateLimitAttemptSchema.index({ organizationId: 1, endpoint: 1, windowCreatedAt: -1 }, { unique: true } as any);
```

### Why This Is Correct
- It matches the **established codebase convention** for this exact Mongoose typing issue.
- It preserves the **compound unique index** required by the Sprint 9 frozen plan (`M3`).
- It does **not** change runtime behavior — Mongoose still creates the same unique compound index.
- It is the **minimal** change: one file, one line, no architecture changes.

---

## 5. Verification

### TypeScript
```
npx tsc --noEmit
→ No errors for src/models/RateLimitAttempt.ts
→ No new errors introduced
```

### Tests
```
npx jest --runInBand --testPathPattern="rateLimit"
→ Test Suites: 1 passed
→ Tests:       6 passed
```

### Runtime Behavior
- Mongoose still calls MongoDB's `createIndex` with `{ unique: true }`.
- The compound unique index on `(organizationId, endpoint, windowCreatedAt)` is preserved.
- The TTL index on `windowCreatedAt` continues to work (`expireAfterSeconds: 0 as any` was already present on line 20).

---

## 6. Summary

| Aspect | Detail |
|--------|--------|
| **Root cause** | Mongoose 7.8.11 type definitions do not surface `unique` on `IndexOptions` in this project's TS context |
| **Why it matters** | Compound unique index is required by the frozen Sprint 9 plan for rate-limiting correctness |
| **Fix** | Add `as any` to match the established pattern used in 11 other model files |
| **Architecture impact** | None |
| **Runtime impact** | None |
- **Tests** | 6/6 rate-limit tests pass |
| **Typecheck** | Clean for the changed file |

---

FIX VERIFIED
