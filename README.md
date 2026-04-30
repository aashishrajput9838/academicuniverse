# 🎓 Academic Universe

<p align="center">
  <strong>The First AI-Powered Student Growth Ecosystem</strong>
</p>

<p align="center">
  <em>Beyond Marks & Attendance: Transforming Education Through Holistic Development</em>
</p>

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0.0-green?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Express.js](https://img.shields.io/badge/Express.js-4.18.0-gray?logo=express&logoColor=white)](https://expressjs.com/)
[![Firebase](https://img.shields.io/badge/Firebase-12.9.0-yellow?logo=firebase&logoColor=white)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-red.svg)](LICENSE)

</div>

---

## ✨ What is Academic Universe?

Academic Universe is a revolutionary educational platform that transforms traditional academic evaluation by incorporating **holistic student development tracking**. Our AI-powered ecosystem goes beyond conventional metrics like grades and attendance, focusing on comprehensive growth through:

- 🧠 **IQ/EQ Assessments** - Weekly cognitive and emotional intelligence tracking
- 🤖 **AI Support Systems** - 24/7 emotional chatbot & research assistant
- 🏆 **Verified Credentials** - Faculty-verified achievement portfolio
- 💻 **Competitive Arena** - Integration with LeetCode, Codeforces, GitHub
- 🎮 **Gamification** - Growth-based leaderboards & achievement badges
- 📊 **Smart Analytics** - Burnout detection & personalized recommendations

---

## 🚀 Key Features

### 📊 **Verified Record System**
Centralized, trusted profile for faculty and recruiters. Every achievement, certification, and milestone is verified by faculty — eliminating unreliable Google Forms and scattered records.

### 🌱 **Holistic Growth Engine**
- Weekly IQ & EQ assessments with trend analysis
- AI-powered growth degradation alerts
- Personalized recommendations based on performance
- Stress and burnout detection systems

### 🤖 **AI Support Systems**
- **Emotional Intelligence Chatbot**: 24/7 mental wellness support
- **Research Assistant**: AI-powered publication support
- **Personalized Recommendations**: Tailored advice based on individual progress

### 💻 **Competitive Arena**
- Integration with major coding platforms (LeetCode, Codeforces, GitHub)
- Bug bounty challenges with rewards
- Progress tracking across multiple platforms
- Growth-based rather than grade-based competition

### 🏆 **Gamification & Rankings**
- Growth-based university leaderboards
- Achievement points and badges
- Community engagement through challenges
- Real-time ranking updates

---

## 🎯 Role-Based Access

Academic Universe features **automatic role detection** based on institutional email domains:

| Email Domain | Role | Permissions | Dashboard |
|-------------|------|-------------|-----------|
| `@ug.sharda.ac.in` | 👨‍🎓 **STUDENT** | View Dashboard, View Own Marks | `/dashboard/student` |
| `@pg.sharda.ac.in` | 👨‍🎓 **STUDENT** | View Dashboard, View Own Marks | `/dashboard/student` |
| `@fa.sharda.ac.in` | 👨‍🏫 **FACULTY** | View Dashboard, Add/Edit Marks, View All Marks | `/dashboard/faculty` |
| Other domains | ❌ **DENIED** | Access Restricted | - |

> 🔒 Roles are permanently assigned based on email domain and cannot be manually edited.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 16)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Student    │  │   Faculty    │  │    Admin Panel   │  │
│  │  Dashboard   │  │  Dashboard   │  │                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Authentication (Firebase OAuth)              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↕ HTTP/REST API
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND (Express.js)                 │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐  │
│  │   Auth     │  │   Marks    │  │   Research Wing     │  │
│  │ Controller │  │ Controller │  │   AI Services       │  │
│  └────────────┘  └────────────┘  └─────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         RBAC Middleware + Multi-Tenant Isolation     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE & SERVICES                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   MongoDB    │  │   Firebase   │  │   Cloudinary     │  │
│  │  (Primary)   │  │   (Auth)     │  │   (Storage)      │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📚 Tech Stack

### Frontend
| Technology | Purpose | Version |
|------------|---------|---------|
| **Next.js** | Frontend Framework | 16.1.6 |
| **React** | UI Library | 19.2.3 |
| **TypeScript** | Type Safety | 5.7.3 |
| **Tailwind CSS** | Styling | Latest |
| **shadcn/ui** | UI Components | Latest |
| **Firebase** | Authentication | 12.9.0 |
| **Recharts** | Data Visualization | 2.15.0 |

### Backend
| Technology | Purpose | Version |
|------------|---------|---------|
| **Node.js** | Runtime Environment | Latest |
| **Express.js** | Backend Framework | 4.18.0 |
| **MongoDB** | Database | 7.0.0 |
| **Mongoose** | ODM | Latest |
| **Firebase Admin** | Token Verification | 13.7.0 |
| **JWT** | Authentication | 9.0.0 |
| **Google GenAI** | AI Services | 1.45.0 |
| **Cloudinary** | File Storage | 2.9.0 |
| **Winston** | Structured Logging | Latest |
| **Sentry** | Error Tracking & Monitoring | Latest |

### Monitoring & Observability
| Technology | Purpose |
|------------|---------|
| **Winston** | Structured logging with log rotation |
| **Sentry** | Full-stack error tracking & performance monitoring |
| **Request ID** | Unique request tracking for debugging |
| **Performance Monitor** | API response time tracking |

---

## 📊 Monitoring & Logging

Academic Universe includes comprehensive monitoring and logging for both frontend and backend.

### Frontend Monitoring (Sentry)
- ✅ Error Monitoring - Captures client and server errors
- ✅ Performance Tracing - Tracks page load and API response times
- ✅ Session Replay - Video-like reproduction of user sessions around errors
- ✅ Logging Integration - Sends application logs to Sentry

### Backend Logging (Winston + Sentry)
- ✅ Structured Logging - JSON format in production, colored output in development
- ✅ Request ID Tracking - Unique UUID for every request
- ✅ Performance Monitoring - Tracks API response times, method, URL, status code
- ✅ Automatic Log Rotation - Logs saved to `logs/` directory:
  - `error.log` - Error level logs only
  - `combined.log` - All logs
  - `exceptions.log` - Uncaught exceptions
  - `rejections.log` - Unhandled promise rejections

### Environment Variables
Add these to your backend `.env`:
```env
# Sentry Error Tracking (Optional)
SENTRY_DSN=your_sentry_dsn_here
```

### Testing the Setup
1. Visit `/sentry-example-page` to test frontend error tracking
2. Check `backend/logs/` directory for backend logs
3. View your Sentry dashboard: https://sharda-university-rq.sentry.io/

---

## 🛠️ Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (local or cloud instance) - [Download](https://www.mongodb.com/try/download/community)
- **Firebase Project** (for authentication) - [Console](https://console.firebase.google.com/)

### Installation

#### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/Academic-Universe.git
cd Academic-Universe
```

#### 2️⃣ Install Frontend Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

#### 3️⃣ Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

#### 4️⃣ Setup Environment Variables

**Frontend** - Create `.env.local` in root directory:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**Backend** - Create `.env` in `backend/` directory:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/academic_universe

# Authentication
JWT_SECRET=your-super-secret-key-generate-randomly
SESSION_SECRET=your-session-secret

# Server Configuration
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000

# Firebase Admin (Download from Firebase Console)
FIREBASE_ADMIN_CREDENTIALS=./path/to/serviceAccountKey.json

# AI Services
GOOGLE_GENAI_API_KEY=your_google_ai_key

# Cloud Storage
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# Sentry Error Tracking (Optional)
SENTRY_DSN=your_sentry_dsn_here
```

#### 5️⃣ Seed the Database

```bash
cd backend
npm run seed
```

This creates demo users:
- `superadmin@academicuniverse.com` (Super Admin) - Password: `SuperAdmin123`
- `admin@sharda.com` (Admin) - Password: `Admin123`
- `faculty@fa.sharda.ac.in` (Faculty) - Password: `Faculty123`
- `student@ug.sharda.ac.in` (Student) - Password: `Student123`

#### 6️⃣ Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

🎉 Your application is now running at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

---

## 🔐 Authentication & Authorization

### JWT Token Structure

```json
{
  "userId": "64f8a9b2c1d2e3f4g5h6i7j8",
  "email": "student@ug.sharda.ac.in",
  "organizationId": "org_123456",
  "roleId": "role_789012",
  "permissions": ["VIEW_DASHBOARD", "VIEW_OWN_MARKS"],
  "isSuperAdmin": false
}
```

### Available Permissions

| Permission | Category | Description |
|------------|----------|-------------|
| `VIEW_DASHBOARD` | GENERAL | Access dashboard |
| `ADD_MARKS` | MARKS | Add marks for students |
| `VIEW_MARKS` | MARKS | View student marks |
| `EDIT_MARKS` | MARKS | Edit existing marks |
| `DELETE_MARKS` | MARKS | Delete marks |
| `VIEW_ALL_MARKS` | MARKS | View all organization marks |
| `VIEW_REPORTS` | REPORTS | View analytics reports |
| `EDIT_PROFILE` | PROFILE | Edit own profile |
| `MANAGE_USERS` | ADMIN | Manage system users |
| `MANAGE_ROLES` | ADMIN | Manage roles & permissions |
| `ACCESS_RESEARCH` | RESEARCH | Access research tools |
| `USE_CHATBOT` | CHATBOT | Use AI chatbot |

### System Roles

| Role | Permissions | Usage |
|------|-------------|-------|
| **SUPER_ADMIN** | All permissions | Platform owner |
| **ADMIN** | All (within org) | Organization administrator |
| **FACULTY** | MARKS, REPORTS, PROFILE, CHATBOT | Teachers & professors |
| **STUDENT** | DASHBOARD, OWN_MARKS, RESEARCH, CHATBOT | Students |

---

## 📡 API Endpoints

### Authentication

```http
POST   /api/auth/login                  # Email/password login
POST   /api/auth/firebase-login         # Firebase OAuth login
POST   /api/auth/register               # Register new user
GET    /api/auth/me                     # Get current user info
```

### Dashboard

```http
GET    /api/dashboard/student           # Student dashboard metrics
GET    /api/dashboard/faculty           # Faculty dashboard metrics
```

### Marks Management

```http
POST   /api/marks                       # Add marks (requires ADD_MARKS)
GET    /api/marks/:studentId            # View student marks (requires VIEW_MARKS)
GET    /api/marks                       # View all marks (requires VIEW_ALL_MARKS)
PUT    /api/marks/:markId               # Update marks (requires EDIT_MARKS)
DELETE /api/marks/:markId               # Delete marks (requires DELETE_MARKS)
```

### Research Wing

```http
POST   /api/research/topic              # Generate research topics
POST   /api/research/outline            # Create paper outline
POST   /api/research/content            # Generate paper content
GET    /api/research/history            # Get research history
```

### Resume Builder

```http
GET    /api/resume/templates            # Get available templates
POST   /api/resume/build                # Build resume from template
```

### GitHub Integration

```http
GET    /api/github/profile              # Get GitHub profile
GET    /api/github/repos                # List repositories
GET    /api/github/projects             # Get integrated projects
POST   /api/github/connect              # Connect GitHub account
```

### Gmail Integration

```http
GET    /api/gmail/events                # Get calendar events
POST   /api/gmail/sync                  # Sync Gmail calendar
```

### Soft Skills

```http
POST   /api/soft-skills/analyze         # Analyze sentence fluency
GET    /api/soft-skills/history         # Get analysis history
```

### Mess Menu

```http
GET    /api/mess/menu                   # Get weekly mess menu
POST   /api/mess/menu                   # Update menu (admin only)
```

### Schedule Overlap

```http
POST   /api/overlap/check               # Check timetable conflicts
```

---

## 🎓 Student Dashboard Features

<div align="center">

| Feature | Description | Icon |
|---------|-------------|------|
| **Growth Hub** | IQ/EQ trend analysis & AI insights | 📈 |
| **GitHub Projects** | Code repository tracking | 💻 |
| **Mess Menu** | AI-powered weekly menu | 🍽️ |
| **Chatbot** | 24/7 emotional support | 🤖 |
| **Research Wing** | AI-assisted paper creation | 📝 |
| **Resume Builder** | Professional resume templates | 📄 |
| **Soft Skills** | Communication analysis | 🗣️ |
| **Code Arena** | Competitive coding platform | 🏆 |
| **Events** | Campus event management | 📅 |
| **Overlap Detection** | Schedule conflict finder | ⚠️ |
| **Faculty Cabin** | Virtual office hours | 👨‍🏫 |
| **Verified Records** | Achievement portfolio | ✅ |
| **Career Tools** | Professional development | 💼 |

</div>

---

## 👨‍🏫 Faculty Dashboard Features

<div align="center">

| Feature | Description | Icon |
|---------|-------------|------|
| **Student Management** | Performance analytics | 👥 |
| **Grade Management** | Add/edit student marks | 📊 |
| **Course Materials** | Upload learning resources | 📚 |
| **Curriculum Design** | Plan course structures | 📋 |
| **AI Assistant** | Administrative support | 🤖 |
| **Analytics** | Student progress insights | 📈 |
| **Research Wing** | Collaboration tools | 🔬 |
| **Resources** | Teaching aids | 🎯 |

</div>

---

## 🛡️ Security Features

- ✅ **Multi-tenant Data Isolation** - Complete separation between organizations
- ✅ **Role-Based Access Control (RBAC)** - Fine-grained permission system
- ✅ **JWT Authentication** - Secure token-based authentication
- ✅ **Password Hashing** - bcrypt with 10 salt rounds
- ✅ **Firebase Admin SDK** - Server-side token verification
- ✅ **CORS Protection** - Configured allowed origins
- ✅ **Encrypted Storage** - GitHub tokens encrypted at rest
- ✅ **Organization-Level Filtering** - Automatic query isolation

---

## 🏢 Multi-Tenancy

Academic Universe supports multiple organizations with **complete data isolation**:

- 🔒 Each organization has its own users, roles, and data
- 🚫 Strict access controls prevent cross-organization data leakage
- 🏗️ Shared infrastructure with isolated data access
- 📊 Organization-specific analytics and reporting

---

## 🧪 Testing

### Run Backend Tests

```bash
cd backend
npm test
```

### Run Type Checking

```bash
cd backend
npm run typecheck
```

### Run Linting

```bash
cd backend
npm run lint
```

---

## 🚀 Production Deployment

### Environment Variables (Production)

```env
# Frontend (.env.production.local)
NEXT_PUBLIC_API_BASE_URL=https://api.academicuniverse.com

# Backend (.env)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/academic_universe
JWT_SECRET=generate-a-strong-random-secret-here
NODE_ENV=production
PORT=8080
CORS_ORIGIN=https://academicuniverse.com
FIREBASE_ADMIN_CREDENTIALS=./serviceAccountKey.json
```

### Build for Production

**Frontend:**
```bash
npm run build
npm start
```

**Backend:**
```bash
cd backend
npm run build
npm start  # Runs dist/src/index.js
```

### Docker Deployment

```bash
# Build Docker image
docker build -t academic-universe .

# Run container
docker run -p 8080:8080 \
  --env-file .env \
  academic-universe
```

---

## 📂 Project Structure

```
Academic Universe/
├── 📁 app/                          # Next.js App Router
│   ├── admin/                       # Admin dashboard pages
│   ├── dashboard/                   # Role-based dashboards
│   │   ├── student/                # Student features
│   │   └── faculty/                # Faculty features
│   ├── login/                      # Authentication page
│   ├── layout.tsx                  # Root layout
│   └── page.tsx                    # Home page
│
├── 📁 backend/                      # Express.js Backend
│   ├── src/
│   │   ├── controllers/            # Request handlers (16 files)
│   │   ├── models/                 # Mongoose schemas (12 files)
│   │   ├── routes/                 # API routes (18 files)
│   │   ├── services/               # Business logic (17 files)
│   │   ├── middleware/             # Auth & validation
│   │   ├── config/                 # Database & Firebase
│   │   ├── utils/                  # Helper functions
│   │   └── index.ts                # Entry point
│   └── scripts/                    # Seeding & testing
│
├── 📁 components/                   # React Components
│   ├── ResearchWing/               # AI research assistant
│   ├── Resume/                     # Resume builder
│   ├── SoftSkills/                 # Communication trainer
│   ├── Mess/                       # Mess menu system
│   ├── chat/                       # AI chatbot interface
│   └── ui/                         # shadcn/ui components (50+)
│
├── 📁 lib/                          # Core utilities
│   ├── authContext.tsx             # Authentication context
│   ├── firebase.ts                 # Firebase initialization
│   └── mongodb.ts                  # MongoDB connection
│
└── 📁 utils/                        # API utilities
    └── api.ts                      # Request wrapper
```

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create your feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript strict mode
- Use ESLint and Prettier for code formatting
- Write tests for new features
- Update documentation accordingly
- Follow conventional commit messages

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support

- 📧 **Email**: [support@academicuniverse.com](mailto:support@academicuniverse.com)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/your-username/Academic-Universe/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/your-username/Academic-Universe/discussions)

---

## 🙏 Acknowledgments

- **Sharda University** for inspiring this project
- **Firebase** for authentication infrastructure
- **Google GenAI** for AI-powered features
- **MongoDB** for flexible document database
- **Next.js & Vercel** for seamless deployment
- **shadcn/ui** for beautiful component library
- **Sentry** for error tracking and monitoring
- **Winston** for structured logging

---

<div align="center">

**Academic Universe** - *Transforming Education Through AI-Powered Growth Tracking*

Built with ❤️ by [**Aashish Rajput**](https://github.com/your-username) and the Academic Universe Team

<p>
  <a href="https://github.com/your-username/Academic-Universe/stargazers">
    <img src="https://img.shields.io/github/stars/your-username/Academic-Universe?style=social" alt="GitHub stars" />
  </a>
  <a href="https://github.com/your-username/Academic-Universe/network/members">
    <img src="https://img.shields.io/github/forks/your-username/Academic-Universe?style=social" alt="GitHub forks" />
  </a>
</p>

⭐ **Star this repo if you found it helpful!**

</div>
