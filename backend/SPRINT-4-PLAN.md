# Sprint 4 Plan
## Resume Parser — ResumeEntityExtractor (Stage 2)

**Sprint:** 4  
**Date:** 2026-07-24  
**Status:** PLANNING — Ready for Review  
**Architecture Baseline:** `RESUME-PARSER-ARCHITECTURE.md` v1.4  
**Commit Baseline:** `5905900` (Sprint 3 freeze)  
**Tag Baseline:** `v0.3.0`

---

## 1. Sprint Goal

Implement **resume entity extraction** by building `ResumeEntityExtractor`, Stage 2 of the resume-specific parsing pipeline. This service consumes section boundaries from Stage 1 and extracts structured entities from each section using heuristics first, then AI fallback.

**Outcome:** After Stage 1 detects sections, `ResumeClassificationEventListener` enqueues `ResumeEntityExtractorJob` through `KnowledgeQueueService`. The extractor returns typed entities with confidence scores and populates `ResumeParseResult.rawCandidateFields`.

---

## 2. Existing Code to Reuse

| Component | File | Reuse Strategy |
|-----------|------|--------------|
| `ResumeSectionDetector` | `src/services/resume/resumeSectionDetector.service.ts` | Stage 1 output: sections with boundaries |
| `KnowledgeDispatcher` | `src/shared/services/knowledgeDispatcher.service.ts` | Extend `case 'resume':` with `stage: 'entity_extraction'` handler |
| `ResumeParseResult` | `src/models/ResumeParseResult.ts` | Store extracted entities, strategy, counts |
| `FailoverAIProvider` | `src/core/ai/failover.provider.ts` | AI fallback for complex extraction |
| `IAIProvider` / `AIConfig` | `src/core/ai/ai.provider.ts` | Provider interface + config |
| `KnowledgeQueueService` | `src/shared/services/knowledgeQueue.service.ts` | Enqueue/dequeue `ResumeEntityExtractorJob` |
| `KnowledgeJobRepository` | `src/shared/repositories/knowledgeJob.repository.ts` | Create pending entity-extraction jobs |
| `EventBus` / `UaipEvent` | `src/events/EventBus.ts`, `src/events/UaipEvents.ts` | Publish `ResumeEntityExtracted` or `ResumeEntityExtractionFailed` |
| `AuditEntry` | `src/models/AuditEntry.ts` | Audit stage start/failure |
| `eventBus` | `src/events/EventBus.ts` | Publish stage outcome events |

---

## 3. Files to Create

| File | Purpose |
|------|---------|
| `src/models/ResumeEntity.ts` | Interfaces for extracted entities (Person, Experience, Education, Skill, Project, Certification, Achievement, Language) |
| `src/services/resume/resumeEntityExtractor.service.ts` | Stateless entity extraction service: heuristic rules + AI fallback. Returns `Entity[]` with confidence. |
| `src/__tests__/resumeEntityExtractor.service.test.ts` | Unit tests for entity extraction logic |

---

## 4. Files to Modify

| File | Changes |
|------|---------|
| `src/shared/services/knowledgeDispatcher.service.ts` | Implement `handleResumeEntityExtraction()` method; route `case 'entity_extraction'` in `switch(payload.stage)` |
| `src/events/UaipEvents.ts` | Add `ResumeEntityExtracted`, `ResumeEntityExtractionFailed` events |
| `backend/RESUME-PARSER-ARCHITECTURE.md` | Update changelog to v1.5 |

---

## 5. Public API Changes

**None.**

All changes are internal to the async pipeline. The existing endpoints remain unchanged:
- `POST /api/resume/parse-upload`
- `GET /api/resume/parse-status/:processingId`

---

## 6. Data Flow

