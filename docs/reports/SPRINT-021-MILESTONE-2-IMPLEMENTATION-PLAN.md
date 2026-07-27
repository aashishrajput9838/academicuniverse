# Sprint-021 Milestone-2 — Implementation Plan: Document Understanding

## 1. Scope Definition

**Deliverables:**
- Rule-based section detection engine (PRIMARY)
- Optional AI entity detection (disabled by default in tests)
- Confidence scoring
- Section builder (`ITemplateSection[]`)
- Formatting metadata population
- Complete extraction result producer

**Mandatory constraints (approved post-review):**
1. Rule-based extraction remains the primary engine.
2. AI is optional and used only for ambiguity resolution.
3. The pipeline must never fail because of AI timeout or API errors.
4. Every service must have deterministic unit tests that run without any AI calls.
5. AI must be behind a feature flag (`enableAiAssistance=false` by default in tests).
6. Backward compatibility with Milestone-1 outputs is preserved.
7. Architecture Decision Records generated for any deviation from the approved plan.

**Explicitly out of scope:**
- XML mutation
- Placeholder injection
- Processed DOCX generation
- Docxtemplater integration
- Controller changes
- Frontend changes
- Database migration script

**Success criteria:**
- Rule-based detection produces sections even when AI is fully disabled
- AI-assisted enhancement works when flag is enabled and API is available
- Pipeline never fails due to AI errors (graceful degradation)
- All unit tests deterministic, no AI calls by default
- Tests with AI enabled are explicitly opted-in
- Backward compatible with `ExtractedDocument` from Milestone-1
- No Milestone-1 regression

---

## 2. Input/Output Contract

### 2.1 Input

```typescript
ExtractedDocument  // From DocxExtractionService (Milestone-1)
```

### 2.2 Output

```typescript
interface Milestone2Result {
  sections: ITemplateSection[];
  entities: ExtractedEntity[];
  confidence: number;          // 0.0 to 1.0
  formattingMetadata: ResumeTemplate['formattingMetadata'];
  extractionIssues: ExtractionIssue[];
}

interface ExtractedEntity {
  type: 'name' | 'email' | 'phone' | 'url' | 'date' | 'address' | 'education' | 'skill' | 'experience';
  value: string;
  location?: DocxLocation;
  confidence: number;
}

interface ExtractionIssue {
  severity: 'info' | 'warning' | 'error';
  message: string;
  location?: DocxLocation;
}
```

### 2.3 Flow

```
ExtractedDocument (Milestone-1 output)
    ↓
SectionDetector → Section[] (rule-based)
    ↓
EntityDetector → entities[] (AI-assisted)
    ↓
ConfidenceScorer → confidence (0.0-1.0)
    ↓
FormattingBuilder → formattingMetadata
    ↓
Result            → sections, entities, confidence, formattingMetadata, extractionIssues
```

---

## 3. File-by-File Changes

### 3.1 New Files

| File | Purpose |
|------|---------|
| `backend/src/services/sectionDetector.service.ts` | Rule-based section detection |
| `backend/src/services/entityDetector.service.ts` | AI entity detection |
| `backend/src/services/confidenceScorer.service.ts` | Confidence scoring |
| `backend/src/services/formattingBuilder.service.ts` | Formatting metadata population |
| `backend/src/services/extractionResult.service.ts` | Orchestrates all above into final result |
| `backend/src/__tests__/sectionDetector.service.test.ts` | Unit tests |
| `backend/src/__tests__/entityDetector.service.test.ts` | Unit tests (mocked AI) |
| `backend/src/__tests__/confidenceScorer.service.test.ts` | Unit tests |
| `backend/src/__tests__/formattingBuilder.service.test.ts` | Unit tests |
| `backend/src/__tests__/extractionResult.service.test.ts` | Integration unit tests |

### 3.2 Modified Files

| File | Changes |
|------|---------|
| `backend/src/models/ResumeTemplate.ts` | None (schema already has slots) |
| `backend/src/services/storageService.ts` | None |
| `backend/src/docxExtraction.service.ts` | None |
| `backend/src/__tests__/docxExtraction.service.test.ts` | None |

