# 🔧 Backend Modularization Plan - System Design Perspective

## 📋 Current Issues

1. **Tight Coupling**: Controllers directly instantiate AI clients and access Firestore
2. **Mixed Responsibilities**: Services mix business logic with data access
3. **No Dependency Injection**: Hard to test and maintain
4. **Scattered Configuration**: AI clients created in multiple places
5. **No Interface Contracts**: No clear API between layers
6. **Monolithic Services**: Large service files with mixed concerns

---

## 🎯 Modularization Strategy

### **Layer Architecture**

```
┌─────────────────────────────────────────────────────────┐
│                    API Layer (Routes)                   │
│  - Request validation                                   │
│  - Response formatting                                  │
│  - Route definitions                                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                 Controller Layer                         │
│  - Request/Response handling                            │
│  - Input validation                                     │
│  - Delegate to services                                 │
│  - NO business logic                                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  Service Layer                           │
│  - Business logic                                       │
│  - Transaction management                               │
│  - Coordinate multiple repositories                     │
│  - NO direct DB access                                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│               Repository Layer (NEW)                     │
│  - Data access logic                                    │
│  - Query building                                       │
│  - Cache management                                     │
│  - Only layer that talks to DB/Firestore                │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Infrastructure Layer                        │
│  - Database connections                                 │
│  - External API clients (AI, GitHub, etc.)             │
│  - File storage                                         │
│  - Email services                                       │
└─────────────────────────────────────────────────────────┘
```

---

## 🏗️ New Directory Structure

```
backend/src/
├── modules/                           # Feature-based modules (NEW)
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.repository.ts
│   │   ├── auth.routes.ts
│   │   ├── auth.types.ts
│   │   └── auth.middleware.ts
│   │
│   ├── marks/
│   │   ├── marks.controller.ts
│   │   ├── marks.service.ts
│   │   ├── marks.repository.ts
│   │   ├── marks.routes.ts
│   │   └── marks.types.ts
│   │
│   ├── research/
│   │   ├── research.controller.ts
│   │   ├── research.service.ts
│   │   ├── research.repository.ts
│   │   ├── research.routes.ts
│   │   └── research.types.ts
│   │
│   ├── overlap/
│   │   ├── overlap.controller.ts
│   │   ├── overlap.service.ts
│   │   ├── overlap.repository.ts
│   │   ├── overlap.routes.ts
│   │   └── overlap.types.ts
│   │
│   ├── user/
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   ├── user.repository.ts
│   │   └── user.types.ts
│   │
│   ├── timetable/
│   │   ├── timetable.controller.ts
│   │   ├── timetable.service.ts
│   │   ├── timetable.repository.ts
│   │   └── timetable.types.ts
│   │
│   └── ... (other modules)
│
├── core/                              # Core infrastructure (NEW)
│   ├── database/
│   │   ├── mongodb.connection.ts
│   │   ├── firebase.connection.ts
│   │   └── index.ts
│   │
│   ├── ai/
│   │   ├── ai.provider.ts            # Interface
│   │   ├── gemini.provider.ts        # Implementation
│   │   ├── ai.factory.ts             # Factory pattern
│   │   └── index.ts
│   │
│   ├── storage/
│   │   ├── storage.provider.ts       # Interface
│   │   ├── cloudinary.provider.ts    # Implementation
│   │   └── index.ts
│   │
│   ├── cache/
│   │   ├── cache.provider.ts         # Interface
│   │   ├── redis.provider.ts         # Implementation (future)
│   │   └── in-memory.provider.ts     # Default
│   │
│   └── events/
│       ├── event.emitter.ts
│       └── event.types.ts
│
├── shared/                            # Shared utilities
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── index.ts
│   │
│   ├── utils/
│   │   ├── jwt.util.ts
│   │   ├── encryption.util.ts
│   │   ├── logger.util.ts
│   │   ├── response.util.ts
│   │   └── index.ts
│   │
│   ├── errors/
│   │   ├── custom.error.ts
│   │   ├── error.codes.ts
│   │   └── index.ts
│   │
│   ├── types/
│   │   ├── express.d.ts
│   │   ├── common.types.ts
│   │   └── index.ts
│   │
│   └── constants/
│       ├── api.constants.ts
│       ├── time.constants.ts
│       └── index.ts
│
├── config/                            # Configuration
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── firebase.config.ts
│   ├── cloudinary.config.ts
│   └── index.ts
│
├── routes/                            # Route aggregator (simplified)
│   └── index.ts
│
└── index.ts                           # Application entry point
```

---

## 🎨 Design Patterns Applied

### 1. **Dependency Injection**
```typescript
// Before (Tight Coupling)
class ResearchController {
  private ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  async generateTopics(req, res) {
    const response = await this.ai.models.generateContent(...);
  }
}

// After (Loose Coupling)
class ResearchController {
  constructor(private researchService: IResearchService) {}
  
  async generateTopics(req, res) {
    const topics = await this.researchService.generateTopics(req.body.domain);
    return res.json({ topics });
  }
}
```