```
[Async] Stage 1 completes:
  ResumeParseResult.rawCandidateFields.sections = [...]

[Async] KnowledgeQueueService dequeues ResumeEntityExtractorJob
  -> KnowledgeDispatcher case 'resume'
     -> switch(payload.stage)
        -> case 'entity_extraction': handleResumeEntityExtraction(params)
  -> handleResumeEntityExtraction():
     1. Idempotency check: ResumeParseResult.entitiesExtracted > 0 => return
     2. Read job payload:
        - processingId
        - sections: ResumeParseResult.rawCandidateFields.sections
        - rawContent (fallback if sections missing)
        - organizationId
     3. For each section:
        a. Apply heuristic extraction:
           - EXPERIENCE: job title, company, dates, bullets
           - EDUCATION: degree, institution, year, GPA
           - SKILLS: comma-separated tokens, grouped by category
           - PROJECTS: name, description, tech stack
           - CERTIFICATIONS: title, issuer, date
           - ACHIEVEMENTS: text extraction
           - LANGUAGES: language name + proficiency
           - SUMMARY: key phrases, years of experience
           - HEADER: name, email, phone, linkedin, github
        b. If heuristic confidence < threshold (0.5):
           Invoke AI fallback via FailoverAIProvider
           NOTE: AI fallback is inside the SAME attempt, not a queue retry
        c. Assign confidence per entity:
           - heuristic match: 0.7-0.9
           - AI fallback: 0.5-0.7
           - low-confidence: flag for manual review
     4. Update ResumeParseResult:
        - entitiesExtracted: <count>
        - entityExtractionStrategy: 'heuristic' | 'heuristic+ai' | 'ai-only'
        - rawCandidateFields: {
            ...existing,
            person: {...},
            experience: [...],
            education: [...],
            skills: [...],
            projects: [...],
            certifications: [...],
            achievements: [...],
            languages: [...]
          }
        - aiProviderUsed: provider name or 'none'
        - failedOver: boolean
     5. Publish ResumeEntityExtracted (success) or ResumeEntityExtractionFailed (failure)
     6. AuditEntry: stage started / failed
```

### Stage Routing Architecture (Permanent)

```
KnowledgeJob.payload.stage values:
  'section_detection'   -> ResumeSectionDetector       (Sprint 3)
  'entity_extraction'   -> ResumeEntityExtractor        (Sprint 4)
  'ai_enhancement'      -> ResumeAIEnhancer             (Sprint 5)
  'confidence_scoring'  -> ResumeConfidenceScorer       (Sprint 6)

KnowledgeDispatcher routes:
  case 'resume':
    switch (payload.stage) {
      case 'section_detection':  // Sprint 3 - DONE
      case 'entity_extraction':  // Sprint 4 - THIS SPRINT
      case 'ai_enhancement':     // Sprint 5
      case 'confidence_scoring': // Sprint 6
    }
```

---

## 6.1 Event Contracts

All resume-stage events use `UaipEventPayload` as the base interface. The following contracts are binding for Sprint 4 implementation and downstream consumers (Sprint 5, Sprint 6, Sprint 7).

### ResumeEntityExtracted

Published when Stage 2 completes successfully.

```ts
interface ResumeEntityExtractedPayload extends UaipEventPayload {
  processingId: string;
  entitiesExtracted: number;
  strategy: 'heuristic' | 'heuristic+ai' | 'ai-only';
  aiFallbackUsed: boolean;
  entityTypes: string[];        // e.g., ['person', 'experience', 'education', 'skill']
  confidenceSummary: {
    min: number;
    max: number;
    average: number;
    belowThreshold: number;     // count with confidence < 0.5
  };
  reviewStatus: 'AUTO_APPROVED' | 'PENDING_REVIEW' | 'NEEDS_REINDEX';
  timestamp: Date;
  correlationId?: string;
}
```

### ResumeEntityExtractionFailed

Published when Stage 2 fails after all retries or encounters a terminal error.

```ts
interface ResumeEntityExtractionFailedPayload extends UaipEventPayload {
  processingId: string;
  errorMessage: string;
  reason: 'no_sections' | 'ai_exhausted' | 'malformed_response' | 'unknown';
  timestamp: Date;
  correlationId?: string;
}
```

