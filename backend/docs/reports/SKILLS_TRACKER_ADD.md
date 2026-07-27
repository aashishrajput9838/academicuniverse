# Architecture Design Document: Skills Tracker Module
**Sprint:** Sprint-001  
**Module ID:** `skills_tracker`  
**Status:** Draft — Awaiting Review & Approval  
**Author:** Kilo  
**Date:** 2026-07-18  

---

## 1. Executive Summary

The **Skills Tracker** module provides a canonical, multi-source skill profile for each student. It aggregates evidence from academic performance, certifications, GitHub activity, projects, research output, and AI inference into a unified skill graph with proficiency scores, provenance tracking, and temporal evolution.

**Non-goals for Sprint-001:**
- Do not modify the existing `CareerRecord` schema.
- Do not change the UAIP pipeline or KnowledgeDispatcher routing.
- Do not implement frontend components.
- Do not introduce database migrations that require downtime.

---

## 2. Problem Statement

Today, skills exist in silos:
- `CareerRecord.skills` is a flat `string[]` with no proficiency, evidence, or provenance.
- Academic subjects imply skills but there is no systematic mapping.
- GitHub languages and contributions are not normalized into comparable skill metrics.
- Certificates and projects mention skills in free-text fields.
- There is no way to answer: *"What is this student's proficiency in Python, and what is the evidence?"*

The Skills Tracker solves this by introducing:
1. A **canonical skill identity** model.
2. A **subject → skill mapping** layer.
3. **Multi-source evidence aggregation** with provenance.
4. A **read-optimized API** for frontend consumption.

---

## 3. Existing Architecture Patterns (Reference: Academic Records)

All new Skills Tracker code MUST follow the proven patterns established by the Academic Records module:

| Layer | Pattern | Example |
|-------|---------|---------|
| **Module Registry** | `moduleId`, `canonicalCollection`, `eventName`, `priority` | `backend/src/shared/application/module-registry/academicRecords.config.ts` |
| **Domain Model** | Mongoose schema with `organizationId`, `personId`, `sourceDocumentId`, `rawConfidence`, `timestamps` | `backend/src/models/AcademicRecord.ts` |
| **Repository** | `upsert(record, organizationId)` returning `{doc, action}`, `findByPerson(personId)` | `backend/src/shared/repositories/academicRecord.repository.ts` |
| **Service** | `merge(payload)` with `AuditEntry.create(...)` after upsert | `backend/src/shared/services/academicRecord.service.ts` |
| **Controller** | Express handler with `sendResponse` / `sendError`, `PersonResolver` for auth | `backend/src/controllers/academicRecordController.ts` |
| **Routes** | Router registered in `backend/src/routes/index.ts` with `authenticateUser`, `enforceOrgIsolation` | `backend/src/routes/academicRecordRoutes.ts` |
| **Events** | `EventBus.publish(UaipEvent, payload)` | `backend/src/events/EventBus.ts` |
| **Frontend API** | `fetch` with Bearer token, typed response DTOs | `app/dashboard/student/growth/growthApi.ts` |

**Key constraints:**
- All reads MUST be scoped by `organizationId` and `personId` (resolved via `PersonResolver`).
- All writes MUST create an `AuditEntry` for traceability.
- All APIs return the envelope: `{ success, statusCode, message, data }`.
- No service may call another service directly across module boundaries without going through the `EventBus` or a shared facade.

---

## 4. Domain Model Design

### 4.1 Canonical Collections

We introduce **three new MongoDB collections**:

#### 4.1.1 `SkillRecord`

The **aggregate root** for a student's skill. It is a lean identity projection derived from `SkillEvidence` documents. It stores **no raw evidence**; all provenance lives in `SkillEvidence`.

```typescript
interface ISkillRecord extends Document {
  organizationId: Types.ObjectId;   // tenant isolation
  personId: Types.ObjectId;         // canonical person

  // Ontology Identity
  skillId: string;                  // canonical ontology ID (e.g., "ESCO-1234", "ONET-5678")
  skillName: string;                // normalized display name (e.g., "Python")
  aliases: string[];                // alternative names / spellings (e.g., ["Python3", "py"])
  skillCategory: SkillCategory;     // enum: TECHNICAL | SOFT | DOMAIN_SPECIFIC | TOOL | LANGUAGE
  skillSubcategory?: string;        // optional finer grain (e.g., "Backend")

  // Derived Proficiency (computed from evidence)
  proficiencyLevel: ProficiencyLevel; // enum: BEGINNER | INTERMEDIATE | ADVANCED | EXPERT
  proficiencyScore: number;          // 0-100 composite score
  evidenceCount: number;             // number of linked SkillEvidence documents

  // Temporal (derived from evidence)
  firstSeenAt: Date;                 // earliest evidence createdAt
  lastVerifiedAt: Date;              // most recent evidence createdAt

  // Lifecycle
  status: SkillStatus;               // enum: ACTIVE | ARCHIVED | SUPERSEDED
  supersededBy?: Types.ObjectId;     // if this skill was merged into another

  createdAt: Date;
  updatedAt: Date;
}
```

**Justification for aggregate root pattern:**
- `SkillRecord` is the **read-optimized projection** used by all API responses and the Growth Hub.
- It is **rebuilt/refreshed** from `SkillEvidence` whenever evidence changes.
- Proficiency is **never stored as ground truth**; it is always derivable from evidence.
- This enables safe recalculation, audit replay, and ontology migration without rewriting student data.

#### 4.1.2 `SkillEvidence`

A **first-class collection** representing a single piece of skill evidence from one source.

