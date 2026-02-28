# Academic Universe Backend - Production-Ready RBAC System

## 🏗️ Architecture Overview

This is a **multi-tenant, SaaS-ready backend** with:

- ✅ **Multi-Tenant Architecture**: Supports multiple organizations with complete data isolation
- ✅ **Role-Based Access Control (RBAC)**: Scalable permission model
- ✅ **JWT Authentication**: Secure token-based auth with permissions embedded
- ✅ **Express.js + MongoDB**: Battle-tested stack
- ✅ **TypeScript**: Type-safe backend
- ✅ **Best Practices**: Clean code, proper error handling, security-first approach

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── models/              # Mongoose schemas
│   │   ├── Organization.ts
│   │   ├── User.ts
│   │   ├── Role.ts
│   │   ├── Permission.ts
│   │   ├── RolePermission.ts
│   │   └── index.ts
│   ├── middleware/          # Express middleware
│   │   ├── auth.ts          # authenticateUser, authorize, enforceOrgIsolation
│   │   ├── errorHandler.ts  # Global error handling
│   │   └── index.ts
│   ├── controllers/         # Route handlers
│   │   ├── authController.ts
│   │   ├── marksController.ts (example)
│   │   └── index.ts
│   ├── routes/              #API routes
│   │   ├── authRoutes.ts
│   │   ├── marksRoutes.ts
│   │   └── index.ts
│   ├── services/            # Business logic
│   │   ├── authService.ts
│   │   ├── roleService.ts
│   │   └── index.ts
│   ├── config/              # Configuration
│   │   ├── database.ts
│   │   ├── constants.ts
│   │   └── index.ts
│   ├── utils/               # Utilities
│   │   ├── jwt.ts
│   │   ├── errors.ts
│   │   └── response.ts
│   └── index.ts             # Express app entry point
├── scripts/
│   └── seed.ts              # Database seeding script
├── .env.example             # Environment template
├── package.json
├── tsconfig.json
└── README.md

```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Setup

Create `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Update values in `.env`:

```env
MONGODB_URI=mongodb://localhost:27017/academic_universe
JWT_SECRET=your-super-secret-key-generate-randomly
NODE_ENV=development
PORT=5000
```

### 3. Database Seeding

Populate database with roles, permissions, and demo users:

```bash
npm run seed
```

**Demo Users Created:**
- `superadmin@academicuniverse.com` (Super Admin - all permissions)
- `admin@sharda.com` (Admin - org admin)
- `jane.smith@sharda.com` (Faculty)
- `john.doe@sharda.com` (Student)

All passwords: `Super/Admin/Faculty/Student123`

### 4. Start Development Server

```bash
npm run dev
```

Server runs on `http://localhost:5000`

Check health: `http://localhost:5000/health`

---

## 🔐 Authentication & Authorization

### JWT Token Structure

```json
{
  "userId": "user_id",
  "email": "user@example.com",
  "organizationId": "org_id",
  "roleId": "role_id",
  "permissions": ["ADD_MARKS", "VIEW_MARKS", "EDIT_PROFILE"],
  "isSuperAdmin": false
}
```

### Login & Get Token

**Endpoint:** `POST /api/auth/login`

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@sharda.com",
    "password": "Admin123456"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "name": "Admin User",
      "email": "admin@sharda.com",
      "organization": "Sharda University",
      "role": "ADMIN",
      "permissions": [...]
    }
  }
}
```

### Firebase OAuth Login

**Endpoint:** `POST /api/auth/firebase-login`

The system now features automatic role detection based on institutional email domains:
- `@ug.sharda.ac.in` → **STUDENT** role
- `@fa.sharda.ac.in` → **FACULTY** role  
- `@pg.sharda.ac.in` → **STUDENT** role
- Other domains → **Access Denied**

Roles are permanently assigned based on email domain and cannot be manually edited.

```bash
curl -X POST http://localhost:5000/api/auth/firebase-login \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "firebase_id_token_from_client"
  }'