**No controller, frontend, or model changes in Milestone-2.**

---

## 4. Section Detection

**File:** `backend/src/services/sectionDetector.service.ts`

### 4.1 Responsibility

Analyze the raw document text and runs to identify resume sections (e.g., "Professional Summary", "Skills", "Education", "Work Experience").

### 4.2 Approach: Hybrid (Rules + AI)

#### Phase A: Rule-Based Detection (always runs)

**Heading heuristics:**
1. Runs with `isHeading = true` from style → section boundary
2. Runs with bold formatting + specific font size (≥ 14pt) → likely heading
3. Lines that are ALL CAPS or Title Case with no punctuation at end → section title candidate
4. Known section keywords (case-insensitive, substring match):
   - `summary`, `objective`, `profile`, `about`
   - `skills`, `technical skills`, `core competencies`
   - `education`, `qualification`, `academic`
   - `experience`, `work history`, `employment`
   - `projects`, `publications`, `achievements`
   - `certifications`, `certificates`
   - `languages`, `hobbies`, `interests`, `references`

**Rules:**
- A heading candidate must have a preceding paragraph break (realistic: distance ≥ 1 empty paragraph)
- Section title is extracted from the run text, stripped of trailing colons/dashes/spaces
- Section body extends until next section heading or end of document
- Minimum section body: 1 run (allows empty sections like "Interests")
- Maximum section body length: no hard limit

**Section ordering:** Preserve document order (paragraph index).

#### Phase B: AI Disambiguation (OPTIONAL — behind feature flag)

Trigger AI **only when all three conditions are met**:
1. `enableAiAssistance` is `true` (configurable; **default: `false` in tests**)
2. Rule confidence < 0.7 for any section
3. Two heading candidates are within 2 runs of each other (ambiguous)
4. A heading candidate has non-heading formatting but matches keywords

**AI call guarantees:**
- Runs in a try/catch with a 15s timeout
- On timeout or API error, logs warning and continues
- **Never blocks extraction completion**
- Pipeline degrades gracefully to rule-based result only

**AI prompt:** Send the paragraph text + surrounding context (3 runs before/after) + candidate section title. Ask: "Is this a section heading? If yes, what section name?"

**AI output:** `{ isHeading: boolean, sectionName?: string, confidence: number }`

### 4.3 Section Construction

```typescript
interface DetectedSection {
  id: string;                    // auto-generated UUID-like string
  title: string;
  order: number;                 // document order index
  repeatable: boolean;           // true for Projects, Experience; false for Summary, Skills
  maxEntries?: number;           // null = unlimited
  minEntries?: number;           // usually 1 for required sections
  fields: ITemplateField[];      // inferred from entity analysis
  aiPrompt?: string;             // hint for AI during fill
}
```

**Field inference rules:**
- Education → fields: `degree`, `institution`, `year`, `cgpa`
- Experience → fields: `company`, `role`, `duration`, `responsibilities`
- Projects → fields: `name`, `description`, `tech_stack`
- Skills → fields: `category`, `items`
- Summary → fields: `text` (single textarea)
- Certifications → fields: `name`, `issuer`, `date`

**Repeatable logic:**
- `repeatable = true` if section is Experience, Education, Projects, Publications
- `minEntries = 1` if section is required (Summary, Skills)
- `maxEntries = null` (unlimited) for all repeatable sections in Milestone-2

### 4.4 Edge Cases

| Edge Case | Handling |
|---|---|
| No clear headings detected | Return single "Content" section with all text |
| Duplicate headings (e.g., two "Skills" sections) | Merge into one; note in `extractionIssues` |
| Heading inside a table cell | Treat as section heading; note in issues |
| Heading with odd formatting (italic only) | Use if it matches keyword pattern |
| Empty section body | Accept with empty `fields`; note low confidence |

---

## 5. AI Entity Detection

