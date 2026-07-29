# Table 2. Technology Stack Traceability

**Source Code to Research Artifact Mapping**

| Layer | Component | Technology | Source File(s) | Research Figure/Table |
|---|---|---|---|---|
| **Frontend** | Web Portal | Next.js 14, React, Tailwind CSS | `app/`, `components/` | Fig. 1 |
| **Frontend** | Type Safety | TypeScript, global.d.ts | `global.d.ts` | Sec. 9.1 |
| **API** | HTTP Server | Express.js | `backend/src/index.ts` | Fig. 1 |
| **API** | Authentication | JWT, Firebase Auth | `backend/src/middleware/auth.ts` | Fig. 4 |
| **API** | Rate Limiting | Express rate-limit | `backend/src/middleware/rateLimit.ts` | Sec. 10.1 |
| **API** | Request Tracking | requestId middleware | `backend/src/middleware/requestId.ts` | Sec. 10.1 |
| **Service** | Document Intelligence | DocumentIntelligenceService | `backend/src/modules/documentIntelligence/documentIntelligence.service.ts` | Fig. 2, Fig. 3 |
| **Service** | OCR Processing | Tesseract v5.0, PaddleOCR | `backend/src/services/ocr/OCRService.ts` | Fig. 2 |
| **Service** | AI Orchestration | FailoverAIProvider | `backend/src/core/ai/failover.provider.ts` | Fig. 2, Fig. 4 |
| **Service** | AI Provider (Primary) | Gemini 2.5 Flash | `backend/src/core/ai/gemini.provider.ts` | Fig. 2 |
| **Service** | AI Provider (Fallback) | OpenRouter (gpt-4o-mini) | `backend/src/core/ai/openrouter.provider.ts` | Fig. 2, Fig. 4 |
| **Service** | Canonical Write | CanonicalWriteService | `backend/src/__tests__/canonicalWrite.service.test.ts` | Fig. 4 |
| **Repository** | Data Access | Mongoose ODM | `backend/src/modules/documentIntelligence/documentIntelligence.repository.ts` | Fig. 4 |
| **Repository** | File Storage | GridFSProvider | `backend/src/storage/GridFSProvider.ts` | Fig. 4 |
| **Database** | Primary DB | MongoDB (UaipUpload, KnowledgeRecord, ReviewHistory) | `backend/src/models/` | Fig. 1, Fig. 4 |
| **Database** | Cache/Queue | Redis | `backend/src/shared/services/` | Fig. 1 |
| **Infrastructure** | Containerization | Docker | `Dockerfile` | Sec. 10.1 |
| **Infrastructure** | Hosting | Firebase, Vercel | `firebase.json`, `next.config.mjs` | Sec. 10.1 |
| **Testing** | Unit Tests | Jest | `jest.config.cjs` | Sec. 12.2 |
| **Testing** | Integration Tests | Jest + Supertest | `backend/src/__tests__/` | Sec. 12.2 |
| **Monitoring** | Error Tracking | Sentry | `sentry.server.config.ts`, `sentry.edge.config.ts` | Sec. 10.1 |
| **Logging** | Structured Logging | Winston/Pino | `backend/src/utils/logger.ts` | Sec. 10.1 |

> **Traceability**: Every module in the AU DIC system is traceable from the research paper's proposed methodology (Section 9) to the actual implementation. The Document Intelligence Controller (`documentIntelligence.controller.ts`) exposes the REST API endpoints documented in Section 11.