```typescript
interface ISkillEvidence extends Document {
  organizationId: Types.ObjectId;
  personId: Types.ObjectId;           // canonical person
  sourceDocumentId?: Types.ObjectId;  // originating upload (if any)

  // Identity linkage
  skillId: string;                    // canonical ontology ID (matches SkillRecord.skillId)
  skillName: string;                  // display name at time of evidence creation
  aliases: string[];                  // aliases at time of evidence creation

  // Source classification
  primarySource: SkillSource;         // enum: ACADEMIC | CERTIFICATE | GITHUB | PROJECT | RESEARCH | AI_INFERENCE | MANUAL
  sourceType: string;                 // e.g., "TRANSCRIPT", "MARKSHEET", "GITHUB_REPO", "CERTIFICATE"
  sourceSubtype?: string;             // e.g., "semester_1", "language_commits"

  // Source-specific payload (structured, not free-text)
  payload: Record<string, any>;       // source-specific metadata (see §4.3)

  // Provenance
  confidence: number;                 // 0-1 confidence from extraction / inference
  extractedBy: string;                // e.g., "AI_V2", "FACULTY", "MANUAL"
  correlationId?: string;             // links to UAIP processing or upstream event

  // Temporal
  effectiveFrom: Date;                // when this evidence became valid
  effectiveTo?: Date;                 // when this evidence expired (null = still valid)

  // Lifecycle
  status: EvidenceStatus;             // enum: ACTIVE | SUPERSEDED | REVOKED
  supersededBy?: Types.ObjectId;      // newer evidence that replaced this one

  createdAt: Date;
  updatedAt: Date;
}
```

**Justification for first-class evidence collection:**
- Enables **full provenance**: every claim about a skill is traceable to a specific document, extraction, and confidence.
- Supports **temporal queries**: "What skills did this student have in Semester 3?"
- Enables **conflict resolution**: multiple evidence documents can coexist; the aggregate root decides which are active.
- Allows **ontology migration**: changing a `skillId` only requires updating `SkillRecord` and creating new `SkillEvidence`; historical evidence remains valid.

#### 4.1.3 `SubjectSkillMapping`

Maps academic subjects to skills with weights and validity windows.

```typescript
interface ISubjectSkillMapping extends Document {
  organizationId: Types.ObjectId;
  subjectCode: string;               // normalized subject code (e.g., "CSE101")
  subjectName: string;               // human-readable subject name

  // Ontology linkage
  skillId: string;                   // canonical ontology ID
  skillName: string;                 // target skill name (denormalized for query convenience)
  skillCategory: SkillCategory;      // enum

  // Mapping semantics
  relevanceWeight: number;           // 0.0-1.0: how strongly the subject implies the skill
  isCore: boolean;                   // true if this is a primary skill for the subject

  // Validity Window
  effectiveFrom: Date;               // when this mapping became valid for the curriculum
  effectiveTo?: Date;                // when this mapping expires (null = current)

  // Versioning
  version: number;                   // mapping schema version for future updates
  createdBy?: string;                // faculty/admin who created the mapping
  createdAt: Date;
  updatedAt: Date;
}
```

**Justification for validity windows:**
- Curricula change over time. A subject may stop teaching a skill or a new skill may be added.
- `effectiveFrom` / `effectiveTo` allow **time-travel queries**: "Which skills did CSE101 teach in 2023?"
- Enables smooth curriculum transitions without breaking historical student records.

### 4.2 Enumerations

```typescript
enum SkillCategory {
  TECHNICAL = 'TECHNICAL',
  SOFT = 'SOFT',
  DOMAIN_SPECIFIC = 'DOMAIN_SPECIFIC',
  TOOL = 'TOOL',
  LANGUAGE = 'LANGUAGE',
}

enum ProficiencyLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT',
}

enum SkillSource {
  ACADEMIC = 'ACADEMIC',
  CERTIFICATE = 'CERTIFICATE',
  GITHUB = 'GITHUB',
  PROJECT = 'PROJECT',
  RESEARCH = 'RESEARCH',
  AI_INFERENCE = 'AI_INFERENCE',
  MANUAL = 'MANUAL',
}

enum SkillStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  SUPERSEDED = 'SUPERSEDED',
}

enum EvidenceStatus {
  ACTIVE = 'ACTIVE',
  SUPERSEDED = 'SUPERSEDED',
  REVOKED = 'REVOKED',
}
```

### 4.3 Source-Specific Payloads (`SkillEvidence.payload`)

The `payload` field stores structured, source-specific evidence in a first-class collection:

| Source | Example `payload` |
|--------|------------------------|
| `ACADEMIC` / `TRANSCRIPT` | `{ subjectCode, subjectName, semester, year, grade, gradePoints, credits, gradingStatus }` |
| `ACADEMIC` / `MARKSHEET` | `{ subjectCode, subjectName, examType, marksObtained, maxMarks }` |
| `CERTIFICATE` | `{ certificateId, title, issuer, issuedDate, expiryDate? }` |
| `GITHUB` / `LANGUAGE` | `{ repository, language, bytesOfCode, contributionCount, analysisPeriod }` |
| `GITHUB` / `COMMIT` | `{ repository, commitCount, additions, deletions, period }` |
| `PROJECT` | `{ projectId, title, description, technologies: [], role, startDate, endDate? }` |
| `RESEARCH` | `{ paperId, title, journal, abstractSnippet, methodologies: [] }` |
| `AI_INFERENCE` | `{ inferredFrom: 'transcript' \| 'github' \| 'resume', modelVersion, reasoning, corroboratingSources }` |
| `MANUAL` | `{ addedBy, note, verificationMethod }` |

**Justification:**
- Each `SkillEvidence` document is immutable once created; corrections produce new evidence documents.
- The `payload` shape is intentionally flexible to accommodate new source types without schema migrations.
- `SkillRecord` remains a lightweight projection; all detail lives in evidence.

---

## 5. Proficiency Derivation Model

### 5.1 Proficiency as Derived State

**Proficiency is never stored as ground truth.** It is computed from the set of active `SkillEvidence` documents linked to a `SkillRecord`.

**Inputs to derivation:**
1. `confidence` of each active evidence (0-1)
2. `primarySource` weight (source authority factor)
3. `effectiveFrom` / `effectiveTo` (temporal validity)
4. Evidence age / recency decay (optional)

**Base score formula (per evidence):**

```
baseScore = confidence × sourceWeight × recencyFactor
```

Where:
- `sourceWeight` is a configurable constant per `SkillSource`:
  - `CERTIFICATE`: 1.0 (explicit credential)
  - `ACADEMIC`: 0.9 (graded performance)
  - `RESEARCH`: 0.85 (domain expertise)
  - `GITHUB`: 0.7 (activity proxy)
  - `PROJECT`: 0.8 (applied skill)
  - `MANUAL`: 0.95 (human-verified)
  - `AI_INFERENCE`: 0.6 (inferred, not confirmed)