**File:** `backend/src/services/entityDetector.service.ts`

### 5.1 Responsibility

Identify named entities within section bodies and classify them.

### 5.2 When AI Is Called

- Section bodies shorter than 200 characters → no AI, rely on regex rules
- Section bodies longer than 200 characters → AI **only if** `enableAiAssistance === true`
- Total entities expected < 50 for a resume → cost is bounded (but only if enabled)

**Feature flag:**
- `enableAiAssistance: boolean`
- **Default: `false` in all tests and production unless explicitly overridden**
- Controlled via environment variable or constructor parameter
- No AI calls are made unless flag is `true`

**AI call guarantees:**
- Wrapped in try/catch
- Timeout enforced at 15s
- On failure: logs warning, appends `extractionIssues` entry with severity `warning`, continues with regex-only entities
- **Pipeline never crashes due to AI errors**
- **Entity detector gracefully falls back to regex-only extraction**

### 5.3 Layered Approach

#### Layer 1: Regex (always runs, free)

| Entity Type | Regex Pattern | Notes |
|---|---|---|
| email | `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}` | Basic email |
| phone(IN) | `(\+91[\s-]?)?[6-9]\d{9}` | Indian numbers |
| phone(US) | `(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}` | US numbers |
| url | `https?://[^\s]+` or `www\.[^\s]+` | HTTP/HTTPS or www |
| year | `(19|20)\d{2}` | Four-digit years |
| cgpa/gpa | `\d\.\d+/?\d*\s*(cgpa\|gpa)?` | GPA-like scores |

#### Layer 2: AI (for sections > 200 chars)

**AI prompt template:**
```
You are extracting structured entities from a resume section.

Section: [title]
Content: [paragraphs with XML paths]

Extract entities as JSON array with this schema:
[
  {
    "type": "name" | "email" | "phone" | "url" | "date" | "address" | "education" | "skill" | "experience",
    "value": "extracted text",
    "confidence": 0.0-1.0
  }
]

Rules:
- Prefer specific values over vague ones.
- If a phone appears, classify as phone even if email is also present.
- For education, extract the degree+institution combo as a single entity.
- For skills, list each distinct skill as a separate entity.
- Do NOT invent data not present in the text.
- Return [] if no entities.
```

**AI configuration (when `enableAiAssistance === true`):**
- Model: `@google/genai` `gemini-2.0-flash` (fast, low cost)
- Temperature: 0.1 (deterministic)
- Max output tokens: 1024
- Max retries: 2
- Timeout: 15s

#### Layer 3: Post-processing

- Deduplicate entities (exact string match, case-insensitive)
- If regex found entity but AI missed it, keep regex entity (AI is supplementary)
- Merge entities with same type and overlapping values
- Sort by document order (location-based)

### 5.4 Entity Classification Mapping

| Section Title Keywords | Accept Entity Types |
|---|---|
| Summary / Objective / Profile | name, email, phone, url |
| Skills | skill |
| Education | education, date |
| Experience / Work History | experience, date, url |
| Projects | experience, skill |
| Certifications | education, date |
| Languages | skill |
| Contact Info (implicit) | email, phone, url, address |

---

## 6. Confidence Scoring

**File:** `backend/src/services/confidenceScorer.service.ts`

### 6.1 Responsibility

Produce a single `confidence` score (0.0-1.0) for the entire extraction result.

### 6.2 Scoring Model

Confidence is a weighted combination of:

```
confidence = (0.30 * section_score) + (0.25 * entity_score) + (0.20 * formatting_score) + (0.15 * completeness_score) + (0.10 * consistency_score)
```

#### 6.2.1 Section Score (30%)

Based on section detection quality:
- All sections have `title` and `order` → +0.5
- At least 1 section body has content > 50 chars → +0.2
- AI was NOT triggered for disambiguation → +0.2 (rules detected everything clearly)
- No duplicate sections detected → +0.1
- Max = 1.0

#### 6.2.2 Entity Score (25%)