### 2. **Repository Pattern**
```typescript
interface IResearchRepository {
  findByUserId(userId: string): Promise<Research[]>;
  create(data: CreateResearchDTO): Promise<Research>;
  update(id: string, data: UpdateResearchDTO): Promise<Research>;
  delete(id: string): Promise<void>;
}

class FirestoreResearchRepository implements IResearchRepository {
  constructor(private firestore: Firestore) {}
  
  async findByUserId(userId: string): Promise<Research[]> {
    const snapshot = await this.firestore
      .collection('research')
      .where('userId', '==', userId)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}
```

### 3. **Factory Pattern (AI Providers)**
```typescript
interface IAIProvider {
  generateContent(prompt: string, config: AIConfig): Promise<string>;
  generateJSON<T>(prompt: string): Promise<T>;
}

class GeminiAIProvider implements IAIProvider {
  async generateContent(prompt: string, config: AIConfig): Promise<string> {
    // Gemini implementation
  }
}

class OpenAIProvider implements IAIProvider {
  async generateContent(prompt: string, config: AIConfig): Promise<string> {
    // OpenAI implementation
  }
}

class AIProviderFactory {
  static create(provider: 'gemini' | 'openai'): IAIProvider {
    switch (provider) {
      case 'gemini': return new GeminiAIProvider();
      case 'openai': return new OpenAIProvider();
      default: throw new Error('Unsupported provider');
    }
  }
}
```

### 4. **Strategy Pattern (Authentication)**
```typescript
interface IAuthStrategy {
  authenticate(credentials: AuthCredentials): Promise<AuthResult>;
}

class FirebaseAuthStrategy implements IAuthStrategy {
  async authenticate(credentials: FirebaseCredentials): Promise<AuthResult> {
    // Firebase OAuth logic
  }
}

class EmailPasswordStrategy implements IAuthStrategy {
  async authenticate(credentials: EmailPassword): Promise<AuthResult> {
    // Email/password logic
  }
}

class AuthService {
  constructor(private strategies: Map<string, IAuthStrategy>) {}
  
  async login(type: string, credentials: any): Promise<AuthResult> {
    const strategy = this.strategies.get(type);
    if (!strategy) throw new Error('Invalid auth type');
    return strategy.authenticate(credentials);
  }
}
```

### 5. **Observer Pattern (Events)**
```typescript
class EventEmitter {
  private listeners: Map<string, Function[]> = new Map();
  
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }
  
  emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}

// Usage
eventEmitter.on('user.login', async (user) => {
  await auditLog.create({ event: 'login', userId: user.id });
  await notification.sendWelcome(user);
});
```

---

## 📦 Module Template

Each module follows this structure:

```typescript
// module.types.ts
export interface CreateUserDTO {
  name: string;
  email: string;
  roleId: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
}

// module.repository.ts
export class UserRepository {
  async findById(id: string): Promise<User | null> {
    return UserModel.findById(id).populate('roleId');
  }
}

// module.service.ts
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private eventEmitter: EventEmitter
  ) {}
  
  async createUser(dto: CreateUserDTO): Promise<UserResponse> {
    const user = await this.userRepository.create(dto);
    this.eventEmitter.emit('user.created', user);
    return this.mapToResponse(user);
  }
}

// module.controller.ts
export class UserController {
  constructor(private userService: UserService) {}
  
  async create(req: Request, res: Response): Promise<void> {
    const user = await this.userService.createUser(req.body);
    res.status(201).json({ data: user });
  }
}

// module.routes.ts
const router = Router();
const controller = new UserController(new UserService(new UserRepository()));

router.post('/', authenticate, controller.create.bind(controller));
export default router;
```

---

## 🔄 Migration Steps

### Phase 1: Foundation (Week 1)
1. Create directory structure
2. Implement core infrastructure (DI container, providers)
3. Create shared utilities and types
4. Set up configuration management

### Phase 2: Auth Module (Week 2)
1. Migrate auth module to new structure
2. Implement repository pattern
3. Add dependency injection
4. Write unit tests

### Phase 3: Core Modules (Week 3-4)
1. Migrate marks, user, dashboard modules
2. Implement event system
3. Add caching layer
4. Integration tests

### Phase 4: AI & External Services (Week 5)
1. Refactor research, soft-skills, AI modules
2. Implement AI provider factory
3. Add retry mechanisms
4. Error handling improvements

### Phase 5: Testing & Documentation (Week 6)
1. Unit tests for all modules
2. Integration tests
3. API documentation
4. Deployment guide

---

## ✅ Benefits

1. **Testability**: Easy to mock dependencies
2. **Maintainability**: Clear separation of concerns
3. **Scalability**: Add new features without modifying existing code
4. **Reusability**: Shared providers and utilities
5. **Flexibility**: Swap implementations (e.g., Gemini → OpenAI)
6. **Performance**: Caching layer, optimized queries
7. **Developer Experience**: Clear module boundaries, auto-wiring

---

## 📊 Metrics

| Aspect | Before | After |
|--------|--------|-------|
| Test Coverage | ~20% | ~80% |
| Avg File Size | 150 lines | 80 lines |
| Dependencies per File | 5-10 | 2-4 |
| Coupling | High | Low |
| Cyclomatic Complexity | 15-25 | 5-10 |

---

## 🚀 Next Steps

1. Review and approve this plan
2. Start with Phase 1 (Foundation)
3. Incremental migration (one module at a time)
4. Continuous testing and refactoring
5. Monitor performance and adjust