```

### Use Token in Requests

All protected routes require Bearer token:

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🎯 Permission System

### Available Permissions

| Permission | Category | Description |
|------------|----------|-------------|
| `ADD_MARKS` | MARKS | Add marks for students |
| `VIEW_MARKS` | MARKS | View student marks |
| `EDIT_MARKS` | MARKS | Edit marks |
| `DELETE_MARKS` | MARKS | Delete marks |
| `VIEW_ALL_MARKS` | MARKS | View all org marks |
| `VIEW_REPORTS` | REPORTS | View reports |
| `EDIT_PROFILE` | PROFILE | Edit own profile |
| `MANAGE_USERS` | ADMIN | Manage users |
| `MANAGE_ROLES` | ADMIN | Manage roles |
| `ACCESS_RESEARCH` | RESEARCH | Access research |
| `USE_CHATBOT` | CHATBOT | Use chatbot |

### System Roles

| Role | Permissions | Usage |
|------|------------|-------|
| **SUPER_ADMIN** | All | Platform owner |
| **ADMIN** | All (in org) | Organization admin |
| **FACULTY** | MARKS, REPORTS, PROFILE, CHATBOT | Teachers |
| **STUDENT** | MARKS, REPORTS, PROFILE, RESEARCH, CHATBOT | Students |

---

## 📝 Example Routes

### Marks Management (with RBAC)

#### Add Marks (Requires `ADD_MARKS` Permission)

**Endpoint:** `POST /api/marks`

```bash
curl -X POST http://localhost:5000/api/marks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "STU001",
    "subjectId": "MATH101",
    "marks": 85
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Marks added successfully",
  "data": {
    "id": "mark_1",
    "studentId": "STU001",
    "marks": 85,
    "organizationId": "org_123",
    "createdBy": "user_123",
    "createdAt": "2024-02-16T10:30:00Z"
  }
}
```

#### View Student Marks (Requires `VIEW_MARKS` Permission)

**Endpoint:** `GET /api/marks/:studentId`

```bash
curl -X GET http://localhost:5000/api/marks/STU001 \
  -H "Authorization: Bearer <token>"
```

#### View All Marks (Requires `VIEW_ALL_MARKS` Permission)

**Endpoint:** `GET /api/marks`

```bash
curl -X GET http://localhost:5000/api/marks \
  -H "Authorization: Bearer <token>"
```

#### Update Marks (Requires `EDIT_MARKS` Permission)

**Endpoint:** `PUT /api/marks/:markId`

```bash
curl -X PUT http://localhost:5000/api/marks/mark_1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"marks": 90}'
```

#### Delete Marks (Requires `DELETE_MARKS` Permission)

**Endpoint:** `DELETE /api/marks/:markId`

```bash
curl -X DELETE http://localhost:5000/api/marks/mark_1 \
  -H "Authorization: Bearer <token>"