Based on entity detection quality:
- Regex found entities in Contact-like sections → +0.4
- AI returned entities with avg confidence > 0.7 → +0.3
- No empty entity values → +0.2
- No duplicate entities across sections → +0.1
- Max = 1.0

#### 6.2.3 Formatting Score (20%)

Based on formatting metadata completeness:
- `formattingMetadata.styles` is non-empty → +0.3
- `formattingMetadata.headingLevels` has >= 2 entries → +0.3
- `formattingMetadata.bulletMarker` is set → +0.2
- `formattingMetadata.dateFormat` is set → +0.2
- Max = 1.0

#### 6.2.4 Completeness Score (15%)

Based on overall document coverage:
- (>80% of runs belong to a section) → +0.5
- Rare formatting values (fonts, sizes) present → +0.3
- Tables/images detected and recorded → +0.2
- Max = 1.0

#### 6.2.5 Consistency Score (10%)

Based on internal consistency:
- No section has same title as another → +0.4
- All entities have locations matching their section → +0.3
- No extraction issues with severity 'error' → +0.3
- Max = 1.0

### 6.3 Final Score

- Clamped to [0.0, 1.0]
- Stored in `confidence` field of `Milestone2Result`
- If any `extractionIssues` has severity `error`, floor at 0.5

---

## 7. Formatting Metadata Population

**File:** `backend/src/services/formattingBuilder.service.ts`

### 7.1 Responsibility

Distill the raw formatting data from `ExtractedDocument` into the `ResumeTemplate.formattingMetadata` shape.

### 7.2 Algorithm

#### 7.2.1 `styles`

Group runs by unique formatting signature:
```
formattingSignature = `${font}|${fontSize}|${bold ? 'b' : ''}${italic ? 'i' : ''}${underline ? 'u' : ''}|${color}`
```

- Count runs per signature
- Keep top 5 most common signatures
- Map signature → descriptive name:
  - `Arial|12|b||000000` → `HeadingBold12`
  - `Calibri|11|||000000` → `BodyRegular11`

If a signature has only 1-2 occurrences, map to `Custom1`, `Custom2`, etc.

#### 7.2.2 `headingLevels`

Map section titles to approximate heading levels:
- Style contains "Heading1" → level 1
- Style contains "Heading2" → level 2
- Bold ≥ 16pt → level 1
- Bold ≥ 14pt → level 2
- Bold ≥ 12pt + ALL CAPS → level 3
- Else → level 4

Store as `Record<string, number>` where key is section title (lowercase) and value is heading level.

#### 7.2.3 `bulletMarker`

Scan all runs in all paragraphs:
- If a run starts with `•` and has no run before it in same paragraph → bullet marker is `•`
- If a run starts with `-` or `*` → bullet marker is `-`
- If numbered pattern `1.` / `a.` / `i.` detected → bullet marker is the pattern
- Default (no bullets) → `""`

#### 7.2.4 `dateFormat`

Sample text from sections matching keywords "experience", "education", "certifications":
- Pattern: `(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}` → `MMM YYYY`
- Pattern: `\d{2}/\d{4}` → `MM/YYYY`
- Pattern: `\d{4}-\d{2}` → `YYYY-MM`
- Pattern: `\d{1,2}/\d{1,2}/\d{4}` → `DD/MM/YYYY`
- No matches → `unknown`

---

## 8. Extraction Issues

**File:** `backend/src/services/extractionResult.service.ts` (reporting)

### 8.1 Issue Types

| Severity | Condition | Example |
|---|---|---|
| info | Minor observation | "Document has no styles; defaults assumed" |
| warning | Degraded quality | "Two sections merged due to duplicate heading" |
| error | Severe problem | "AI entity detection timed out; only regex entities extracted" |

### 8.2 Built-in Checks

1. **No sections detected** → error: "No sections could be detected; result may be unreliable"
2. **More than 50% of runs are orphaned** (not in any section) → warning
3. **AI call failed** → error with timestamp
4. **Entity value empty** → warning
5. **Confidence < 0.4** → warning: "Low extraction confidence; manual review recommended"
6. **No formatting metadata populated** → info: "No unique formatting patterns detected"