- `recencyFactor` decays evidence value over time:
  - `effectiveFrom` within last 6 months: 1.0
  - 6-12 months: 0.9
  - 12-24 months: 0.75
  - >24 months: 0.6
  - `effectiveTo` passed: 0.0 (expired)

**Aggregation formula:**

```
aggregateScore = Σ(baseScore_i) / Σ(1 for each active evidence_i)
aggregateScore = clamp(aggregateScore × 100, 0, 100)
```

**ProficiencyLevel derivation:**
- `0-25`: BEGINNER
- `26-50`: INTERMEDIATE
- `51-75`: ADVANCED
- `76-100`: EXPERT

**Justification:**
- Proficiency reflects **current, corroborated skill state**, not a single extraction.
- Source weights encode domain knowledge about evidence reliability.
- Recency decay ensures skills rust if not reinforced.
- The formula is deterministic and auditable.

### 5.2 Aggregate Root Refresh

`SkillRecord` is refreshed via one of two triggers:

1. **Event-driven**: On `SkillEvidence` ingestion, publish `SkillUpdated` → `SkillProjectionService` recomputes the aggregate.
2. **Scheduled**: Nightly batch job rebuilds all stale `SkillRecord` projections.

The refresh operation:
1. Queries all `ACTIVE` `SkillEvidence` for `(organizationId, personId, skillId)`.
2. Computes `proficiencyScore` and `proficiencyLevel` using the formula above.
3. Computes `firstSeenAt`, `lastVerifiedAt`, `evidenceCount`.
4. Upserts the `SkillRecord` projection.
5. Publishes `SkillProfileRebuilt` if the projection changed significantly.

**Justification:**
- Separates write path (evidence ingestion, fast) from read path (aggregation, batched).
- Allows the API to serve `SkillRecord` without joining evidence at query time.
- Supports eventual consistency: the projection may lag seconds behind evidence ingestion.

---

## 6. Database Schema Design

### 6.1 Indexes

```javascript
// SkillRecord indexes
SkillRecordSchema.index(
  { organizationId: 1, personId: 1, skillId: 1 },
  { unique: true, name: 'uniqueSkillPerPerson' }
);
SkillRecordSchema.index(
  { organizationId: 1, personId: 1, proficiencyScore: -1 },
  { name: 'skillsByProficiency' }
);
SkillRecordSchema.index(
  { organizationId: 1, skillCategory: 1, proficiencyScore: -1 },
  { name: 'skillsByCategory' }
);
SkillRecordSchema.index(
  { organizationId: 1, skillId: 1 },
  { name: 'skillsByOntology' }
);

// SkillEvidence indexes
SkillEvidenceSchema.index(
  { organizationId: 1, personId: 1, skillId: 1, status: 1, createdAt: -1 },
  { name: 'evidenceByPersonSkill' }
);
SkillEvidenceSchema.index(
  { organizationId: 1, skillId: 1, primarySource: 1 },
  { name: 'evidenceByOntologySource' }
);
SkillEvidenceSchema.index(
  { organizationId: 1, personId: 1, sourceDocumentId: 1 },
  { sparse: true, name: 'evidenceByDocument' }
);

// SubjectSkillMapping indexes
SubjectSkillMappingSchema.index(
  { organizationId: 1, subjectCode: 1, skillId: 1 },
  { unique: true, name: 'uniqueSubjectSkillMapping' }
);
SubjectSkillMappingSchema.index(
  { organizationId: 1, effectiveFrom: 1, effectiveTo: 1 },
  { name: 'mappingValidityWindow' }
);
```

**Justification for `SkillRecord` unique index:**
- One canonical skill per person per ontology `skillId`. This is the aggregate root.
- A person cannot have two separate `SkillRecord` entries for the same `skillId`.

**Justification for `SkillEvidence` indexes:**
- Queries are typically scoped by person + skill + status.
- `sourceDocumentId` index supports deduplication and audit trails.
- No unique constraint on evidence: a person can have multiple active evidence documents for the same skill from different sources or times.

**Justification for `SubjectSkillMapping` validity window index:**
- Enables efficient temporal queries: "Which mappings were valid on 2023-08-15?"
- Supports curriculum analytics and historical transcript reprocessing.

---

## 5. Database Schema Design

### 5.1 Indexes

```javascript
// SkillRecord indexes
SkillRecordSchema.index(
  { organizationId: 1, personId: 1, skillName: 1, primarySource: 1 },
  { unique: true, name: 'uniqueSkillPerPersonSource' }
);
SkillRecordSchema.index(
  { organizationId: 1, personId: 1, proficiencyScore: -1 },
  { name: 'skillsByProficiency' }
);
SkillRecordSchema.index(
  { organizationId: 1, skillCategory: 1, proficiencyScore: -1 },
  { name: 'skillsByCategory' }
);

// SubjectSkillMapping indexes
SubjectSkillMappingSchema.index(
  { organizationId: 1, subjectCode: 1, skillName: 1 },
  { unique: true, name: 'uniqueSubjectSkillMapping' }
);
```

**Justification for unique index on `SkillRecord`:**
- Prevents duplicate skill entries for the same person from the same source.
- Allows the same skill to appear from **different** sources (e.g., `ACADEMIC` and `CERTIFICATE`), which is intentional for provenance.

**Justification for no unique index across all sources:**
- A student may have `Python` from both academic records and GitHub. These should merge into a single canonical skill with combined evidence, not be treated as duplicates.

---

## 7. Repository Layer Design

### 7.1 `SkillRecordRepository`

```typescript
export class SkillRecordRepository {
  async upsert(record: Partial<ISkillRecord>, organizationId: string): Promise<{doc: ISkillRecord; action: 'create' | 'update'}>;

  async findByPerson(personId: string, organizationId?: string): Promise<ISkillRecord[]>;

  async findByPersonAndCategory(personId: string, category: SkillCategory, organizationId?: string): Promise<ISkillRecord[]>;

  async findBySkill(personId: string, skillId: string, organizationId?: string): Promise<ISkillRecord | null>;

  async archiveSkill(skillId: string, organizationId: string): Promise<void>;

  async mergeSkills(
    sourceSkillId: string,
    targetSkillId: string,
    organizationId: string
  ): Promise<void>;
}
```

### 7.2 `SkillEvidenceRepository`