```

---

## 🔒 Security Features

### 1. Organization Isolation (Multi-Tenancy)

Every protected route automatically enforces organization isolation:

```typescript
// Middleware automatically:
// 1. Extracts organizationId from JWT
// 2. Validates incoming data belongs to same org
// 3. Filters database queries by organizationId
```

**Example:**
```typescript
// This prevents users from accessing other org data
const mark = marksDB.filter(m => 
  m.organizationId === req.organizationId // Auto-enforced
);
```

### 2. Permission-Based Authorization

Only authenticated users with required permission can access routes:

```typescript
// Faculty can ADD_MARKS, but not MANAGE_USERS
router.post('/', authorize('ADD_MARKS'), handler);
```

### 3. Super Admin Bypass

Super admins automatically have all permissions:

```typescript
if (req.user?.isSuperAdmin) {
  return next(); // No permission check needed
}
```

### 4. Password Hashing

Passwords are hashed with bcrypt before storing:

```typescript
// Automatically hashed via Mongoose pre-save hook
user.password = await bcrypt.hash(password, 10);
```

### 5. JWT Verification

All protected routes verify JWT signature and expiry:

```typescript
const decoded = verifyToken(token); // Throws if invalid/expired
```

---

## 🛡️ Error Handling

Custom error classes for consistent responses:

```typescript
throw new ValidationError('Invalid input');      // 400
throw new AuthenticationError('Login failed');   // 401
throw new AuthorizationError('No permission');   // 403
throw new NotFoundError('User');                 // 404
```

All errors return structured JSON:

```json
{
  "success": false,
  "message": "Invalid email or password",
  "statusCode": 401
}
```

---

## 📊 Database Models

### Organization

```typescript
{
  _id: ObjectId,
  name: "Sharda University",
  slug: "sharda-university",
  planType: "ENTERPRISE",
  maxUsers: 10000,
  isActive: true,
  superAdminId: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

### User

```typescript
{
  _id: ObjectId,
  name: "John Doe",
  email: "john@sharda.com",
  password: "hashed_bcrypt",
  firebaseUid: "firebase_uid",
  organizationId: ObjectId,  // Multi-tenant isolation
  roleId: ObjectId,
  isActive: true,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Role

```typescript
{
  _id: ObjectId,
  name: "FACULTY",
  organizationId: ObjectId,  // Org-specific roles
  description: "Faculty member",
  isSuperAdmin: false,
  isSystem: false,           // Cannot delete system roles
  createdAt: Date,
  updatedAt: Date
}
```

### Permission

```typescript
{
  _id: ObjectId,
  name: "ADD_MARKS",
  description: "Add marks for students",
  category: "MARKS",
  createdAt: Date,
  updatedAt: Date
}
```

### RolePermission (Many-to-Many)

```typescript
{
  _id: ObjectId,
  roleId: ObjectId,
  permissionId: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🚀 Production Deployment

### Environment Variables (Update for Production)

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/academic_universe
JWT_SECRET=generate-a-strong-random-secret
NODE_ENV=production
PORT=8080
CORS_ORIGIN=https://academicuniverse.com
```

### Build for Production

```bash
npm run build
npm start  # Runs dist/src/index.js
```

### Deploy to Node.js Hosting

Works with:
- Heroku
- Render.com
- Railway
- AWS (EC2, Lambda)
- Google Cloud Run
- DigitalOcean

---

## 🧪 Testing the System

### 1. Login as Faculty

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane.smith@sharda.com",
    "password": "Faculty123"
  }'
```

Copy the token from response.

### 2. Add Marks (Faculty has permission)

```bash
curl -X POST http://localhost:5000/api/marks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "STU001",
    "subjectId": "MATH101",
    "marks": 85
  }'
```

✅ Should succeed.

### 3. Login as Student & Try to Add Marks

```bash
# Get student token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@sharda.com",
    "password": "Student123"
  }'
```

Try to POST marks with student token:

```bash
curl -X POST http://localhost:5000/api/marks \
  -H "Authorization: Bearer STUDENT_TOKEN" \
  ...
```

❌ Should get `403 Forbidden` (insufficient permissions).

---

## 📚 Adding New Features

### Example: Add a New Permission & Route

#### 1. Add Permission (update `scripts/seed.ts`)

```typescript
{
  name: 'VIEW_ANALYTICS',
  description: 'View analytics dashboard',
  category: 'REPORTSPORTS',
}
```

#### 2. Create Route (new file `src/routes/analyticsRoutes.ts`)

```typescript
router.get('/', authorize('VIEW_ANALYTICS'), analyticsController);
```

#### 3. Assign to Roles (in seed script)

```typescript
// Only ADMIN and FACULTY get VIEW_ANALYTICS
```

#### 4. Reseed Database

```bash
npm run seed
```

---

## 🐛 Troubleshooting

### MongoDB Connection Failed

```
Error: MongoDB connection failed
```

**Solution:** Ensure MongoDB is running

```bash
# Local MongoDB
mongod

# Or update MONGODB_URI in .env to use MongoDB Atlas
```

### Invalid Token Error

```
"Invalid token or authentication failed"
```

**Solution:** Token may be expired (default 7 days). Login again to get new token.

### Organization Isolation Error

```
"Cannot access data from other organizations"
```

**Solution:** User is trying to access data from another org. Bug in app logic - should never happen if frontend correctly uses authenticated user's org.

---

## 📖 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [JWT Best Practices](https://auth0.com/blog/json-web-token-jwt-best-current-practices/)
- [RBAC Design Patterns](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

---

## 📄 License

MIT

---

## ✉️ Support

For issues or improvements, create a GitHub issue or PR.

**Happy coding! 🚀**