---

## 9. Service Architecture

### 9.1 Feature Flag: `enableAiAssistance`

All AI features in this milestone are gated behind a feature flag:
```typescript
interface ExtractionOptions {
  enableAiAssistance: boolean;  // default: false
}
```

**Rules:**
- **Must be explicitly enabled** to trigger any AI call
- Defaults to `false` in tests
- Defaults to `false` in production unless overridden via environment variable
- Every service constructor accepts `options?: ExtractionOptions`
- Pipeline determinism is guaranteed when `enableAiAssistance === false`

### 9.2 Orchestrator

### 9.1 interfaces

```typescript
// All services in this milestone are stateless.
// They are instantiated per-request in the orchestrator.
```

### 9.2 Orchestrator

`ExtractionResultService` receives an `ExtractedDocument` and returns a `Milestone2Result`.

**Dependency order:**
1. `SectionDetectorService` → `DetectedSection[]`
2. `EntityDetectorService` → `ExtractedEntity[]`
3. `FormattingBuilderService` → `formattingMetadata`
4. `ConfidenceScorerService` → `confidence`

The orchestrator collects `extractionIssues` from all sub-services and appends its own (e.g., overall confidence < 0.4).

### 9.3 AI Call Limits

- Max 1 AI call per run (shared context: sections array after detection)
- AI calls are **optional** — if AI is unavailable or fails, extraction degrades gracefully (regex entities only, lower confidence)
- No AI in unit tests by default (mocked)

---

## 10. Unit Tests

### 10.1 Test Philosophy

**All tests are deterministic and run without AI calls by default.**
- Every service is tested with `enableAiAssistance: false`
- No test depends on network, external APIs, or timing
- Tests with AI enabled are explicitly opted-in and marked `@skip` or placed in a separate `*.ai.test.ts` file

### 10.2 Mock Strategy

- `@google/genai`: Mocked via `jest.mock('@google/genai')` globally
- AI tests use canned responses and are **opt-in only**
- `ExtractedDocument` fixtures: in-memory objects derived from Milestone-1 test fixtures (no DOCX parsing)

### 10.3 Test Count by Service

| Service | Tests | Focus | AI-Enabled? |
|---|---|---|---|
| `SectionDetectorService` | 12 | Rule-based detection, fallback, dedup, field inference | Never |
| `EntityDetectorService` | 10 | Regex layer, fallback, dedup, graceful degradation | Never (opt-in file exists) |
| `ConfidenceScorerService` | 8 | Scoring weights, thresholds, floors | Never |
| `FormattingBuilderService` | 8 | Style grouping, bullets, dates, heading levels | Never |
| `ExtractionResultService` | 6 | Orchestration, issue aggregation, graceful fallback | Never |
| **Total** | **44** | — | — |

### 10.4 Example Test Cases

**SectionDetectorService:**
- `detects section headings from bold formatting`
- `detects section headings from known keywords`
- `does not detect headings in table cells` (default; flags in issues)
- `merges duplicate sections`
- `returns single Content section when no headings found`
- `infers fields for Education section`
- `marks Experience as repeatable`
- `handles orphan runs`

**EntityDetectorService:**
- `extracts email via regex`
- `extracts phone via regex`
- `fallback to regex-only when AI disabled`
- `does not crash when AI throws`
- `deduplicates overlapping entities`
- `does not invent entities not present in text`

**ConfidenceScorerService:**
- `scores high confidence with clear sections and entities`
- `scores low confidence with no sections`
- `penalizes duplicate sections`
- `respects extractionIssues severity`

**FormattingBuilderService:**
- `builds styles from formatting signatures`
- `detects bullet markers`
- `detects date formats`
- `assigns heading levels based on font size`

**ExtractionResultService:**
- `produces complete result from ExtractedDocument`
- `aggregates extraction issues from all services`
- `gracefully handles AI unavailability`
- `never throws when AI is unavailable`