---

## 7. Entity Extraction Strategy

### 7.1 Entity Types

```ts
export interface ResumeEntity {
  type: 'person' | 'experience' | 'education' | 'skill' | 'project' | 'certification' | 'achievement' | 'language';
  confidence: number;          // 0.0 - 1.0
  sourceSection: string;       // section title where entity was found
  data: Record<string, any>;   // entity-specific fields
  extractedBy: 'heuristic' | 'ai';
  reviewStatus: 'auto' | 'pending' | 'rejected';
}
```

### 7.2 Entity Schemas

**Person:**
```ts
{
  name: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  summary?: string;
}
```

**Experience:**
```ts
{
  title: string;
  company: string;
  startDate?: string;
  endDate?: string;
  current: boolean;
  description: string;
  bullets: string[];
  confidence: number;
}
```

**Education:**
```ts
{
  degree: string;
  institution: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
  confidence: number;
}
```

**Skill:**
```ts
{
  name: string;
  category?: string;       // e.g., "programming", "framework", "tool"
  proficiency?: string;    // e.g., "advanced", "intermediate"
  confidence: number;
}
```

**Project:**
```ts
{
  name: string;
  description: string;
  techStack: string[];
  url?: string;
  confidence: number;
}
```

**Certification:**
```ts
{
  title: string;
  issuer: string;
  issueDate?: string;
  expiryDate?: string;
  credentialId?: string;
  confidence: number;
}
```

**Achievement:**
```ts
{
  title: string;
  description: string;
  date?: string;
  confidence: number;
}
```

**Language:**
```ts
{
  name: string;
  proficiency?: string;    // e.g., "native", "fluent", "basic"
  confidence: number;
}
```

### 7.2.1 Entity → Canonical Model Mapping

This table validates that every `ResumeEntity.data` field aligns with an existing canonical model field. Sprint 7 DIC integration and canonical writes depend on this compatibility.

| Entity Type | Canonical Destination | Required Fields Match? | Notes |
|-------------|----------------------|------------------------|-------|
| `person` | `Person` | ✅ `name`, `email`, `phone`, `linkedin`, `github` | `summary` stored in `rawCandidateFields` only; no canonical `summary` field exists |
| `experience` | `ExperienceRecord` | ✅ `title`, `company`, `startDate`, `endDate`, `description` | `current` mapped to `endDate === null` in canonical |
| `education` | `AcademicRecord` | ✅ `degree`, `institution`, `startDate`, `endDate` | `gpa` stored in `rawCandidateFields` only; `credits` computed later |
| `skill` | `SkillEvidence` + `SkillAlias` + `CanonicalSkill` | ✅ `name` | `category` and `proficiency` stored in `SkillEvidence.rawCandidateFields` |
| `project` | `CareerRecord` | ✅ `name`, `description` | `techStack` stored in `rawCandidateFields` only |
| `certification` | `CertificateRecord` | ✅ `title`, `issuer`, `issueDate`, `expiryDate` | `credentialId` stored in `rawCandidateFields` only |
| `achievement` | *None* | N/A | No canonical model exists. Stored in `rawCandidateFields.achievements[]` only. Future sprint may introduce `AchievementRecord`. |
| `language` | *None* | N/A | No canonical model exists. Stored in `rawCandidateFields.languages[]` only. Future sprint may introduce `LanguageRecord`. |

**Validation rule:** If Sprint 4 implementation adds a field to any `ResumeEntity.data` shape that does not appear in the corresponding canonical model, it must be documented here as `rawCandidateFields`-only.

### 7.3 Heuristic Rules

1. **Person extraction** (from HEADER section):
   - Line with email regex → email
   - Line with phone regex → phone
   - Line with linkedin.com → linkedin
   - Line with github.com → github
   - First non-empty line → name

