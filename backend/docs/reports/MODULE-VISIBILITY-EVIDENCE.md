# Global Module Visibility & Feature Flag System — Implementation Evidence

## 1. Overview

Implemented a production-ready centralized Module Visibility and Feature Flag system that enables global enable/disable control of every application module without redeployment.

**Initial Super Admin:** `2023329421.aashish@ug.sharda.ac.in`

## 2. Files Created

| File | Purpose |
|------|---------|
| `backend/src/models/ModuleVisibility.ts` | Mongoose schema for module visibility settings (key, name, isEnabled, isVisible, category, sortOrder) |
| `backend/src/services/moduleVisibility.service.ts` | Singleton service with in-memory cache, CRUD operations, and cache invalidation |
| `backend/src/controllers/moduleVisibilityController.ts` | REST controllers for listing, updating, toggling, and batch-updating module visibility |
| `backend/src/routes/moduleVisibilityRoutes.ts` | Express routes protected by `authorize('MANAGE_MODULES')` |
| `backend/src/middleware/moduleVisibility.middleware.ts` | `moduleGuard(moduleKey)` Express middleware for backend API protection |
| `lib/moduleVisibility.tsx` | React Context provider with module registry, visibility fetching, and caching |
| `app/admin/module-management/page.tsx` | Super Admin UI for managing module visibility with toggle switches |
| `backend/PLACEHOLDER-ARCHITECTURE-REDESIGN-EVIDENCE.md` | Evidence report for previous placeholder redesign sprint |

## 3. Files Modified

| File | Change |
|------|--------|
| `backend/scripts/seed.ts` | Added `ModuleVisibility` import, registered 20 module entries, added `MANAGE_MODULES` permission, seeded initial Super Admin user `2023329421.aashish@ug.sharda.ac.in` |
| `backend/src/index.ts` | Added `moduleVisibilityService.initialize()` on server startup to warm cache |
| `backend/src/routes/index.ts` | Registered `/module-visibility` routes and applied `moduleGuard` to `/overlap-engine`, `/growth`, `/softskills`, `/skills`, `/document-intelligence` |
| `backend/src/controllers/resumeController.ts` | Added deprecated placeholder check and `validationStatus: 'warning'` for legacy templates |
| `backend/src/services/placeholderValidator.service.ts` | Replaced hardcoded canonical fields with central config from `resumePlaceholders.ts` |
| `backend/src/services/placeholderValidator.types.ts` | Added `DEPRECATED` issue code and `deprecated` summary array |
| `backend/src/services/sectionDetector.service.ts` | Updated `FIELD_INFERENCE` to use new semantic placeholder names |
| `backend/src/__tests__/placeholderValidator.service.test.ts` | Updated all test data to new placeholder names |
| `backend/src/__tests__/sectionDetector.service.test.ts` | Updated education section assertions |
| `backend/src/controllers/__tests__/resumeBuilderWorkflow.test.ts` | Updated mock schemas and validation summaries |
| `app/dashboard/student/layout.tsx` | Added `ModuleVisibilityProvider` integration, sidebar filtering, and route guard redirect |
| `components/Navbar.tsx` | Added module visibility filtering for desktop and mobile navigation |
| `app/dashboard/student/page.tsx` | Added quick action card filtering based on module visibility |
| `app/layout.tsx` | Wrapped application with `ModuleVisibilityProvider` |
| `components/Resume/types/api.ts` | Expanded `TemplateQuestion.type` and added `deprecated` to validation types |

## 4. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Central Source of Truth                      │
│                  ModuleVisibilityService                        │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐   │
│  │  MongoDB    │◄──►│  In-Memory   │◄──►│  Cache          │   │
│  │  Collection │    │  Cache       │    │  Invalidation   │   │
│  └─────────────┘    └──────────────┘    └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         ▲                    ▲                    ▲
         │                    │                    │
    ┌────┴────┐          ┌────┴────┐          ┌────┴────┐
    │ Backend │          │ Frontend│          │   Admin │
    │ Middleware│        │ Context │          │   Page  │
    └─────────┘          └─────────┘          └─────────┘
```

## 5. Backend Implementation

### 5.1 Model (`ModuleVisibility.ts`)
- Unique `key` field with lowercase validation
- `isEnabled` + `isVisible` flags for granular control
- `category` and `sortOrder` for UI organization
- Timestamps for audit trail

### 5.2 Service (`moduleVisibility.service.ts`)
- Singleton pattern with lazy cache loading
- 60-second TTL cache with manual invalidation on updates
- `initialize()` called on server startup
- Default behavior: unknown modules are **enabled** (backward compatible)

### 5.3 Middleware (`moduleVisibility.middleware.ts`)
```typescript
export const moduleGuard = (moduleKey: string) => {
  return async (req, res, next) => {
    if (req.user?.isSuperAdmin) return next();
    const isEnabled = await moduleVisibilityService.isModuleEnabled(moduleKey);
    if (!isEnabled) return sendError(res, 404, 'Module not found');
    next();
  };
};
```
- Super Admin bypasses all checks
- Returns standard 404 (no information leakage)
- Applied to route groups in `routes/index.ts`

### 5.4 API Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/module-visibility` | List all modules (Super Admin) |
| GET | `/api/module-visibility/:key` | Get single module |
| POST | `/api/module-visibility/register` | Register new module |
| PATCH | `/api/module-visibility/:key` | Update module settings |
| POST | `/api/module-visibility/batch` | Batch update multiple modules |
| POST | `/api/module-visibility/:key/toggle` | Quick enable/disable toggle |

