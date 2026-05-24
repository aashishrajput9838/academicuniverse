# 🏗️ Modular Architecture - Visual Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Frontend)                          │
│                     Next.js 16 App / Mobile App                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/REST API
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        EXPRESS.JS SERVER                             │
│                         (index.ts)                                   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    MIDDLEWARE LAYER                           │  │
│  │  • CORS • Body Parser • Session • Request Logging           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                    │                                │
│                                    ▼                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    ROUTE AGGREGATOR                           │  │
│  │                    (routes/index.ts)                          │  │
│  │                                                               │  │
│  │  /auth  /marks  /research  /github  /resume  /timetable...   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                    │                                │
│                                    ▼                                │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
┌──────────────────────┐  ┌────────────────┐  ┌──────────────────────┐
│   OLD ARCHITECTURE   │  │  NEW MODULES   │  │   OLD ARCHITECTURE   │
│   (Being Migrated)   │  │  (Modular)     │  │   (Being Migrated)   │
│                      │  │                │  │                      │
│  • auth/             │  │  ✅ research/  │  │  • marks/            │
│  • marks/            │  │                │  │  • github/           │
│  • users/            │  │  ⏳ Pending:   │  │  • timetable/        │
│  • timetable/        │  │  • auth        │  │  • resume/           │
│  • github/           │  │  • marks       │  │  • soft-skills       │
│  • resume/           │  │  • user        │  │  • gmail             │
│  • overlap/          │  │                │  │                      │
└──────────────────────┘  └────────────────┘  └──────────────────────┘
                                │
                                ▼
                ┌───────────────────────────────────┐
                │    EXAMPLE: RESEARCH MODULE       │
                │                                   │
                │  routes/research.routes.ts        │
                │  ↓ (Dependency Injection)         │
                │  controller/research.controller.ts│
                │  ↓ (Delegates)                    │
                │  service/research.service.ts      │
                │  ↓ (Uses)                         │
                │  repository/research.repository.ts│
                │  ↓ (Accesses)                     │
                └───────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
        ┌───────────────────┐   ┌──────────────────────┐
        │  CORE SERVICES    │   │   SHARED UTILITIES   │
        │                   │   │                      │
        │  core/ai/         │   │  shared/utils/       │
        │  • IAIProvider    │   │  • Logger            │
        │  • GeminiProvider │   │  • sendResponse      │
        │  • AI Factory     │   │  • sendError         │
        │                   │   │                      │
        │  (Future:)        │   │  shared/middleware/  │
        │  • ICacheProvider │   │  • authenticateUser  │
        │  • RedisProvider  │   │  • authorize         │
        │  • IEmailProvider │   │                      │
        │  • SendGrid       │   │  shared/errors/      │
        └───────────────────┘   │  • AuthenticationError
                                │  • ValidationError   │
                                │  • NotFoundError     │
                                └──────────────────────┘
                                            │
                                            ▼
                    ┌───────────────────────────────────┐
                    │        DATA ACCESS LAYER           │
                    │                                    │
                    │  ┌─────────────┐  ┌────────────┐ │
                    │  │  MongoDB    │  │  Firestore │ │
                    │  │  (Primary)  │  │  (Research,│ │
                    │  │             │  │   Config)  │ │
                    │  │  • Users    │  │            │ │
                    │  │  • Marks    │  │  • Research│ │
                    │  │  • Roles    │  │  • Logs    │ │
                    │  │  • Sections │  │            │ │
                    │  └─────────────┘  └────────────┘ │
                    └───────────────────────────────────┘
                                            │
                                            ▼
                    ┌───────────────────────────────────┐
                    │     EXTERNAL SERVICES (APIs)      │
                    │                                    │
                    │  • Google Gemini AI               │
                    │  • Firebase Auth                  │
                    │  • GitHub API                     │
                    │  • Gmail API                      │
                    │  • Cloudinary (Storage)           │
                    └───────────────────────────────────┘
```

---

## Request Flow Example: Generate Research Topics

```
1. Client Request
   POST /api/research/topics
   Body: { "domain": "Artificial Intelligence" }
   Header: Authorization: Bearer <JWT_TOKEN>
   
   └──────────▼──────────┘