2. **Experience extraction** (from EXPERIENCE section):
   - Date range pattern `(\d{4}-\d{2}-\d{2}|Present)` → dates
   - Title + company pattern: `Title at Company` or `Company - Title`
   - Bullet lines starting with `-` or `*` → description items
   - Duration calculation from dates

3. **Education extraction** (from EDUCATION section):
   - Degree keywords: B.Tech, M.Tech, B.Sc, M.Sc, PhD, MBA, etc.
   - Institution pattern: `University`, `Institute`, `College`
   - Year pattern: `\d{4}` near degree
   - GPA pattern: `GPA: \d+\.\d+` or `CGPA: \d+\.\d+`

4. **Skill extraction** (from SKILLS section):
   - Split by comma, semicolon, pipe, or newline
   - Filter stop words (the, a, an, and, or)
   - Deduplicate and normalize casing

5. **Project extraction** (from PROJECTS section):
   - Title line (not starting with bullet)
   - Description follows bullets
   - Tech stack: comma-separated or bracket-wrapped keywords

6. **Certification extraction** (from CERTIFICATIONS section):
   - Issuer pattern: `from`, `by`, `from`, `-`
   - Date pattern near certification name
   - Credential ID pattern: `ID:`, `#`, `Credential`

7. **Achievement extraction** (from ACHIEVEMENTS section):
   - Text lines with action verbs
   - Date-aware extraction

8. **Language extraction** (from LANGUAGES section):
   - Known language names list
   - Proficiency pattern: `(native|fluent|conversational|basic|elementary)`

### 7.4 AI Fallback Trigger

Trigger conditions:
- Heuristic confidence < 0.5 for more than 50% of expected entities in a section
- Section contains ambiguous or unstructured text
- Multiple entities found but relationships unclear

AI fallback prompt includes:
- Section text
- Expected entity types for that section
- Existing extracted entities (if any)
- Request: structured JSON output with confidence per entity

**AI fallback is inside the SAME queue attempt.** It does not consume a retry.

### 7.4.1 Confidence Aggregation Rule

This section defines the boundary between per-entity confidence (Stage 2) and per-document confidence (Stage 4 ResumeConfidenceScorer).

**Minimum per-entity confidence threshold:**
- Entities with `confidence < 0.4` are excluded from `rawCandidateFields` entirely.
- Entities with `confidence >= 0.4` and `< 0.7` are included but flagged `reviewStatus: 'pending'`.
- Entities with `confidence >= 0.7` are included with `reviewStatus: 'auto'`.

**Aggregation formula (Stage 4 input):**
Stage 4 receives the full `rawCandidateFields` with per-entity confidence values. The `entityScore` component is computed as:

```
entityScore = average(confidence) over all entities with confidence >= 0.4
```

If no entities meet the threshold, `entityScore = 0.0`.

**Boundary contract:**
Stage 2 outputs must include, for every extracted entity:
- `confidence: number` (0.0–1.0)
- `reviewStatus: 'auto' | 'pending'`

Stage 4 reads these fields directly. No transformation is performed between stages.

### 7.4.2 Entity Deduplication

After all sections are processed, a global deduplication pass runs before persisting to `ResumeParseResult`.

**Normalization rules:**
1. Lowercase all entity names.
2. Trim whitespace from both ends.
3. Remove punctuation: `.`, `,`, `;`, `:`, `-`, `(`, `)`, `[`, `]`, `{`, `}`, `/`, `\`, `|`.
4. Replace multiple spaces with a single space.

**Deduplication key:**
`(type, normalized_name)`

Examples:
- `('skill', 'python')` matches `('skill', 'Python')` and `('skill', 'python ')`
- `('experience', 'senior backend engineer')` matches `('experience', 'Senior Backend Engineer')`

**Merge strategy:**
1. Group entities by deduplication key.
2. If a group has exactly one entity, keep it.
3. If a group has multiple entities:
   - Keep the entity with the highest `confidence`.
   - If confidence ties, prefer the entity from the section with the highest priority (see section priority below).
   - Set `mergedFrom: [sourceSection, sourceSection, ...]` on the kept entity.

**Scope:**
Global across all sections. Deduplication is not per-section.

**Section priority order (for tie-breaking):**
1. HEADER
2. EXPERIENCE
3. EDUCATION
4. PROJECTS
5. SKILLS
6. CERTIFICATIONS
7. ACHIEVEMENTS
8. LANGUAGES
9. SUMMARY

**Skill-specific deduplication:**
If a `CanonicalSkill` alias registry is available (future sprint), skills are additionally deduplicated by `canonicalId`.

### 7.4.3 AI Prompt Contract

When AI fallback is triggered, the following prompt template is used. The expected JSON response schema is part of the contract.

**Prompt template:**
```
You are a resume entity extractor. Extract structured entities from the following resume section text.