```typescript
export class SkillEvidenceRepository {
  async create(evidence: Partial<ISkillEvidence>, organizationId: string): Promise<ISkillEvidence>;

  async findActiveByPersonAndSkill(
    personId: string,
    skillId: string,
    organizationId?: string
  ): Promise<ISkillEvidence[]>;

  async findByPerson(personId: string, organizationId?: string): Promise<ISkillEvidence[]>;

  async findByDocument(sourceDocumentId: string, organizationId?: string): Promise<ISkillEvidence[]>;

  async supersede(evidenceId: string, supersededBy: string, organizationId: string): Promise<void>;

  async revoke(evidenceId: string, organizationId: string): Promise<void>;
}
```

### 7.3 `SubjectSkillMappingRepository`

```typescript
export class SubjectSkillMappingRepository {
  async upsert(mapping: Partial<ISubjectSkillMapping>, organizationId: string): Promise<{doc: ISubjectSkillMapping; action: 'create' | 'update'}>;

  async findBySubject(subjectCode: string, organizationId: string, atDate?: Date): Promise<ISubjectSkillMapping[]>;

  async findBySkill(skillId: string, organizationId: string): Promise<ISubjectSkillMapping[]>;

  async findValidMappings(organizationId: string, atDate?: Date): Promise<ISubjectSkillMapping[]>;

  async bulkUpsert(mappings: Partial<ISubjectSkillMapping>[], organizationId: string): Promise<void>;
}
```

**Justification for repository pattern:**
- Follows the exact pattern used by `AcademicRecordRepository`, `CertificateRecordRepository`, and `ExperienceRecordRepository`.
- Encapsulates all Mongoose queries, enabling future migration to a different persistence layer without touching services or controllers.
- `SkillEvidenceRepository` is a first-class repository because evidence has its own lifecycle (supersede, revoke, temporal queries).

---

## 8. Service Layer Design

### 8.1 `SkillEvidenceService`

```typescript
export class SkillEvidenceService {
  private evidenceRepo = new SkillEvidenceRepository();
  private skillRepo = new SkillRecordRepository();

  /**
   * Ingest a new piece of skill evidence.
   * Evidence is immutable; this creates a new document.
   * Does NOT modify SkillRecord directly — that is handled by the projection service.
   */
  async ingestEvidence(payload: {
    organizationId: string;
    personId: string;
    sourceDocumentId?: string;
    skillId: string;
    skillName: string;
    aliases: string[];
    primarySource: SkillSource;
    sourceType: string;
    sourceSubtype?: string;
    payload: Record<string, any>;
    confidence: number;
    extractedBy: string;
    correlationId?: string;
    effectiveFrom?: Date;
    effectiveTo?: Date;
  }): Promise<ISkillEvidence>;

  /**
   * Revoke an evidence document (e.g., if the source document was deleted).
   * Creates an audit trail and marks the evidence as REVOKED.
   */
  async revokeEvidence(evidenceId: string, organizationId: string, reason?: string): Promise<void>;
}
```

### 8.2 `SkillProjectionService`

```typescript
export class SkillProjectionService {
  private evidenceRepo = new SkillEvidenceRepository();
  private skillRepo = new SkillRecordRepository();

  /**
   * Rebuild the SkillRecord aggregate root for a person+skill.
   * This is the ONLY service that writes to SkillRecord.
   */
  async rebuildSkillRecord(organizationId: string, personId: string, skillId: string): Promise<ISkillRecord>;

  /**
   * Rebuild all SkillRecord projections for a person.
   * Triggered after bulk evidence ingestion or nightly batch.
   */
  async rebuildAllSkillRecords(organizationId: string, personId: string): Promise<void>;

  /**
   * Compute proficiency from a set of active evidence documents.
   * Pure function — no side effects.
   */
  computeProficiency(evidence: ISkillEvidence[]): {
    score: number;
    level: ProficiencyLevel;
    firstSeenAt: Date;
    lastVerifiedAt: Date;
  };
}
```

### 8.3 `SubjectSkillMappingService`

```typescript
export class SubjectSkillMappingService {
  private mappingRepo = new SubjectSkillMappingRepository();

  async upsertMapping(payload: {
    organizationId: string;
    subjectCode: string;
    subjectName: string;
    skillId: string;
    skillName: string;
    skillCategory: SkillCategory;
    relevanceWeight: number;
    isCore: boolean;
    effectiveFrom: Date;
    effectiveTo?: Date;
    version?: number;
    createdBy?: string;
  }): Promise<ISubjectSkillMapping>;

  async getMappingsForSubject(subjectCode: string, organizationId: string, atDate?: Date): Promise<ISubjectSkillMapping[]>;

  async getMappingsForSkill(skillId: string, organizationId: string): Promise<ISubjectSkillMapping[]>;
}
```

### 8.4 Proficiency Derivation Algorithm

The `SkillProjectionService.computeProficiency()` method implements the algorithm defined in §5.1:

```typescript
private SOURCE_WEIGHTS: Record<SkillSource, number> = {
  [SkillSource.CERTIFICATE]: 1.0,
  [SkillSource.ACADEMIC]: 0.9,
  [SkillSource.RESEARCH]: 0.85,
  [SkillSource.PROJECT]: 0.8,
  [SkillSource.GITHUB]: 0.7,
  [SkillSource.MANUAL]: 0.95,
  [SkillSource.AI_INFERENCE]: 0.6,
};

private RECENCY_WEIGHTS = [
  { maxAgeMs: 6 * 30 * 24 * 60 * 60 * 1000, factor: 1.0 },  // 0-6 months
  { maxAgeMs: 12 * 30 * 24 * 60 * 60 * 1000, factor: 0.9 }, // 6-12 months
  { maxAgeMs: 24 * 30 * 24 * 60 * 60 * 1000, factor: 0.75 }, // 12-24 months
  { maxAgeMs: Infinity, factor: 0.6 },                       // >24 months
];

computeProficiency(evidence: ISkillEvidence[]): ProficiencyResult {
  const now = Date.now();
  let weightedSum = 0;
  let weightTotal = 0;
  let firstSeen: Date | undefined;
  let lastVerified: Date | undefined;

  for (const e of evidence) {
    if (e.status !== 'ACTIVE') continue;
    if (e.effectiveTo && new Date(e.effectiveTo).getTime() < now) continue;

    const ageMs = now - new Date(e.effectiveFrom).getTime();
    const recency = this.getRecencyFactor(ageMs);
    const sourceWeight = this.SOURCE_WEIGHTS[e.primarySource] ?? 0.5;
    const confidence = Math.max(0, Math.min(1, e.confidence));

    const weight = confidence * sourceWeight * recency;
    weightedSum += weight;
    activeCount++;

    const effectiveFrom = new Date(e.effectiveFrom);
    if (!firstSeen || effectiveFrom < firstSeen) firstSeen = effectiveFrom;
    if (!lastVerified || effectiveFrom > lastVerified) lastVerified = effectiveFrom;
  }

  const rawScore = activeCount > 0 ? (weightedSum / activeCount) * 100 : 0;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  const level = this.scoreToLevel(score);

  return {
    score,
    level,
    firstSeenAt: firstSeen ?? new Date(0),
    lastVerifiedAt: lastVerified ?? new Date(0),
    evidenceCount: activeCount,
  };
}
```