2. Express Middleware
   • CORS Check
   • Body Parser
   • authenticateUser (JWT Verification)
   
   └──────────▼──────────┘

3. Routes Layer (research.routes.ts)
   Router matches: POST /topics
   Calls: controller.generateTopics(req, res)
   
   └──────────▼──────────┘

4. Controller Layer (research.controller.ts)
   • Validates: req.body.domain exists
   • Calls: service.generateTopics({ domain })
   • Returns: sendResponse(res, 200, { topics })
   
   └──────────▼──────────┘

5. Service Layer (research.service.ts)
   • Business Logic:
     - Creates AI prompt
     - Calls: aiProvider.generateJSON<string[]>(prompt)
     - Logs activity
   • Returns: string[] (topics)
   
   └──────────▼──────────┘

6. Core AI Provider (gemini.provider.ts)
   • Implementation of IAIProvider
   • Calls: GoogleGenAI.models.generateContent()
   • Parses JSON response
   • Returns: string[]
   
   └──────────▼──────────┘

7. External API (Google Gemini)
   • Processes prompt
   • Generates 5 research topics
   • Returns JSON response
   
   └──────────▼──────────┘

8. Response Flow (Reverse)
   Gemini → AI Provider → Service → Controller → Routes → Client
   
   Response:
   {
     "success": true,
     "message": "Topics generated successfully",
     "data": {
       "topics": [
         "Topic 1: Machine Learning in Healthcare",
         "Topic 2: AI Ethics in Autonomous Vehicles",
         "Topic 3: Natural Language Processing for Education",
         "Topic 4: Computer Vision in Agriculture",
         "Topic 5: Reinforcement Learning for Robotics"
       ]
     },
     "timestamp": "2024-01-15T10:30:00.000Z"
   }
```

---

## Dependency Injection Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Dependency Wiring                         │
│                   (research.routes.ts)                       │
└─────────────────────────────────────────────────────────────┘

Step 1: Create/Get AI Provider
┌──────────────────────────────────────────┐
│ const aiProvider = AIProviderFactory     │
│   .getInstance()                         │
│   .getDefaultProvider();                 │
│                                          │
│ Returns: GeminiAIProvider instance       │
│ Implements: IAIProvider interface        │
└────────────────┬─────────────────────────┘
                 │
                 ▼
Step 2: Create Repository
┌──────────────────────────────────────────┐
│ const repository = new ResearchRepository│
│   ();                                    │
│                                          │
│ Dependencies: Firebase Firestore         │
│ (from config)                            │
└────────────────┬─────────────────────────┘
                 │
                 ▼
Step 3: Create Service (Inject Dependencies)
┌──────────────────────────────────────────┐
│ const service = new ResearchService(     │
│   aiProvider,        ← Injected          │
│   repository         ← Injected          │
│ );                                       │
│                                          │
│ Service can now use both!                │
└────────────────┬─────────────────────────┘
                 │
                 ▼
Step 4: Create Controller (Inject Service)
┌──────────────────────────────────────────┐
│ const controller = new ResearchController│
│   (service);         ← Injected          │
│                                          │
│ Controller can now use service!          │
└────────────────┬─────────────────────────┘
                 │
                 ▼
Step 5: Wire to Routes
┌──────────────────────────────────────────┐
│ router.post('/topics',                   │
│   authenticateUser,                      │
│   controller.generateTopics              │
│ );                                       │
│                                          │
│ Route is now fully functional!           │
└──────────────────────────────────────────┘
```

---

## Module Structure Template