---

## 11. Dependencies

### 11.1 Already Available

- `@google/genai` — already in `package.json`
- `DocxExtractionService` output types — Milestone-1

### 11.2 No New Dependencies

Milestone-2 does NOT require:
- XML parsers
- DOCX libraries
- Document writers
- Mongoose (not used in extraction layer)

---

## 12. Implementation Order

| Step | Task | Est. Time |
|------|------|-----------|
| 1 | Define `Milestone2Result`, `ExtractedEntity`, `ExtractionIssue` interfaces | 30 min |
| 2 | Implement `SectionDetectorService` — rules | 2 hours |
| 3 | Implement `SectionDetectorService` — AI disambiguation | 2 hours |
| 4 | Implement `EntityDetectorService` — regex layer | 1 hour |
| 5 | Implement `EntityDetectorService` — AI layer | 2 hours |
| 6 | Implement `ConfidenceScorerService` | 1.5 hours |
| 7 | Implement `FormattingBuilderService` | 2 hours |
| 8 | Implement `ExtractionResultService` orchestrator | 1.5 hours |
| 9 | Write unit tests for `SectionDetectorService` (12 tests) | 2 hours |
| 10 | Write unit tests for `EntityDetectorService` (10 tests) | 1.5 hours |
| 11 | Write unit tests for `ConfidenceScorerService` (8 tests) | 1 hour |
| 12 | Write unit tests for `FormattingBuilderService` (8 tests) | 1 hour |
| 13 | Write unit tests for `ExtractionResultService` (6 tests) | 1 hour |
| **14** | Run TypeScript compilation (`npx tsc --noEmit`) | 30 min |
| **15** | Run tests (`npx jest`) | 30 min |
| **16** | Manual verification with Kushagra DOCX | 1 hour |
| **17** | Generate implementation report | 30 min |

**Total: ~19 hours of development**

---

## 13. Verification Checklist

- [ ] `npx tsc --noEmit` passes with no new errors in `src/`
- [ ] `npx jest` passes all new tests
- [ ] `SectionDetectorService` produces sections from Kushagra DOCX
- [ ] `EntityDetectorService` finds key entities with confidence > 0.6
- [ ] `ConfidenceScorerService` returns overall confidence > 0.5 for Kushagra DOCX
- [ ] `FormattingBuilderService` populates all 4 metadata fields
- [ ] `ExtractionResultService` returns complete object with all required fields
- [ ] No XML mutation on input document
- [ ] No controller/frontend changes introduced
- [ ] Side-effects test confirms no AI calls without explicit opt-in in tests

---

## 14. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| AI produces non-JSON or malformed output | Medium | Response schema enforcement via Gemini SDK |
| AI cost exceeds estimates | Low | Capped at 1 call per extraction; temperature 0.1; small prompt |
| Rule-based detection misses unconventional section headings | Low | AI disambiguation catches most cases; falls back to "Content" section |
| Confidence scoring too lenient/strict | Low | Weighted model validated against 3 test DOCX (Kushagra, generic, minimal) |
| Entity overlap between regex and AI creates duplicates | Low | Post-processing dedup layer |
| Date format detection inconclusive on mixed-format documents | Low | Returns first detected format; `extractionIssues` notes ambiguity |

---

## 15. What Milestone-3 Will Build On

Milestone-2 output enables Milestone-3 by providing:
- `sections[]` with `fields[]` (determines where placeholders go)
- `entities[]` with locations (pre-filled values)
- `formattingMetadata` (injection style guide)
- `extractionIssues` (human review queue for failed extractions)
- Structured `ExtractedEntity.value` for docxtemplater field population

Milestone-3 will add:
- XML placeholder injection using `DocxLocation`
- Processed DOCX generation via PizZip `generate()`
- Docxtemplater integration (read-only from our generated template)

---

## 16. No-Go Criteria