**Justification:**
- `SkillEvidenceService` handles only evidence ingestion (appends).
- `SkillProjectionService` handles only derivation (reads evidence, writes projection).
- This separation prevents circular dependencies and makes each service independently testable.
- The proficiency algorithm is a pure function on evidence, making it auditable and deterministic.

### 8.1 Projection Write Pattern and Invariants

`SkillProjectionService` is the **only** component authorized to write `SkillRecord` projections. This is implemented via the `SkillRecordRepository.rebuildProjection()` method, which encapsulates all MongoDB writes for projections.

**Invariants:**
1. `SkillRecord` proficiency fields (`proficiencyScore`, `proficiencyLevel`, `evidenceCount`, `firstSeenAt`, `lastVerifiedAt`) are **always** derived from `SkillEvidence` via `computeProficiency()`.
2. No service other than `SkillProjectionService` may call `SkillRecordRepository.rebuildProjection()`.
3. `SkillRecordRepository.rebuildProjection()` accepts a `Partial<ISkillRecord>` containing projection data plus identity fields, and performs the create-or-update logic.
4. All `SkillRecord` writes are scoped by `organizationId` and `personId` to prevent cross-tenant contamination.
5. `rebuildAllSkillRecords(organizationId, personId)` operates **strictly within** the provided organization. It queries evidence via `evidenceRepo.findByPerson(personId, organizationId)`, ensuring no cross-org evidence leaks into the projection.

**CQRS Rationale:**
While the codebase does not adopt full CQRS, the Skills Tracker module uses a **lightweight CQRS pattern** for projections:
- **Write side (command):** `SkillProjectionService` receives evidence changes and updates the `SkillRecord` projection.
- **Read side (query):** All read operations use the pre-computed `SkillRecord` projection, avoiding live joins with `SkillEvidence`.
- This separation is justified because proficiency is an expensive aggregate calculation that should not be recomputed on every read.
- The repository layer remains the sole MongoDB access point; `SkillProjectionService` calls `SkillRecordRepository.rebuildProjection()` rather than accessing the Mongoose model directly.

---

## 9. REST API Contract

All routes follow the existing convention:
- Base path: `/api/skills`
- Middleware: `authenticateUser`, `enforceOrgIsolation`
- Response envelope: `{ success, statusCode, message, data }`

### 8.1 `GET /api/skills/me`

Returns the authenticated user's complete skill profile.

**Request:**
- Headers: `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Skill profile retrieved",
  "data": {
    "profileId": "person-123",
    "generatedAt": "2026-07-18T16:30:00.000Z",
    "skills": [
      {
        "id": "skill-001",
        "skillId": "ESCO-1234",
        "skillName": "Python",
        "aliases": ["Python3", "py"],
        "skillCategory": "TECHNICAL",
        "skillSubcategory": "Backend",
        "proficiencyLevel": "EXPERT",
        "proficiencyScore": 92,
        "evidenceCount": 4,
        "firstSeenAt": "2023-08-15",
        "lastVerifiedAt": "2024-05-20",
        "status": "ACTIVE",
        "createdAt": "2024-01-10T10:00:00.000Z",
        "updatedAt": "2024-05-20T14:00:00.000Z"
      }
    ],
    "categories": {
      "TECHNICAL": { "count": 12, "averageScore": 78 },
      "SOFT": { "count": 6, "averageScore": 82 }
    },
    "subjectMappings": [
      {
        "subjectCode": "CSE101",
        "subjectName": "Intro to CS",
        "effectiveFrom": "2022-01-01",
        "effectiveTo": null,
        "mappedSkills": [
          { "skillId": "ESCO-1234", "skillName": "Python", "relevanceWeight": 0.9, "isCore": true },
          { "skillId": "ESCO-5678", "skillName": "Algorithms", "relevanceWeight": 0.8, "isCore": true }
        ]
      }
    ]
  }
}
```

### 8.2 `GET /api/skills/me/:skillId/evidence`

Returns the evidence trail for a specific skill.

**Request:**
- Headers: `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Skill evidence retrieved",
  "data": {
    "skillId": "ESCO-1234",
    "skillName": "Python",
    "evidence": [
      {
        "id": "ev-001",
        "primarySource": "ACADEMIC",
        "sourceType": "TRANSCRIPT",
        "sourceSubtype": "semester_1",
        "payload": {
          "subjectCode": "CSE301",
          "subjectName": "Advanced Programming",
          "grade": "A",
          "gradePoints": 9
        },
        "confidence": 0.95,
        "extractedBy": "AI_V2",
        "effectiveFrom": "2023-08-15",
        "effectiveTo": null,
        "status": "ACTIVE",
        "createdAt": "2024-01-10T10:00:00.000Z"
      }
    ]
  }
}
```

### 8.3 `GET /api/skills/me/summary`

Returns aggregated skill metrics for dashboards.