```
┌─────────────────────────────────────────────────────────────┐
│                    MODULE TEMPLATE                           │
│                  (Use for all modules)                       │
└─────────────────────────────────────────────────────────────┘

module-name/
│
├── 📄 module-name.types.ts
│   └── Contains:
│       • DTOs (Data Transfer Objects)
│       • Response interfaces
│       • Domain models
│       • Enum definitions
│
├── 📄 module-name.repository.ts
│   └── Contains:
│       • Database CRUD operations
│       • Query builders
│       • Data mapping
│       • NO business logic
│       • ONLY data access
│
├── 📄 module-name.service.ts
│   └── Contains:
│       • Business logic
│       • Data validation
│       • Complex calculations
│       • Cross-entity operations
│       • Event emissions
│       • NO direct DB access
│       • Uses repository
│
├── 📄 module-name.controller.ts
│   └── Contains:
│       • HTTP request handlers
│       • Input validation (basic)
│       • Response formatting
│       • Error catching
│       • NO business logic
│       • Delegates to service
│
├── 📄 module-name.routes.ts
│   └── Contains:
│       • Express Router setup
│       • Dependency injection
│       • Middleware application
│       • Route definitions
│       • Endpoint documentation
│
└── 📄 index.ts
    └── Contains:
        • Module exports
        • Public API
        • Re-exports for convenience
```

---

## Data Flow Patterns

### Pattern 1: Simple CRUD
```
Client → Controller → Service → Repository → Database
         (HTTP)      (Logic)    (Data)       (Storage)
         
Example: Create Mark, Update Profile
```

### Pattern 2: External API Integration
```
Client → Controller → Service → Core Provider → External API
         (HTTP)      (Logic)    (Interface)    (3rd Party)
         
Example: Generate Topics (AI), Fetch GitHub Repos
```

### Pattern 3: Multi-Repository Operation
```
Client → Controller → Service → Repository 1 → Database 1
         (HTTP)      (Logic)    ↘ Repository 2 → Database 2
         
Example: Save Research (Firestore) + Log Action (MongoDB)
```

### Pattern 4: Event-Driven
```
Client → Controller → Service → Repository
         (HTTP)      (Logic) ↘  (Data)
                      ↓
                 Event Emitter → Other Services
                 
Example: User Login → Audit Log + Notification + Analytics
```

---

## Testing Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    TESTING PYRAMID                           │
└─────────────────────────────────────────────────────────────┘

              ╱        ╲
             ╱  E2E     ╲    ← 10% (Integration tests)
            ╱  Tests     ╲
           ╱──────────────╲
          ╱   Integration  ╲  ← 20% (Service tests)
         ╱     Tests        ╲
        ╱────────────────────╲
       ╱    Unit Tests        ╲  ← 70% (Controller, Service, Repository)
      ╱                        ╲
     ╱──────────────────────────╲

Unit Tests (Fast, Isolated):
• Test each layer independently
• Mock dependencies
• Example: Test service with mocked repository

Integration Tests (Medium speed):
• Test layer interactions
• Use test database
• Example: Test service with real repository

E2E Tests (Slow, Complete):
• Test full request flow
• Use real services
• Example: Test complete API endpoint
```

---

## Migration Roadmap

```
Phase 1: Foundation ✅ COMPLETED
├── Core AI Provider System
├── Shared Utilities
├── Shared Middleware
└── Research Module (Example)

Phase 2: Core Modules ⏳ IN PROGRESS
├── Auth Module (High Priority)
├── User Module
├── Marks Module
└── Dashboard Module

Phase 3: Feature Modules ⏳ PENDING
├── Timetable Module
├── Overlap Module
├── Resume Module
├── Soft Skills Module
└── Mess Module

Phase 4: Integration Modules ⏳ PENDING
├── GitHub Module
├── Gmail Module
├── Export Module
└── AI Module (General)

Phase 5: Infrastructure ⏳ PENDING
├── Event System
├── Caching Layer (Redis)
├── Validation Middleware
└── Rate Limiting

Phase 6: Testing & Docs ⏳ PENDING
├── Unit Tests (70%+ coverage)
├── Integration Tests
├── API Documentation (Swagger)
└── Deployment Guide
```

---

## 🎯 Key Takeaways

1. **Research Module is Your Template** - Copy this pattern for all modules
2. **Dependency Injection is Key** - Makes code testable and maintainable
3. **Interfaces Over Implementations** - Allows easy swapping of services
4. **Single Responsibility** - Each layer does ONE thing well
5. **Shared Code Goes in `/shared`** - Avoid duplication
6. **Infrastructure Goes in `/core`** - Centralized providers

---

**🚀 Your backend now follows enterprise architecture patterns!**