Do NOT proceed to Milestone-3 if:
- `ExtractionResultService` crashes on a valid `ExtractedDocument`
- `ConfidenceScorerService` always returns < 0.3 for known-good documents
- AI integration has no timeout/fallback and blocks extraction indefinitely
- Entity detection produces > 20% false positives (weird entity types invented by AI)
- `formattingMetadata` is never populated (all 4 fields always empty)
- Any unit test makes an unguarded AI call

---

## 17. Approval Checklist

- [x] Section detection strategy approved (rules + AI disambiguation)
- [x] Entity types and classification mapping approved
- [x] Confidence scoring weights approved
- [x] Formatting metadata field designs approved
- [x] Unit test count and scope approved (44 tests)
- [x] AI call pattern approved (optional, single call, fast fallback)
- [x] No controller/frontend/XML-changes confirmed
- [x] Kushagra DOCX designated as golden test case for document understanding
- [x] Mandatory constraints incorporated:
  - [x] Rule-based extraction is primary engine
  - [x] AI is optional and behind feature flag (`enableAiAssistance=false` in tests)
  - [x] Pipeline never fails due to AI timeout/API errors
  - [x] All tests deterministic without AI calls
  - [x] Backward compatible with Milestone-1 outputs

---

## 18. Architecture Decision Records

### ADR-001: Rule-Based Extraction as Primary Engine

**Context:** The initial plan proposed a hybrid approach where advanced patterns might be AI-first.

**Decision:** Rule-based extraction is the **sole primary engine**. AI is used only for ambiguity resolution when explicitly enabled.

**Rationale:**
- Determinism: Rule-based extraction produces identical outputs for identical inputs
- Cost: No API cost unless explicitly opted in
- Speed: No network latency in default path
- Testability: Pure function with no external dependencies
- Backward compatibility: Doesn't change Milestone-1 contract shape

**Consequences:**
- Some edge cases may be missed in rule set
- AI enhancement requires explicit opt-in via `enableAiAssistance`
- Entity detection quality depends on regex coverage for default mode

### ADR-002: AI Behind Feature Flag `enableAiAssistance`

**Context:** AI integration introduces network dependency, cost, and non-determinism.

**Decision:** All AI capabilities are gated behind a boolean feature flag. Default is `false` in tests and production.

**Rationale:**
- Tests must run in CI without external dependencies
- Production deployments can opt into AI cost
- Prevents accidental AI calls during debugging
- Makes behavior explicit and auditable

**Consequences:**
- Need to maintain two code paths (rule-only and AI-assisted)
- Telemetry must track flag state
- Documentation must flag AI-dependent features

### ADR-003: Graceful Degradation on AI Failure

**Context:** AI services can timeout, rate-limit, or return malformed responses.

**Decision:** Pipeline never throws due to AI errors. On failure, appends a warning to `extractionIssues` and continues with rule-only entities.

**Rationale:**
- Extraction is the bottleneck; AI is an enhancement
- Partial results are better than no results
- Users prefer degraded extraction over empty errors
- Review queue (via `extractionIssues`) captures AI failures for human review

**Consequences:**
- Confidence score reflects AI failure (reduced weighting)
- `extractionIssues` can accumulate warnings
- No retry storms (max 2 retries, then give up)

### ADR-004: No New Dependencies for Core Pipeline

**Context:** Milestone-2 was approved with no new dependencies.

**Decision:** Use only `@google/genai` (already in package.json). No new packages added.

**Rationale:**
- Keeps install surface unchanged
- Avoids version conflicts
- `@google/genai` is already managed by the project

**Consequences:**
- Must implement regex entity extraction manually
- Must implement formatting analysis without specialized libraries

### ADR-005: Backward Compatibility with Milestone-1

**Context:** Milestone-1 services and types must continue to work unchanged.

**Decision:** Milestone-2 is implemented as **new services only**. No modifications to existing Milestone-1 files.

**Rationale:**
- Prevents regression
- Allows independent versioning
- Enables gradual rollout
- Keeps test isolation

**Consequences:**
- `DocxExtractionService` is unchanged
- No controller changes
- Milestone-1 test suite is the regression safety net
