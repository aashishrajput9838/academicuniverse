# 🎓 Academic Universe - Codebase Index

> [!NOTE]
> This document serves as a high-level index of the Academic Universe codebase. It outlines the project's architecture, key directories, technologies, and the ongoing modularization effort in the backend.

## 🏗️ System Architecture Overview

Academic Universe is a high-performance, multi-tenant SaaS platform built for holistic student development. 

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Radix UI.
- **Backend**: Node.js, Express 5, TypeScript. Currently undergoing a migration to a modular (DDD/DI) architecture.
- **Databases**: 
  - **MongoDB (Primary)**: Stores Users, Organizations, Marks, Resumes.
  - **Firestore (Real-time)**: Stores Detected Events, Logs, Research state.
- **AI Integration**: Google Gemini API (gemini-2.5-flash) used for Chatbot, Research Wing, and Resume Building.
- **External Integrations**: GitHub (Coding Analytics), Gmail (Event Extraction via sync).

## 📁 Directory Structure & Index

### 1. Frontend (`/app`, `/components`, `/lib`)

The frontend follows the Next.js App Router paradigm.

*   **/app**: Contains the main routing logic and pages.
    *   `/app/admin`: Admin panel.
    *   `/app/dashboard/faculty`: Faculty dashboard.
    *   `/app/dashboard/student`: Student dashboard.
    *   `/app/api`: Next.js API routes (some proxying or frontend specific logic).
    *   `/app/login`: Authentication pages.
*   **/components**: Reusable React components.
    *   `/components/ui`: Radix UI based core UI components (buttons, dialogs, cards, etc.).
    *   `/components/chat`: Components for the AI Chatbot.
    *   `/components/ResearchWing`: Components for the AI Research assistant (Topic Generator, Content Writer, etc.).
    *   `/components/Resume`: Components for the AI Resume builder.
    *   `/components/SoftSkills`: Components for Soft Skills analysis.
*   **/lib**: Frontend utilities and models.
    *   `/lib/models`: Frontend representations of entities (User, ResearchProject, CodingStats, etc.).
    *   `/lib/AuthContext.tsx`: Firebase/Custom JWT authentication context.
    *   `/lib/firebase.ts`: Firebase client initialization.

### 2. Backend (`/backend/src`)

The backend is an Express application currently being migrated to a feature-based modular architecture.

*   **/backend/src/core**: Core infrastructure and providers.
    *   `/core/ai`: AI Provider factory and implementations (e.g., GeminiAIProvider).
*   **/backend/src/modules**: **(NEW)** Feature-based modules following Domain-Driven Design (DDD). Each module contains its own routes, controller, service, and repository.
    *   `/modules/research`: Fully modularized research feature.
    *   `/modules/ezone`: Ezone integration module.
*   **/backend/src/controllers**, **/services**, **/models**, **/routes**: **(LEGACY)** The old MVC architecture being migrated.
    *   *Controllers*: `authController`, `githubController`, `gmailController`, `marksController`, etc.
    *   *Services*: `authService`, `githubService`, `gmailSyncService`, `overlapService`, etc.
    *   *Models*: Mongoose schemas (`User.ts`, `Mark.ts`, `Organization.ts`, `Section.ts`, etc.).
*   **/backend/src/shared**: Shared utilities and middleware.
    *   `auth.ts` (Middleware for `authenticateUser` and `authorize`).

### 3. Key Concepts & Workflows

*   **Multi-Tenancy & RBAC**: Every user belongs to an organization (`organizationId`). Roles are automatically assigned based on email domains (e.g., `@ug.sharda.ac.in` -> STUDENT).
*   **Authentication Flow**: Uses Firebase Auth on the frontend to get a token, which is then verified by the backend. The backend issues a custom JWT with embedded permissions.
*   **Modular Backend Migration**: The backend is moving from a monolithic MVC pattern to a modular Controller-Service-Repository pattern with Dependency Injection. The `research` module is the reference implementation.
*   **AI Factory**: The backend uses an AI Factory pattern (`/core/ai`) to abstract the underlying AI model (currently Gemini), making it easy to swap models in the future.

## 📝 Key Documentation Files

For a deeper dive into specific areas, refer to these internal documents:

*   [README.md](file:///c:/github/academicuniverse.com/academicuniverse/README.md): Main project overview and setup instructions.
*   [AI_CONTEXT.txt](file:///c:/github/academicuniverse.com/academicuniverse/AI_CONTEXT.txt): Condensed technical context.
*   [ARCHITECTURE_DIAGRAM.md](file:///c:/github/academicuniverse.com/academicuniverse/backend/ARCHITECTURE_DIAGRAM.md): Visual representation of the backend architecture and request flows.
*   [MODULAR_ARCHITECTURE_GUIDE.md](file:///c:/github/academicuniverse.com/academicuniverse/backend/MODULAR_ARCHITECTURE_GUIDE.md): Guide on the new backend modular architecture.
*   [MODULARIZATION_PLAN.md](file:///c:/github/academicuniverse.com/academicuniverse/backend/MODULARIZATION_PLAN.md): The roadmap for migrating legacy backend code to the new modular structure.

---
*Index generated automatically based on codebase exploration.*
