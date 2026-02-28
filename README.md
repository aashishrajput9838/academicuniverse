# Academic Universe - The First AI-Powered Student Growth Ecosystem

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0.0-green?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Express.js](https://img.shields.io/badge/Express.js-4.18.0-gray?logo=express&logoColor=white)](https://expressjs.com/)
[![Firebase](https://img.shields.io/badge/Firebase-12.9.0-yellow?logo=firebase&logoColor=white)](https://firebase.google.com/)

**Beyond Marks & Attendance: The First AI Ecosystem that Understands Your Growth**

[Demo](#) • [Documentation](#) • [API Reference](#) • [Contributing](#)

</div>

## 🌟 Overview

Academic Universe is a revolutionary educational platform that transforms traditional academic evaluation by incorporating holistic student development tracking. Our AI-powered ecosystem goes beyond conventional metrics like grades and attendance, focusing on comprehensive growth through IQ/EQ assessments, verified credentials, and personalized AI support systems.

## 🚀 Key Features

### 1. **Verified Record System**
- Centralized, trusted profile for Faculty and Recruiters
- Every achievement, certification, and milestone verified by faculty
- Eliminates unreliable Google Forms and scattered records

### 2. **Holistic Growth Engine**
- Weekly IQ & EQ assessments
- AI-powered growth degradation alerts
- Personalized recommendations based on performance trends
- Stress and burnout detection

### 3. **AI Support Systems**
- **Emotional Intelligence Chatbot**: 24/7 support for mental wellness
- **Research Assistant**: AI-powered publication support and suggestions
- **Personalized Recommendations**: Tailored advice based on individual progress

### 4. **Competitive Arena**
- Integration with major coding platforms (LeetCode, Codeforces, GitHub)
- Bug bounty challenges with rewards
- Progress tracking across multiple platforms
- Growth-based rather than just grade-based competition

### 5. **Gamification & Rankings**
- Growth-based university leaderboards
- Achievement points and badges
- Community engagement through challenges
- Real-time ranking updates

## 🏗️ Architecture

### Frontend (Next.js 16)
- **Framework**: Next.js 16.1.6 with App Router
- **Language**: TypeScript 5.7.3
- **Styling**: Tailwind CSS with shadcn/ui components
- **Authentication**: Firebase OAuth (Google Sign-In)
- **State Management**: React Context API

### Backend (Node.js/Express)
- **Runtime**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with embedded permissions
- **Security**: bcrypt password hashing, multi-tenant isolation
- **Architecture**: Multi-tenant SaaS with RBAC (Role-Based Access Control)

### Security Features
- Multi-tenant data isolation
- Role-based access control with fine-grained permissions
- JWT authentication with secure token handling
- Password hashing with bcrypt
- Organization-level data separation

## 📊 Tech Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| Next.js | Frontend Framework | 16.1.6 |
| React | UI Library | 19.2.3 |
| TypeScript | Type Safety | 5.7.3 |
| Tailwind CSS | Styling | Latest |
| Firebase | Authentication | 12.9.0 |
| Express.js | Backend Framework | 4.18.0 |
| MongoDB | Database | 7.0.0 |
| Mongoose | ODM | Latest |
| JWT | Authentication | Latest |
| bcryptjs | Password Hashing | Latest |

## 🛠️ Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local installation or cloud instance)
- Firebase project (for authentication)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/Academic-Universe.git
cd Academic-Universe
```

2. **Install frontend dependencies**
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. **Navigate to backend and install dependencies**
```bash
cd backend
npm install
# or
yarn install
# or
pnpm install
```

4. **Setup environment variables**

Create `.env` file in the backend directory:
```env
MONGODB_URI=mongodb://localhost:27017/academic_universe
JWT_SECRET=your-super-secret-key-generate-randomly
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000
```

5. **Start the development servers**

First, start the backend:
```bash
cd backend
npm run dev
```

Then, in a separate terminal, start the frontend:
```bash
npm run dev
```

The application will be available at:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

## 🧪 Database Seeding

To populate the database with initial data (roles, permissions, demo users):

```bash
cd backend
npm run seed
```

This creates demo users:
- `superadmin@academicuniverse.com` (Super Admin)
- `admin@sharda.com` (Admin)
- `jane.smith@sharda.com` (Faculty)
- `john.doe@sharda.com` (Student)

All passwords: `Super/Admin/Faculty/Student123`

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

## 📚 API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/firebase-login` - Login with Firebase
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user info

### Marks Management
- `POST /api/marks` - Add marks (requires ADD_MARKS permission)
- `GET /api/marks/:studentId` - View student marks (requires VIEW_MARKS)
- `GET /api/marks` - View all marks (requires VIEW_ALL_MARKS)
- `PUT /api/marks/:markId` - Update marks (requires EDIT_MARKS)
- `DELETE /api/marks/:markId` - Delete marks (requires DELETE_MARKS)

## 🤖 AI-Powered Features

### Growth Analytics
- Weekly IQ/EQ assessments
- Trend analysis and visualization
- AI-powered insights and recommendations
- Burnout and stress detection

### Emotional Intelligence Chatbot
- 24/7 mental wellness support
- Conversational AI for emotional support
- Personalized coping strategies
- Integration with growth analytics

### Research Assistant
- AI-powered publication support
- Journal recommendations
- Paper structuring assistance
- Research methodology suggestions

## 🎯 Gamification Elements

### Leaderboards
- University-wide growth rankings
- Department-based competitions
- Real-time score updates
- Achievement badges and milestones

### Challenges
- Bug bounty programs
- Competitive coding events
- Research publication contests
- Community engagement activities

## 🏢 Multi-Tenancy

Academic Universe supports multiple organizations with complete data isolation:
- Each organization has its own users, roles, and data
- Strict data access controls prevent cross-organization data leakage
- Shared infrastructure with isolated data access

## 🚀 Production Deployment

### Environment Variables (Production)
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/academic_universe
JWT_SECRET=generate-a-strong-random-secret
NODE_ENV=production
PORT=8080
CORS_ORIGIN=https://academicuniverse.com
```

### Build for Production
```bash
# Frontend
npm run build

# Backend
cd backend
npm run build
npm start  # Runs dist/src/index.js
```

## 🧪 Testing

Run backend tests:
```bash
cd backend
npm test
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to:

- Report bugs
- Suggest features
- Submit pull requests
- Follow coding standards

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, please open an issue in the repository or contact us at [support@academicuniverse.com](mailto:support@academicuniverse.com).

---

<div align="center">

**Academic Universe** - Transforming Education Through AI-Powered Growth Tracking

*Built with ❤️ by the Academic Universe Team*

</div>