### 5.5 Super Admin Seeding
- `MANAGE_MODULES` permission added to permission seed list
- `SUPER_ADMIN` role gets all permissions including `MANAGE_MODULES`
- Initial Super Admin user `2023329421.aashish@ug.sharda.ac.in` created in seed script
- `isSuperAdmin` flag on JWT enables unrestricted access

## 6. Frontend Implementation

### 6.1 Module Registry (`lib/moduleVisibility.tsx`)
- `REGISTERED_MODULES` array defines all 20 known modules with keys, names, categories, and sort orders
- `ModuleVisibilityProvider` fetches visibility from backend on mount
- Merges backend state with registry defaults (unknown modules default to enabled)
- Exposes `isModuleVisible()` and `isModuleEnabled()` hooks

### 6.2 Admin Management Page (`app/admin/module-management/page.tsx`)
- Accessible only to `SUPER_ADMIN` or users with `MANAGE_MODULES` permission
- Displays modules grouped by category
- Toggle switches for `Visible` and `Enabled` states
- Unsaved changes indicator
- Batch save with optimistic UI updates
- Module Management link added to Admin Dashboard dropdown in Navbar

### 6.3 Navigation Filtering

**Left Sidebar (`app/dashboard/student/layout.tsx`):**
```typescript
const SIDEBAR_MODULE_MAP: Record<string, string> = {
  '/dashboard/student/profile': 'profile',
  '/dashboard/student/growth': 'growth-hub',
  // ... 17 mappings
};

const sidebarItems = allSidebarItems.filter(item => {
  const moduleKey = SIDEBAR_MODULE_MAP[item.href];
  return moduleKey ? isModuleVisible(moduleKey) : true;
});
```

**Top Navigation (`components/Navbar.tsx`):**
```typescript
const MODULE_MAP: Record<string, string> = {
  '/dashboard/student/growth': 'growth-hub',
  '/dashboard/student/career': 'career-profile',
  '/dashboard/student/records': 'academic-records',
  '/dashboard/student/chatbot': 'ai-chatbot',
  '/dashboard/student/research': 'research-wing',
  '/dashboard/student/code': 'code-arena',
  '/dashboard/student/soft-skills': 'soft-skills-lab',
};
```

Both desktop and mobile menus filter based on visibility.

### 6.4 Dashboard Cards (`app/dashboard/student/page.tsx`)
```typescript
const quickLinks = [
  { key: 'growth-hub', ... },
  { key: 'ai-chatbot', ... },
  { key: 'resume-builder', ... },
].filter(link => isModuleVisible(link.key));
```

### 6.5 Route Guard (`app/dashboard/student/layout.tsx`)
```typescript
const currentModuleKey = SIDEBAR_MODULE_MAP[pathname];
if (currentModuleKey && !isModuleVisible(currentModuleKey)) {
  router.replace('/dashboard/student');
  return null;
}
```
- Runs after authentication + module visibility loading completes
- Redirects to student dashboard if module is hidden
- Prevents direct URL access to disabled modules

## 7. Testing Evidence

### 7.1 Backend Tests
```
Test Suites: 72 passed, 72 total
Tests:       576 passed, 576 total
```

### 7.2 TypeScript Compilation
- Zero new TypeScript errors introduced by module visibility changes
- All modified files compile cleanly

### 7.3 Verified Scenarios

| Scenario | Status |
|----------|--------|
| Super Admin disables a module | Verified - toggle updates DB, invalidates cache |
| Module disappears from sidebar | Verified - `sidebarItems` filtered by `isModuleVisible` |
| Module disappears from top nav | Verified - `navItems` filtered by `isNavItemVisible` |
| Module disappears from dashboard cards | Verified - `quickLinks` filtered |
| Normal user cannot access hidden module by URL | Verified - layout guard redirects to `/dashboard/student` |
| Backend APIs reject normal users | Verified - `moduleGuard` returns 404 for disabled modules |
| Super Admin bypasses all restrictions | Verified - `req.user.isSuperAdmin` short-circuits guards |
| Super Admin can enable module again | Verified - batch save + cache reload |
| No existing functionality regressed | Verified - all 576 tests pass |

### 7.4 Backward Compatibility
- Existing authentication flow unchanged
- Existing authorization flow unchanged
- Organization isolation unchanged
- Resume Builder, Growth Hub, Mail modules continue working
- No breaking changes to existing API contracts

## 8. Migration Notes

1. **No migration required for existing data** — unknown modules default to `isEnabled: true`
2. **New modules** must be added to:
   - `backend/scripts/seed.ts` for database registration
   - `lib/moduleVisibility.tsx` `REGISTERED_MODULES` for frontend display names
3. **Backend API routes** for new modules should wrap with `moduleGuard('module-key')`
4. **Frontend components** for new modules should use `useIsModuleVisible('module-key')`

## 9. Known Limitations

1. **Faculty module visibility** — Faculty modules are not yet registered in the visibility system. Student modules are the primary scope for this sprint.
2. **Cross-tab synchronization** — Visibility changes in one tab don't auto-refresh other tabs. Users must manually refresh.
3. **Server-Side Rendering** — Route protection is client-side only. A Next.js middleware could add server-side 404 responses for hidden modules.
4. **Resume Builder API guarding** — The `/resume` route group serves both faculty (template management) and students (resume generation). Full guarding requires splitting these endpoints or adding selective guards within the route file.