**Response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Skill summary retrieved",
  "data": {
    "totalSkills": 24,
    "categories": {
      "TECHNICAL": 12,
      "SOFT": 6,
      "LANGUAGE": 3,
      "TOOL": 3
    },
    "topSkills": [
      { "skillName": "Python", "proficiencyScore": 92 },
      { "skillName": "JavaScript", "proficiencyScore": 85 }
    ],
    "skillGaps": [
      { "skillName": "Kubernetes", "proficiencyScore": 15 }
    ]
  }
}
```

### 8.3 `POST /api/skills/me/ingest` (Internal / AI Use)

Accepts skill evidence from the UAIP pipeline or AI inference engine. Creates a `SkillEvidence` document and triggers projection refresh.

**Request:**
```json
{
  "skillId": "ESCO-1234",
  "skillName": "Python",
  "aliases": ["Python3", "py"],
  "skillCategory": "TECHNICAL",
  "skillSubcategory": "Backend",
  "primarySource": "AI_INFERENCE",
  "sourceType": "GITHUB_REPO",
  "sourceSubtype": "language_commits",
  "payload": {
    "inferredFrom": "github",
    "modelVersion": "v2.1",
    "reasoning": "Detected Python in 12 repositories with 450+ contributions",
    "repository": "academicuniverse/frontend",
    "contributionCount": 142
  },
  "confidence": 0.82,
  "extractedBy": "AI_V2",
  "sourceDocumentId": "doc-456",
  "correlationId": "corr-789",
  "effectiveFrom": "2024-05-20",
  "effectiveTo": null
}
```

**Response (201):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Skill evidence ingested",
  "data": { "evidenceId": "ev-001", "skillId": "ESCO-1234", "action": "create" }
}
```

### 8.4 `POST /api/skills/mappings` (Faculty / Admin)

Creates or updates a subject-to-skill mapping with validity window.

**Request:**
```json
{
  "subjectCode": "CSE101",
  "subjectName": "Intro to CS",
  "skillId": "ESCO-1234",
  "skillName": "Python",
  "skillCategory": "TECHNICAL",
  "relevanceWeight": 0.9,
  "isCore": true,
  "effectiveFrom": "2022-01-01",
  "effectiveTo": null,
  "version": 1
}
```

**Response (201):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Subject-skill mapping created",
  "data": { "mappingId": "mapping-001", "action": "create" }
}
```

### 8.5 `GET /api/skills/mappings/:subjectCode`

Returns all skill mappings for a subject.

**Response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Mappings retrieved",
  "data": {
    "subjectCode": "CSE101",
    "subjectName": "Intro to CS",
    "mappings": [
      {
        "skillId": "ESCO-1234",
        "skillName": "Python",
        "skillCategory": "TECHNICAL",
        "relevanceWeight": 0.9,
        "isCore": true,
        "effectiveFrom": "2022-01-01",
        "effectiveTo": null,
        "version": 1
      }
    ]
  }
}
```

---

## 9. Subject → Skill Mapping Architecture

### 9.1 Mapping Sources

Subject-to-skill mappings can originate from three sources, in order of precedence:

1. **Faculty-curated** (highest precedence): Explicit mappings created via `POST /api/skills/mappings`.
2. **AI-inferred** (medium precedence): Automatically extracted from syllabus documents, curriculum PDFs, or transcript analysis.
3. **Default ontology** (lowest precedence): A seed dataset of common subject→skill relationships bundled with the deployment.

### 9.2 Validity Windows and Temporal Queries

Every `SubjectSkillMapping` has `effectiveFrom` and `effectiveTo` fields. This enables:

- **Current curriculum view:** `findValidMappings(organizationId, atDate: now())`
- **Historical transcript reprocessing:** When reprocessing a transcript from 2023, use `findBySubject(code, org, atDate: 2023-08-15)` to get the mappings valid at that time.
- **Curriculum evolution tracking:** Query how mappings changed across semesters.

**Conflict resolution for overlapping windows:**
- If two mappings for the same `(subjectCode, skillId)` overlap, the one with higher `version` wins.
- If versions are equal, the one with later `effectiveFrom` wins.

### 9.3 Mapping Application Flow

```
Document Upload (Transcript / Marksheet)
    ↓
UAIP Pipeline → KnowledgeRecord
    ↓
KnowledgeDispatcher.dispatch({ domain: 'academic' })
    ↓
AcademicRecordService.merge()  →  persists subject record
    ↓
EventBus.publish(UaipEvent.AcademicRecordUpdated, payload)
    ↓
SkillsEventListener (new)
    ↓
1. Determine semester date from transcript payload
2. Lookup SubjectSkillMapping for subjectCode at that date
3. For each active mapping, call SkillEvidenceService.ingestEvidence({
       primarySource: ACADEMIC,
       sourceType: 'TRANSCRIPT',
       payload: { subjectCode, grade, semester, year, ... }
   })
4. Publish SkillUpdated event → SkillProjectionService rebuilds SkillRecord
```

**Justification for event-driven mapping:**
- Keeps the Academic Records module **decoupled** from Skills Tracker.
- Allows Skills Tracker to react to updates from **any** upstream module (Certificates, GitHub, Projects) without the upstream module knowing about skills.
- Mirrors the existing `GrowthProjectionUpdated` event pattern.

### 9.4 Evidence Conflict Resolution

When multiple `SkillEvidence` documents exist for the same `(personId, skillId)`:

| Scenario | Resolution |
|----------|-----------|
| Same source, higher confidence | Newer evidence supersedes older (both remain ACTIVE; projection weights both) |
| Different source, same skill | Both remain ACTIVE; projection aggregates all active evidence |
| Explicit supersede | Call `SkillEvidenceService.supersede(oldId, newId)` — old evidence status → `SUPERSEDED` |
| Revocation | Call `SkillEvidenceService.revoke(evidenceId)` — evidence status → `REVOKED` |
| Expired effectiveTo | Automatically excluded from projection via `effectiveTo` check |
| Duplicate skill names (e.g., "Python" vs "Python3") | Resolved via ontology `skillId` + `aliases`; both names map to same `skillId` |

---

## 10. Extensibility for External Sources

### 10.1 GitHub Integration

**Mechanism:**
- Existing `GithubRecord` stores `languages` and `contributions` as `Mixed`.
- A new **GitHub skill extractor** reads `GithubRecord` and emits `SkillEvidence` events.

**Mapping logic:**
- Repository language → `SkillCategory.LANGUAGE` (e.g., "TypeScript")
- Repository topic/tags → `SkillCategory.TECHNICAL` (e.g., "kubernetes", "react")
- Contribution frequency → proficiency score modifier

**Example `payload`:**
```json
{
  "repository": "academicuniverse/frontend",
  "language": "TypeScript",
  "contributionType": "commits",
  "contributionCount": 142,
  "analysisPeriod": "2024-01-01 to 2024-06-30"
}
```

