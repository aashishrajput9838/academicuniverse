# FACULTY-LOGIN-DISCOVERY.md

**Date:** 2026-07-21T05:08:00+05:30  
**Status:** Investigation Complete  
**Scope:** Faculty development credentials discovery  

---

## 1. Executive Summary

**A default faculty account DOES exist in the seed script**, but there is a **critical inconsistency** between documented credentials and what the seed script actually creates.

| Source | Faculty Email | Password | Actually Created? |
|--------|--------------|----------|-------------------|
| `backend/README.md` | `jane.smith@sharda.com` | `Faculty123` | ❌ NO |
| `backend/scripts/rbacTest.ts` | `jane.smith@sharda.com` | `Faculty123` | ❌ NO |
| `backend/scripts/rbacTestExtended.ts` | `jane.smith@sharda.com` | `Faculty123` | ❌ NO |
| `backend/scripts/seed.ts` (actual users array) | `2023329421.vamsi@fa.sharda.ac.in` | `123456` | ✅ YES |
| `backend/scripts/seed.ts` (console.log summary) | `jane.smith@sharda.com` | `Faculty123` (implied) | ❌ NO |

**The only faculty account actually created by the seed script is:**
- **Email:** `2023329421.vamsi@fa.sharda.ac.in`
- **Password:** `123456`
- **Role:** FACULTY
- **Found in:** `backend/scripts/seed.ts` lines 257–262

---

## 2. Detailed Findings

### 2.1 Actual Faculty Account in seed.ts

**File:** `backend/scripts/seed.ts`  
**Lines:** 257–262

```typescript
{
  name: 'Dr. Vamsi',
  email: '2023329421.vamsi@fa.sharda.ac.in',
  password: '123456',
  organizationId: organization._id,
  roleId: facultyRole!._id,
},
```

**Status:** This user IS created by the seed script.

### 2.2 Documented but Non-existent Faculty Account

**Files:**
- `backend/README.md` lines 101, 499–500
- `backend/scripts/rbacTest.ts` line 10
- `backend/scripts/rbacTestExtended.ts` line 10
- `backend/scripts/seed.ts` lines 295–297 (console.log summary)

**Claims:**
- Email: `jane.smith@sharda.com`
- Password: `Faculty123`

**Status:** This user is **never created** by `seed.ts`. The demo users array (lines 241–270) does not include `jane.smith@sharda.com`. Only the console.log summary at lines 292–297 mentions it, which is a documentation bug.

### 2.3 Inconsistent Password Pattern

**backend/README.md line 104:**
```
All passwords: Super/Admin/Faculty/Student123
```

**Actual passwords in seed.ts:**
| Role | Email | Password | Matches Pattern? |
|------|-------|----------|-----------------|
| SUPER_ADMIN | `superadmin@academicuniverse.com` | `SuperAdmin123` | ✅ |
| ADMIN | `admin@sharda.com` | `Admin123456` | ❌ (`Admin123456` vs `Admin123`) |
| FACULTY | `2023329421.vamsi@fa.sharda.ac.in` | `123456` | ❌ (`123456` vs `Faculty123`) |
| STUDENT | `john.doe@sharda.com` | `Student123` | ✅ |

**Conclusion:** The README's claimed password pattern does not match reality. Only 2 of 4 accounts follow the pattern.

### 2.4 Domain-Based Role Assignment

**File:** `README.md` lines 117–126

| Domain | Assigned Role |
|--------|--------------|
| `@ug.sharda.ac.in` | STUDENT |
| `@fa.sharda.ac.in` | FACULTY |
| `@academicuniverse.com` | SUPER_ADMIN |

The actual faculty user `2023329421.vamsi@fa.sharda.ac.in` uses the `@fa.sharda.ac.in` domain, which correctly maps to FACULTY.

The documented (but non-existent) user `jane.smith@sharda.com` uses `@sharda.com`, which is **not** in any documented domain-to-role mapping. Its role assignment behavior is undefined.

---

## 3. How Faculty Accounts Are Supposed to Be Created

### 3.1 Via Seed Script (Development)

```bash
cd backend && npm run seed
```

This creates:
- Organization: `Sharda University`
- Roles: SUPER_ADMIN, ADMIN, FACULTY, STUDENT
- Demo users including the faculty account above

### 3.2 Via Registration Endpoint

**File:** `backend/src/controllers/authController.ts` lines 48–61

