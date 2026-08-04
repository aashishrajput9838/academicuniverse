# SHARED_UTILS_MIGRATION.md

## Shared Utils Package Migration Details

**Package Name**: `@academicuniverse/shared-utils` (Alias: `@shared-utils`)  
**Location**: [`packages/shared-utils`](file:///c:/github/academicuniverse.com/academicuniverse/packages/shared-utils)  
**Status**: **MIGRATED & LINKED**

---

## 1. Migrated Utilities

### A. Date Normalization (`@shared-utils/date`)
Migrated from `lib/utils/dateNormalizer.ts` (332 lines → `packages/shared-utils/src/date.ts`):

| Export | Type | Description |
| :--- | :--- | :--- |
| `DateInput` | Type Alias | Union type for date inputs (`string \| number \| Date \| null \| undefined`) |
| `NormalizedDate` | Interface | Normalized date output with `iso`, `isoDateTime`, `isValid`, `raw` fields |
| `normalizeDate` | Function | Core date parsing and normalization engine |
| `normalizeScheduleDates` | Function | Batch normalizer for schedule event arrays |
| `formatDateForDisplay` | Function | Human-readable date formatter with locale support |

**Consumers Updated (16 files)**:
- `components/NextClassWidget.tsx`
- `components/TodaySchedule.tsx`
- `app/dashboard/student/schedule/page.tsx`
- `app/dashboard/student/webscrap/page.tsx`
- `app/dashboard/student/ezone-sync/page.tsx`
- `app/dashboard/student/mail/page.tsx`
- `app/dashboard/student/mail/[messageId]/page.tsx`
- `app/admin/timetable-status/page.tsx`
- `app/admin/users/page.tsx`
- Backend services via shim at `backend/src/shared/utils/dateNormalizer.ts`

---

### B. String & Score Formatters (`@shared-utils/formatters`)
Migrated from `utils/formatters.ts` (70 lines → `packages/shared-utils/src/formatters.ts`):

| Export | Type | Description |
| :--- | :--- | :--- |
| `formatDate` | Function | Locale date formatter (`en-IN`) |
| `formatDateTime` | Function | Locale date+time formatter |
| `getScoreColorClass` | Function | Tailwind text color class for 0–100 scores |
| `getScoreBgClass` | Function | Tailwind background color class for 0–100 scores |
| `truncateText` | Function | Safe string truncation with ellipsis |
| `capitalize` | Function | Capitalize first letter of a string |

**Note**: This file has 0 direct consumers currently (no imports of `@/utils/formatters` found). It was migrated proactively as a shared utility.

---

### C. Issuer Brand Logos (`@shared-utils/issuerLogos`)
Migrated from `utils/issuerLogos.ts` (117 lines → `packages/shared-utils/src/issuerLogos.ts`):

| Export | Type | Description |
| :--- | :--- | :--- |
| `IssuerBrand` | Interface | Brand metadata structure (name, colors, badge styles) |
| `getIssuerBrand` | Function | Returns brand identity for known certificate issuers |

**Consumers Updated (2 files)**:
- `components/certificates/CertificatePreviewModal.tsx`
- `components/certificates/CertificateThumbnailGallery.tsx`

---

## 2. Deferred Item

| Item | Status | Rationale |
| :--- | :--- | :--- |
| `lib/utils.ts` (`cn` helper) | **Deferred to Phase 3** | 61 imports across UI components. High-impact, low-urgency. Left in place per architect directive. |

---

## 3. Backward Compatibility Shims

| Original Path | Shim Contents | Purpose |
| :--- | :--- | :--- |
| `lib/utils/dateNormalizer.ts` | `export * from '@shared-utils/date';` | Legacy frontend imports continue to resolve |
| `backend/src/shared/utils/dateNormalizer.ts` | `export * from '@shared-utils/date';` | Legacy backend imports continue to resolve |
| `utils/formatters.ts` | `export * from '@shared-utils/formatters';` | Legacy imports continue to resolve |
| `utils/issuerLogos.ts` | `export * from '@shared-utils/issuerLogos';` | Legacy imports continue to resolve |