### 10.2 Projects Integration

**Mechanism:**
- A new `ProjectRecord` model (or reuse of existing project data in `CareerRecord.projects`) is parsed.
- AI extracts technologies and roles.

**Mapping logic:**
- Project technologies → `SkillCategory.TECHNICAL` or `SkillCategory.TOOL`
- Project role → soft skills (e.g., "Team Lead" → Leadership)

### 10.3 Certificates Integration

**Mechanism:**
- `CertificateRecord` already exists with `title`, `issuer`, `issuedDate`.
- A certificate title often implies skills (e.g., "AWS Certified Solutions Architect" → Cloud, AWS, DevOps).

**Mapping logic:**
- Certificate title keyword matching + AI inference → skill list
- Issuer authority → confidence boost (e.g., AWS certs have high confidence for AWS skills)

### 10.4 Research Integration

**Mechanism:**
- `ResearchPaperRecord` stores `title`, `abstract`, `journal`.
- AI extracts methodologies, tools, and domains.

**Mapping logic:**
- Abstract text → `SkillCategory.DOMAIN_SPECIFIC` (e.g., "Natural Language Processing")
- Tools/methods mentioned → `SkillCategory.TECHNICAL` (e.g., "PyTorch", "Transformer Architecture")

### 10.5 AI Inference Engine

**Mechanism:**
- A dedicated `SkillInferenceService` analyzes all available data sources and suggests skills.
- Runs on a schedule (e.g., nightly) and on-demand after document uploads.

**Inference sources:**
1. Transcript grade patterns → skill proficiency (e.g., consistent A in ML courses → ML skill)
2. GitHub language mix → technical skill distribution
3. Certificate titles → explicit skill claims
4. Research abstracts → domain expertise

**Output:**
- New `SkillEvidence` documents with `primarySource: AI_INFERENCE`
- `SkillProjectionService` rebuilds the corresponding `SkillRecord` projection
- Confidence scores based on cross-source corroboration

---

## 11. Integration Points

### 11.1 UAIP Pipeline

The Skills Tracker does **not** modify the UAIP pipeline. Instead, it listens to events:

```
EventBus
  ├── UaipEvent.AcademicRecordUpdated  → SkillsEventListener
  ├── UaipEvent.CertificateApproved    → SkillsEventListener
  ├── UaipEvent.GithubUpdated          → SkillsEventListener
  ├── UaipEvent.ResearchUpdated        → SkillsEventListener
  └── UaipEvent.CanonicalUpdated       → SkillsEventListener
```

**Justification:**
- Zero coupling between UAIP and Skills Tracker.
- Skills Tracker can be deployed, scaled, or removed without touching the pipeline.
- Follows the existing event-driven architecture used by `GrowthProjectionService`.

### 11.2 Growth Hub

The `GrowthProjectionService` will be extended with a `skillsMetrics` section:

```typescript
interface GrowthProjection {
  // ... existing fields ...
  metrics: {
    // ... existing metrics ...
    skillsTotalCount: GrowthMetric<number>;
    skillsTopCategory: GrowthMetric<string>;
    skillsAverageProficiency: GrowthMetric<number>;
  };
  sources: {
    // ... existing sources ...
    skills: GrowthSourceState;
  };
}
```

**Justification:**
- Growth Hub is the single pane of glass for student development.
- Skills metrics belong here alongside academic, GitHub, and certificate metrics.
- No new API endpoints needed — skills data flows into the existing `/api/growth/me` projection.

### 11.3 EventBus Events

New events published by Skills Tracker:

| Event | Payload | Subscribers |
|-------|---------|-------------|
| `SkillUpdated` | `{ personId, skillId, skillName, proficiencyScore, primarySource }` | Growth Hub, Resume Builder, Career Profile, Notification Service |
| `SkillProfileRebuilt` | `{ personId, totalSkills, generatedAt }` | Frontend polling fallback, Analytics |

---

## 12. Security & Multi-tenancy

### 12.1 Tenant Isolation

- All `SkillRecord` and `SubjectSkillMapping` queries MUST include `organizationId`.
- The repository layer enforces this by accepting `organizationId` as a required parameter for all queries.
- Indexes are compound with `organizationId` as the leading field.

### 12.2 Authorization

| Endpoint | Required Permission |
|----------|---------------------|
| `GET /api/skills/me` | `VIEW_OWN_SKILLS` (implicit for authenticated users) |
| `GET /api/skills/me/summary` | `VIEW_OWN_SKILLS` |
| `POST /api/skills/me/ingest` | `INGEST_SKILLS` (internal service token or AI service) |
| `POST /api/skills/mappings` | `MANAGE_SKILL_MAPPINGS` (faculty/admin) |
| `GET /api/skills/mappings/:subjectCode` | `VIEW_SKILL_MAPPINGS` (faculty/admin) |

**Justification:**
- Students can view their own skills.
- Faculty can manage curriculum mappings.
- AI services ingest skills via internal token, not user credentials.

### 12.3 Data Privacy

- `SkillEvidence.payload` may contain source-specific data (grades, repository URLs, etc.).
- The API must filter `SkillEvidence.payload` based on requester role:
  - Student: sees own evidence in full.
  - Faculty: sees summarized evidence for students they supervise.
  - Admin: sees full evidence.
- `SkillRecord` projections are always returned in full to the owning student.

---

## 13. Migration & Backward Compatibility

### 13.1 Zero-Database-Migration Guarantee

- `CareerRecord` is **not modified**. Existing `skills: string[]` field remains untouched.
- New collections (`SkillRecord`, `SkillEvidence`, `SubjectSkillMapping`) are created fresh.
- No existing indexes are altered.

### 13.2 Backward-Compatible API

- Existing `CareerRecord` endpoints remain unchanged.
- Skills Tracker endpoints are additive (`/api/skills/*`).
- Frontend can gradually migrate from `CareerRecord.skills` to `/api/skills/me`.

### 13.3 Data Seeding Strategy

1. **Phase 1 (Sprint-001):** Deploy empty collections and API. Frontend shows empty state.
2. **Phase 2 (Sprint-002):** Run a one-time backfill job that:
   - Reads all `AcademicRecord` entries.
   - Looks up `SubjectSkillMapping` for each subject (using validity window at transcript date).
   - Creates initial `SkillEvidence` documents with `primarySource: ACADEMIC`.
   - `SkillProjectionService` rebuilds `SkillRecord` projections from evidence.