```typescript
export const registerController = async (req: Request, res: Response) => {
  const { name, email, password, organizationId, roleId } = req.body;
  const user = await import('../services/authService')
    .then(m => m.registerUser(name, email, password, organizationId, roleId));
  return sendResponse(res, 201, user, 'User registered successfully');
};
```

**Endpoint:** `POST /api/auth/register`

### 3.3 Via Firebase OAuth (Domain-Enforced)

**File:** `backend/README.md` lines 165–183

```bash
POST /api/auth/firebase-login
{
  "idToken": "firebase_id_token_from_client"
}
```

Role is automatically assigned based on email domain:
- `@fa.sharda.ac.in` → FACULTY

---

## 4. Why No Consistent Faculty Credentials Exist

1. **seed.ts was partially updated** — The demo users array was changed to use realistic Sharda University emails (`2023329421.vamsi@fa.sharda.ac.in`), but the console.log summary and README were never updated.
2. **rbacTest scripts were not updated** — They still reference the old `jane.smith@sharda.com` / `Faculty123` credentials.
3. **Password pattern was broken** — The actual faculty password `123456` does not match the documented `Faculty123`.

---

## 5. Recommended Faculty Credentials for Local Development

### Option A: Use the Actually Created Faculty Account

Run the seed script:
```bash
cd backend && npm run seed
```

Then login with:
- **Email:** `2023329421.vamsi@fa.sharda.ac.in`
- **Password:** `123456`

### Option B: Create a New Faculty Account via Registration

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Your Name",
    "email": "yourname@fa.sharda.ac.in",
    "password": "YourPassword123",
    "organizationId": "<org_id>",
    "roleId": "<faculty_role_id>"
  }'
```

### Option C: Use createAdminUser.ts Pattern for Faculty

Create a similar script for faculty:
```bash
# Not currently available — would need to be created
```

---

## 6. Exact Commands to Create Faculty Account

### If seed has already been run:

The faculty account already exists. Just use:
- Email: `2023329421.vamsi@fa.sharda.ac.in`
- Password: `123456`

### If seed has NOT been run:

```bash
cd backend
npm run seed
```

### To verify existing users:

```bash
cd backend
npx ts-node scripts/checkUsers.ts
# or
npx ts-node scripts/debugUsers.ts
```

### To create a custom faculty user:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Faculty",
    "email": "newfaculty@fa.sharda.ac.in",
    "password": "SecurePass123",
    "organizationId": "SHARDA_UNIVERSITY_ORG_ID",
    "roleId": "FACULTY_ROLE_ID"
  }'
```

---

## 7. Files Containing Faculty Credential References

| File | Line | Content | Accurate? |
|------|------|---------|-----------|
| `backend/scripts/seed.ts` | 257–262 | `2023329421.vamsi@fa.sharda.ac.in` / `123456` | ✅ Yes |
| `backend/scripts/seed.ts` | 295 | `jane.smith@sharda.com (faculty)` | ❌ Not created |
| `backend/scripts/seed.ts` | 297 | `All demo passwords: Super/Admin/Faculty/Student123` | ❌ Inaccurate |
| `backend/README.md` | 101 | `jane.smith@sharda.com (Faculty)` | ❌ Not created |
| `backend/README.md` | 499–500 | `jane.smith@sharda.com` / `Faculty123` | ❌ Not created |
| `backend/scripts/rbacTest.ts` | 10 | `jane.smith@sharda.com` / `Faculty123` | ❌ Not created |
| `backend/scripts/rbacTestExtended.ts` | 10 | `jane.smith@sharda.com` / `Faculty123` | ❌ Not created |

---

## 8. Conclusion

**Default faculty credentials that actually exist:**
- **Email:** `2023329421.vamsi@fa.sharda.ac.in`
- **Password:** `123456`
- **Source:** `backend/scripts/seed.ts` lines 257–262

**Why confusion exists:**
The README and test scripts reference `jane.smith@sharda.com` / `Faculty123`, but this user is never created by the seed script. This is a documentation/seed-script inconsistency.

**Safest way to create a new faculty account for local development:**
1. Run `npm run seed` to create the default faculty account
2. Or use `POST /api/auth/register` with a `@fa.sharda.ac.in` email
3. Or use Firebase OAuth with a `@fa.sharda.ac.in` email for automatic role assignment

---

**End of Faculty Login Discovery Report**