Section: {sectionTitle}
Section text:
{sectionText}

Existing extracted entities (if any):
{existingEntities}

Expected entity types for this section: {expectedEntityTypes}

Return ONLY a valid JSON array of entities with this exact format:
[
  {
    "type": "experience",
    "confidence": 0.85,
    "data": {
      "title": "Senior Backend Engineer",
      "company": "TechCorp Inc.",
      "startDate": "2021-06-01",
      "endDate": null,
      "current": true,
      "description": "Led migration to microservices",
      "bullets": ["Reduced latency by 40%"]
    }
  }
]

Rules:
- Use exact type values: person, experience, education, skill, project, certification, achievement, language
- confidence must be between 0.0 and 1.0
- Include only entities you are confident about
- If no entities found, return empty array []
- Do NOT invent data not present in the text
```

**Expected JSON schema:**
```ts
interface AiEntityResponse {
  type: string;
  confidence: number;
  data: Record<string, any>;
}
```

**Validation:**
- Response must be a JSON array.
- Each item must have `type` and `confidence`.
- Items without `type` or `confidence` are skipped.
- If parsing fails, the stage falls back to heuristic results from the same attempt.

---

## 8. Error Handling

| Failure Mode | Behavior |
|--------------|----------|
| No sections in `ResumeParseResult` | Use `rawContent` fallback; if still empty, publish `ResumeEntityExtractionFailed` with `NEEDS_REINDEX` |
| AI providers exhausted | Publish `ResumeEntityExtractionFailed`, set `reviewStatus: 'NEEDS_REINDEX'` |
| Invalid entity data from AI | Log warning, skip malformed entities, continue with heuristics |
| Queue retry | Stage checks `ResumeParseResult.entitiesExtracted` for idempotency; if already set, skip recomputation |
| Partial extraction failure | Publish `ResumeEntityExtracted` with warning; set `reviewStatus: 'PENDING_REVIEW'` |

### Retry Semantics

- Backoff: 1s, 2s, 4s
- Max attempts: 3
- AI fallback is NOT a retry — it's part of the same attempt
- If the entire stage fails after all retries, `ResumeParseDeadLetter` is published

---

## 9. Multi-Tenant Safety

- Entities are **embedded** in `ResumeParseResult.rawCandidateFields`
- No separate collection needed
- Org isolation inherited from parent `ResumeParseResult.organizationId`
- All queries scope by `processingId` + `organizationId`
- `personId` links extracted entities to canonical `Person` (future Sprint 7)

---

## 10. Test Plan

### Unit Tests

| Test | Target |
|------|--------|
| Person extraction from HEADER | Name, email, phone, linkedin, github extracted |
| Experience extraction from EXPERIENCE | Title, company, dates, bullets parsed |
| Education extraction from EDUCATION | Degree, institution, year, GPA parsed |
| Skill extraction from SKILLS | Comma/pipe/newline split, deduped, normalized |
| Project extraction from PROJECTS | Name, description, tech stack parsed |
| Certification extraction from CERTIFICATIONS | Title, issuer, date parsed |
| Achievement extraction from ACHIEVEMENTS | Text lines with action verbs extracted |
| Language extraction from LANGUAGES | Language names + proficiency parsed |
| AI fallback triggered when heuristic confidence low | Mock provider, assert fallback call |
| AI fallback returns structured entities | Validate parsed JSON matches schema |
| Idempotency: re-dequeue same job | `entitiesExtracted` count unchanged; stage skips |
| Error: no sections available | Falls back to `rawContent` or publishes failure |
| Error: AI provider exhausted | Publishes `ResumeEntityExtractionFailed`, sets `NEEDS_REINDEX` |

### Integration Tests

| Test | Target |
|------|--------|
| End-to-end: Stage 1 → Stage 2 → entities stored | Full async flow through mocked event bus + dispatcher |
| End-to-end: scanned resume → OCR → classify → sections → entities | OCR gate + full pipeline |
| Multi-tenant isolation: org A cannot access org B entities | Verify `organizationId` scoping in queries |
| Performance: entity extraction < 5s for 10-section resume | Latency benchmark |

---

## 11. Definition of Done

- [ ] `ResumeEntityExtractor` service created and unit tested (12+ tests)
- [ ] `ResumeEntity` interface defined with all 8 entity types
- [ ] `ResumeParseResult` updated with `entitiesExtracted`, `entityExtractionStrategy`, `rawCandidateFields.*`
- [ ] `KnowledgeDispatcher` `case 'entity_extraction'` handler implemented
- [ ] `UaipEvents` extended with `ResumeEntityExtracted`, `ResumeEntityExtractionFailed`
- [ ] Idempotency guard implemented (`entitiesExtracted > 0`)
- [ ] AI fallback implemented via `FailoverAIProvider`
- [ ] Confidence per entity assigned
- [ ] Error handling + retry semantics tested
- [ ] 12+ new tests pass
- [ ] No regressions (baseline: 418 tests)
- [ ] TypeScript compiles cleanly
- [ ] Architecture v1.5 changelog updated
- [ ] Code review passed
- [ ] Merge to `main`

---

## 12. Out-of-Scope Guardrails

The following are **explicitly excluded** from Sprint 4 and must not be implemented:

- ❌ `ResumeAIEnhancer`
- ❌ `ResumeConfidenceScorer`
- ❌ DIC integration
- ❌ Canonical model writes (`Person`, `ExperienceRecord`, `EducationRecord`, etc.)
- ❌ Frontend changes
- ❌ API changes
- ❌ Batch entity extraction optimization
- ❌ NER model training or fine-tuning

---

## 13. Dependencies

**No new npm dependencies required.** Uses existing `FailoverAIProvider` and regex utilities.

---

## 14. Architecture Baseline

**Previous:** Architecture v1.4 (Sprint 3)  
**Current:** Architecture v1.5 (Sprint 4)  
**Changelog:** Update in `backend/RESUME-PARSER-ARCHITECTURE.md`

### v1.5 Changes
- Added Stage 2: Resume Entity Extraction (async, event-driven)
- Added `ResumeEntityExtractor` as independent stateless service
- Added 8 entity types with schemas
- Added `ResumeEntityExtracted` / `ResumeEntityExtractionFailed` events
- Extended `KnowledgeDispatcher` with `entity_extraction` stage
- Added AI fallback for low-confidence extraction
- Added confidence scoring per entity

---

## 15. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| AI fallback produces malformed JSON | Medium | High | Strict schema validation + graceful degradation to heuristics |
| Entity overlap (e.g., skill in project description) | Medium | Medium | Deduplication by normalized name + section priority |
| Low-confidence entities pollute candidate fields | Low | Medium | Confidence threshold gates auto-approval; low-confidence flagged `PENDING_REVIEW` |
| Stage 2 depends on Stage 1 correctness | Low | High | Stage 1 tested; fallback to `rawContent` if sections missing |
| Retry causes duplicate entities | Low | Low | Idempotency via `entitiesExtracted > 0` check |

---

*Sprint 4 plan ready for review on 2026-07-24.*