3. **Phase 3 (Sprint-003+):** Enable GitHub, Certificate, and AI inference extractors.

---

## 14. Testing Strategy

### 14.1 Unit Tests

| Component | Test Focus |
|-----------|-----------|
| `SkillEvidenceService.ingestEvidence` | Evidence creation, audit entry, event publication |
| `SkillProjectionService.computeProficiency` | Weighted formula, recency decay, clamping, level derivation, expiry exclusion |
| `SkillProjectionService.rebuildSkillRecord` | Aggregate refresh from evidence set |
| `SubjectSkillMappingService` | Validity window queries, upsert uniqueness, bulk operations |
| `SkillRecordRepository` | Query scoping by `organizationId`, index usage |
| `SkillEvidenceRepository` | Active evidence queries, supersede/revoke lifecycle |

### 14.2 Integration Tests

| Scenario | Expected Outcome |
|----------|-----------------|
| Upload transcript → AcademicRecord created → SkillsUpdated event → SkillEvidence created → SkillRecord rebuilt | End-to-end skill ingestion from academic source |
| Multiple evidence sources for same skill → Proficiency derived | Score reflects weighted average of all active evidence |
| Evidence expires (effectiveTo passed) → Proficiency recomputed | Score drops accordingly |
| Student requests `/api/skills/me` with no evidence | Returns empty profile with `totalSkills: 0` |
| Faculty creates subject-skill mapping with validity window → Student transcript processed | Mapped skills appear in student profile |
| Ontology alias "Python3" ingested → mapped to existing "Python" `skillId` | Evidence linked to correct canonical skill |

### 14.3 Contract Tests

- API response schemas validated against TypeScript interfaces.
- Event payload schemas validated against `UaipEventPayload` extensions.
- `SkillEvidence` payload schemas validated per `sourceType`.

---

## 15. Future Extension Points

| Extension | Description | Trigger |
|-----------|-------------|---------|
| **Skill Graph / Prerequisites** | Model skill dependencies (e.g., "Python" is prerequisite for "Django") | Sprint-002 |
| **Skill Recommendations** | Suggest courses/certificates based on skill gaps | Sprint-003 |
| **Peer Benchmarking** | Compare student skills against cohort averages (anonymized) | Sprint-004 |
| **Employer Matching** | Map skills to job descriptions for placement | Sprint-005 |
| **Skill Validation** | Allow external verifiers (employers, faculty) to endorse skills | Sprint-006 |
| **Skill Decay** | Automatically reduce proficiency for skills not reinforced over time | Sprint-007 |
| **Ontology Service** | External skill taxonomy integration (ESCO, O*NET) | Sprint-008 |

---

## 16. File Structure (Proposed)

```
backend/src/
├── models/
│   ├── SkillRecord.ts
│   ├── SkillEvidence.ts
│   └── SubjectSkillMapping.ts
├── shared/
│   ├── repositories/
│   │   ├── skillRecord.repository.ts
│   │   ├── skillEvidence.repository.ts
│   │   └── subjectSkillMapping.repository.ts
│   ├── services/
│   │   ├── skillEvidence.service.ts
│   │   ├── skillProjection.service.ts
│   │   ├── subjectSkillMapping.service.ts
│   │   └── skillInference.service.ts
│   ├── events/
│   │   └── skillsEventListener.ts
│   └── application/
│       └── module-registry/
│           └── skillsTracker.config.ts   ← update canonicalCollection
├── controllers/
│   └── skillsController.ts
├── routes/
│   └── skillsRoutes.ts
└── modules/
    └── skills/
        └── skillProjection.service.ts    ← Growth Hub integration
```

**Justification for structure:**
- Models live in `backend/src/models/` (consistent with all other domain models).
- Repositories and services live in `backend/src/shared/` (consistent with Academic Records, Certificates, Experiences).
- `SkillEvidence` is a first-class model because it has its own lifecycle, indexes, and repository.
- `SkillProjectionService` is separated from `SkillEvidenceService` to enforce the aggregate-root pattern.
- Controllers and routes follow the existing pattern.
- Module-specific projection service lives in `backend/src/modules/skills/` (consistent with `growthProjection.service.ts`).

---

## 17. Open Questions (For Review)

1. Should `SkillRecord` support **versioning** like `KnowledgeRecord`? (Proposed: No for Sprint-001; add in Sprint-006 if skill validation requires it.)
2. Should proficiency scores be **rounded** to integers in the API, or expose decimals? (Proposed: integers for UI simplicity.)
3. Should the `SubjectSkillMapping` be **organization-scoped** or **global**? (Proposed: organization-scoped, as curricula vary by institution.)
4. Should AI-inferred skills be **auto-archived** if contradicted by later evidence? (Proposed: No; mark as `SUPERSEDED` only on explicit merge.)
5. Should `SkillEvidence.payload` have a per-sourceType JSON schema validation? (Proposed: lightweight validation in Sprint-001; strict Zod/Yup schemas in Sprint-002.)
6. Should the nightly projection rebuild be **incremental** (per person) or **full** (all persons)? (Proposed: incremental per person in Sprint-001; full rebuild with change-data-capture in Sprint-004.)

---

## 18. Approval Checklist

- [x] Domain model reviewed and approved (aggregate root + evidence pattern)
- [x] Database schema and indexes approved
- [x] API contract reviewed by frontend team
- [x] Event integration plan approved
- [x] Growth Hub integration impact assessed
- [x] Security / authorization model approved
- [x] Testing strategy approved
- [x] No breaking changes to existing modules confirmed

**Next Step:** Upon approval, implement Sprint-001 tasks in the following order:
1. Mongoose models + indexes (`SkillRecord`, `SkillEvidence`, `SubjectSkillMapping`)
2. Repositories (`SkillRecordRepository`, `SkillEvidenceRepository`, `SubjectSkillMappingRepository`)
3. Services (`SkillEvidenceService`, `SkillProjectionService`, `SubjectSkillMappingService`)
4. Event listener (`SkillsEventListener`)
5. Controller + routes (`SkillsController`, `SkillsRoutes`)
6. Growth Hub projection integration
7. Unit + integration tests
