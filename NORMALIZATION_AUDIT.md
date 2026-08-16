# Normalization Audit
# CanonicalNormalizer Scope & Subject Array Normalization
# AU DIC Benchmark Evaluation Framework

---

## 1. Executive Summary

This audit proves that **`CanonicalNormalizer.ts` does NOT perform normalization on subject array elements or nested objects.**

`CanonicalNormalizer` operates exclusively as a top-level dictionary normalizer. When arrays or subject objects are passed to it, they fall through to line 48 (`canonical[normKey] = val`), bypassing string, numeric, date, and domain-specific normalizers.

---

## 2. Source Code Evidence & Analysis

**File**: [`backend/src/benchmark/normalizers/CanonicalNormalizer.ts`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/normalizers/CanonicalNormalizer.ts)

```typescript
// CanonicalNormalizer.ts Lines 24-53
public static normalizeFields(fields: Record<string, any>): CanonicalFields {
  if (!fields || typeof fields !== 'object') return {};

  const canonical: CanonicalFields = {};

  for (const [rawKey, val] of Object.entries(fields)) {
    if (val === null || val === undefined) continue;

    const normKey = this.normalizeKey(rawKey);
    const lowerKey = normKey.toLowerCase();

    if (lowerKey.includes('date')) {
      canonical[normKey] = DateNormalizer.normalize(val);
    } else if (lowerKey.includes('roll') || lowerKey.includes('enrollment')) {
      canonical[normKey] = RollNumberNormalizer.normalize(val);
    } else if (lowerKey.includes('gpa') || lowerKey.includes('cgpa') || lowerKey.includes('credits') || lowerKey.includes('marks')) {
      canonical[normKey] = NumericNormalizer.normalize(val);
    } else if (lowerKey.includes('degree') || lowerKey.includes('title') || lowerKey.includes('course')) {
      canonical[normKey] = DegreeNameNormalizer.normalize(val);
    } else if (lowerKey.includes('university') || lowerKey.includes('issuer') || lowerKey.includes('institution')) {
      canonical[normKey] = UniversityAliasNormalizer.normalize(val);
    } else if (typeof val === 'string') {
      canonical[normKey] = StringNormalizer.normalize(val, true);
    } else {
      canonical[normKey] = val; // ← LINE 48: ARRAYS & OBJECTS PASS THROUGH UNTOUCHED!
    }
  }

  return canonical;
}
```

---

## 3. Scope Verification Matrix

| Target Entity Type | `CanonicalNormalizer` Executed? | Domain Normalizer Used | Impact on Matching |
|---|---|---|---|
| Scalar Dates | ✅ Yes | `DateNormalizer` | YYYY-MM-DD standardized |
| Scalar Roll Numbers | ✅ Yes | `RollNumberNormalizer` | Uppercase, trim whitespace |
| Scalar GPA / CGPA | ✅ Yes | `NumericNormalizer` | Coerced to float / numeric |
| Scalar Degree Names | ✅ Yes | `DegreeNameNormalizer` | Normalized degree strings |
| Scalar University Names | ✅ Yes | `UniversityAliasNormalizer` | Resolved to canonical institution |
| Generic Scalar Strings | ✅ Yes | `StringNormalizer` | Trimmed & lowercased |
| **Subject Course Codes** | ❌ **Skipped** | None | Raw string matching only |
| **Subject Grades** | ❌ **Skipped** | None | Raw string matching only |
| **Subject Credits** | ❌ **Skipped** | None | Coerced in `ExactMatchComparator` |
| **Subject Arrays (`subjects[]`)** | ❌ **Skipped** | None | Passes through as un-normalized array |

---

## 4. Required Normalization Enhancements for Subject Arrays

1. **Subject Code Normalizer**: Convert `"ma-101"`, `"MA 101"`, `"MA101"` → `"MA101"`.
2. **Subject Grade Normalizer**: Convert `"A+"`, `"A PLUS"`, `"10.0"` → `"A+"`.
3. **Recursive Array Normalizer**: Extend `CanonicalNormalizer.normalizeFields` to recursively normalize array elements.
