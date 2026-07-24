# Sprint 4 Code Review — Evidence Report
## Resume Parser — ResumeEntityExtractor (Stage 2)

**Date:** 2026-07-25  
**Reviewer:** Kilo  
**Scope:** Sprint 4 implementation review evidence

---

## Evidence 1: entityExtractionStrategy Enum Mismatch

### Finding
Code Review Finding #1 (High): "entityExtractionStrategy Value Mismatch with Mongoose Schema Enum"

### File References
- `src/shared/services/knowledgeDispatcher.service.ts:473`
- `src/models/ResumeParseResult.ts:44`

### Evidence

**Implementation writes (dispatcher line 473):**
```typescript
entityExtractionStrategy: result.strategy,
```
Where `result.strategy` is typed as:
```typescript
strategy: 'heuristic' | 'heuristic+ai' | 'ai-only';
```

**Model schema defines (ResumeParseResult.ts line 44):**
```typescript
entityExtractionStrategy: { type: String, required: true, enum: ['regex', 'regex+ner', 'regex+ner+ai', 'ai-only'] },
```

**Mismatch:**
- Implementation values: `'heuristic'`, `'heuristic+ai'`, `'ai-only'`
- Schema enum values: `'regex'`, `'regex+ner'`, `'regex+ner+ai'`, `'ai-only'`
- Overlap: only `'ai-only'` matches
- `'heuristic'` and `'heuristic+ai'` are NOT in the schema enum

**Runtime impact:**
Mongoose will throw a validation error when attempting to save:
```
entityExtractionStrategy: `heuristic` is not a valid enum value
```

**Evidence from existing working code:**
Stage 1 (`sectionDetectionStrategy`) uses matching enum values:
```typescript
sectionDetectionStrategy: { type: String, required: true, enum: ['heuristic', 'heuristic+ai', 'ai-only'] },
```
This confirms the pattern is to keep implementation and schema in sync.

---

## Evidence 2: No Validation of AI Response Schema

### Finding
Code Review Finding #2 (Medium): "No Validation of AI Response Schema"

### File References
- `src/services/resume/resumeEntityExtractor.service.ts:540-554`

### Evidence

**Current parsing (lines 540-554):**
```typescript
const parsed = JSON.parse(response);
if (!Array.isArray(parsed)) {
  return [];
}

return parsed
  .filter((item: any) => item.type && typeof item.confidence === 'number')
  .map((item: any, index: number) => ({
    type: item.type,
    confidence: Math.max(0.4, Math.min(1.0, item.confidence)),
    ...
  }));
```

**Validation gaps:**
1. `item.type` is not checked against allowed values (`person`, `experience`, etc.)
2. `item.confidence` is clamped but not validated to be a number before clamping
3. `item.data` is not validated to be an object
4. No check for `null` or `undefined` items in array

**Plan reference (SPRINT-4-PLAN.md Section 7.4.3):**
```
Rules:
- Use exact type values: person, experience, education, skill, project, certification, achievement, language
- confidence must be between 0.0 and 1.0
```

The plan specifies these constraints but the implementation does not enforce them.

---

## Evidence 3: Certification Issuer Regex Edge Case

### Finding
Code Review Finding #3 (Medium): "Certification Title/Issuer Parsing Edge Case"

### File References
- `src/services/resume/resumeEntityExtractor.service.ts:382-402`

### Evidence

**Current regex (line 382):**
```typescript
const issuerPattern = /(?:from|by|issued by)\s+(.+)/i;
```

**Test input (test file line 54):**
```typescript
rawText: 'AWS Solutions Architect from Amazon Web Services (2022-06-01)',
```

**Current behavior:**
- `issuerMatch[0]` = `"from Amazon Web Services (2022-06-01)"`
- `line.replace(issuerMatch[0], '').trim()` = `"AWS Solutions Architect"`
- `issuerMatch[1]` = `"Amazon Web Services (2022-06-01)"`
- `issuerMatch[1].replace(datePattern, '').trim()` = `"Amazon Web Services"` — works for this case

**Edge case input:**
```
"AWS Solutions Architect from Amazon Web Services from 2022"
```

**Expected behavior:**
- issuer = `"Amazon Web Services"`

**Actual behavior:**
- `issuerMatch[0]` = `"from Amazon Web Services from 2022"`
- `issuerMatch[1]` = `"Amazon Web Services from 2022"`
- After `.replace(datePattern, '')` = `"Amazon Web Services from"` — incorrect

**Evidence of risk:**
The regex `/(?:from|by|issued by)\s+(.+)/i` is greedy and matches the last occurrence of the pattern, not the first. For lines with multiple "from" clauses, the issuer capture includes trailing text.

---

## Evidence 4: Skill Deduplication Missing Canonical Alias Integration

### Finding
Code Review Finding #4 (Medium): "Skill Deduplication Missing Canonical Alias Integration"

### File References
- `src/services/resume/resumeEntityExtractor.service.ts:462-470`
- `SPRINT-4-PLAN.md` Section 7.4.2

### Evidence

**Plan states (Section 7.4.2):**
```
Skill-specific deduplication:
If a CanonicalSkill alias registry is available (future sprint), skills are additionally deduplicated by canonicalId.
```

**Implementation (lines 462-470):**
```typescript
const identifier = data.name || data.title || data.email || data.phone || data.linkedin || data.github || '';
const key = `${entity.type}:${normalizeName(identifier)}`;
```

**Gap:**
- No reference to `CanonicalSkill` alias registry
- No `TODO` or tracking comment
- Skills deduplicated only by normalized name

**Impact:**
- "JS" and "JavaScript" will be treated as different skills
- "React.js" and "React" will be treated as different skills
- This is acceptable for Sprint 4 per the plan, but should be explicitly tracked

---

## Evidence 5: AI Fallback Entities Bypass Confidence Filter

### Finding
Code Review Finding #5 (Low): "AI Fallback Entities Bypass Confidence Filter"

### File References
- `src/services/resume/resumeEntityExtractor.service.ts:86, 545-554`

### Evidence

**Filter applied (line 86):**
```typescript
const deduped = this.deduplicate(entities.filter((e) => e.confidence >= 0.4));
```

**AI entities appended AFTER filter (lines 76-80):**
```typescript
if (aiEntities.length > 0) {
  entities.push(...aiEntities);
  aiFallbackUsed = true;
}
```

**Clamping in invokeAiFallback (line 549):**
```typescript
confidence: Math.max(0.4, Math.min(1.0, item.confidence)),
```

**Evidence:**
- Heuristic entities are filtered by `>= 0.4` at line 86
- AI entities are appended to the array AFTER the filter
- AI confidence is clamped to `[0.4, 1.0]` at line 549
- Result: AI entities always pass the threshold, even if the AI returned low confidence

**Plan reference (Section 7.4.1):**
```
Entities with confidence < 0.4 are excluded from rawCandidateFields entirely.
```

The plan says all entities should be filtered, not just heuristic ones.

---

## Evidence 6: Hardcoded Confidence Values

### Finding
Code Review Finding #6 (Low): "Hardcoded Confidence Values"

### File References
- `src/services/resume/resumeEntityExtractor.service.ts` (multiple methods)

### Evidence

**Hardcoded values throughout:**
- `extractHeader`: 0.9 (name), 0.95 (email/phone/linkedin/github)
- `extractExperience`: 0.75
- `extractEducation`: 0.85 (with degree+institution), 0.7 (partial)
- `extractSkills`: 0.75
- `extractProjects`: 0.75
- `extractCertifications`: 0.8 (with issuer), 0.7 (without)
- `extractAchievements`: 0.6
- `extractLanguages`: 0.85 (with proficiency), 0.7 (without)

**Impact:**
- Tuning confidence requires code changes
- No central configuration
- Values are not adjustable per deployment

---

## Evidence 7: No Error Classification in Dispatcher

### Finding
Code Review Finding #8 (Low): "No Error Classification in Dispatcher"

### File References
- `src/shared/services/knowledgeDispatcher.service.ts:527-536`

### Evidence

**Current failure event (lines 527-536):**
```typescript
await eventBus.publish(
  UaipEvent.ResumeEntityExtractionFailed,
  {
    processingId,
    errorMessage: err.message,
    reason: 'unknown',
    timestamp: new Date(),
    correlationId,
  } as UaipEventPayload
);
```

**Plan Section 6.1 defines reasons:**
```typescript
reason: 'no_sections' | 'ai_exhausted' | 'malformed_response' | 'unknown';
```

**Current behavior:**
- All errors published with `reason: 'unknown'`
- No distinction between:
  - No sections available
  - AI provider exhausted
  - Malformed AI response
  - Database errors
  - Network errors

**Impact:**
- Monitoring cannot distinguish failure modes
- Alerting rules must treat all failures identically

---

## Evidence 8: Statelessness Verification

### File
`src/services/resume/resumeEntityExtractor.service.ts`

### Evidence

**Zero side-effect imports:**
- No `ResumeParseResult` import
- No `eventBus` import
- No `KnowledgeJobRepository` import
- No `AuditEntry` import
- Only imports: `ResumeSection`, `ResumeEntity`, `IAIProvider`, `AIConfig`, `Logger`

**Zero mutable state:**
- Private fields: `aiProvider` (read-only), `aiModel` (read-only)
- No instance properties modified after construction
- `extract()` method takes params, returns result, no side effects

**Test verification:**
- "produces identical output for identical input" — PASS

---

## Evidence 9: AI Fallback Semantics Verification

### File
`src/services/resume/resumeEntityExtractor.service.ts:60-84`

### Evidence

**Same-attempt verification:**
```typescript
if (needsAi && this.aiProvider) {
  try {
    const aiEntities = await this.invokeAiFallback(rawText, ordered);
    if (aiEntities.length > 0) {
      entities.push(...aiEntities);
      aiFallbackUsed = true;
    }
  } catch (err) {
    logger.warn('ResumeEntityExtractor: AI fallback failed, using heuristic result', ...);
  }
}
```

- AI fallback is called within the same `extract()` method
- No queue interaction
- No retry consumption
- On failure, heuristics are preserved (not thrown)

**Trigger conditions match plan:**
1. Required section (HEADER/EXPERIENCE/EDUCATION/SKILLS) yields 0 entities — line 69
2. Average confidence < 0.5 — line 66

---

## Evidence 10: Dispatcher Orchestration Verification

### File
`src/shared/services/knowledgeDispatcher.service.ts:418-540`

### Evidence

**Handler responsibilities:**
1. AuditEntry created (line 431)
2. Idempotency check (line 446)
3. Reads sections from `rawCandidateFields.sections` (line 450)
4. Calls `entityExtractor.extract()` (line 453)
5. Maps entities to canonical-compatible shapes (line 458)
6. Updates `ResumeParseResult` (line 468)
7. Publishes success event (line 493)
8. Publishes failure event (line 527)
9. Re-throws error (line 538)

**Separation of concerns:**
- Extractor: pure computation, no side effects
- Dispatcher: orchestration, persistence, events

---

## Evidence 11: Event Payload Verification

### File
`src/events/UaipEvents.ts:16-17`
`src/shared/services/knowledgeDispatcher.service.ts:493-511, 527-536`

### Evidence

**ResumeEntityExtracted payload matches plan Section 6.1:**
| Field | Plan | Implementation | Match? |
|-------|------|---------------|--------|
| processingId | required | present | ✅ |
| entitiesExtracted | required | present | ✅ |
| strategy | required | present | ✅ |
| aiFallbackUsed | required | present | ✅ |
| entityTypes | required | present | ✅ |
| confidenceSummary | required | present with min/max/average/belowThreshold | ✅ |
| reviewStatus | required | present | ✅ |
| timestamp | required | present | ✅ |
| correlationId | optional | present | ✅ |

**ResumeEntityExtractionFailed payload matches plan Section 6.1:**
| Field | Plan | Implementation | Match? |
|-------|------|---------------|--------|
| processingId | required | present | ✅ |
| errorMessage | required | present | ✅ |
| reason | required | present (`'unknown'`) | ✅ |
| timestamp | required | present | ✅ |
| correlationId | optional | present | ✅ |

---

## Evidence 12: Test Coverage Verification

### Test File
`src/__tests__/resumeEntityExtractor.service.test.ts`

### Coverage Matrix

| Dimension | Test | Status |
|-----------|------|--------|
| HEADER extraction | extracts person entities from HEADER | ✅ PASS |
| EXPERIENCE extraction | extracts experience entities from EXPERIENCE | ✅ PASS |
| EDUCATION extraction | extracts education entities from EDUCATION | ✅ PASS |
| SKILLS extraction | extracts skill entities from SKILLS | ✅ PASS |
| PROJECTS extraction | extracts project entities from PROJECTS | ✅ PASS |
| CERTIFICATIONS extraction | extracts certification entities from CERTIFICATIONS | ✅ PASS |
| ACHIEVEMENTS extraction | extracts achievement entities from ACHIEVEMENTS | ✅ PASS |
| LANGUAGES extraction | extracts language entities from LANGUAGES | ✅ PASS |
| Empty section | returns empty for SUMMARY section | ✅ PASS |
| Empty input | returns empty for empty sections and rawText | ✅ PASS |
| Deduplication | deduplicates entities across sections | ✅ PASS |
| Confidence filter | filters entities below confidence threshold | ✅ PASS |
| Review status | assigns reviewStatus based on confidence | ✅ PASS |
| MergedFrom | sets mergedFrom when duplicates found | ✅ PASS |
| Statelessness | produces identical output for identical input | ✅ PASS |
| AI fallback trigger | triggers AI fallback when confidence low | ✅ PASS |
| AI unavailable | does not trigger AI fallback when provider unavailable | ✅ PASS |
| AI failure | handles AI fallback failure gracefully | ✅ PASS |
| Configurable model | passes custom AI model to provider | ✅ PASS |

**19 tests, 19 PASS.**

---

## Evidence 13: No Scope Creep

### Files Modified/Created
1. `src/models/ResumeEntity.ts` — CREATE
2. `src/services/resume/resumeEntityExtractor.service.ts` — CREATE
3. `src/__tests__/resumeEntityExtractor.service.test.ts` — CREATE
4. `src/shared/services/knowledgeDispatcher.service.ts` — MODIFY
5. `src/events/UaipEvents.ts` — MODIFY
6. `backend/RESUME-PARSER-ARCHITECTURE.md` — MODIFY

### Scope Verification
- No `ResumeAIEnhancer` implementation
- No `ResumeConfidenceScorer` implementation
- No DIC integration code
- No canonical model writes
- No frontend changes
- No new API routes
- No new npm dependencies

---

## Evidence 14: TypeScript Compilation

### Source Files Clean
- `src/models/ResumeEntity.ts` — 0 errors
- `src/services/resume/resumeEntityExtractor.service.ts` — 0 errors
- `src/shared/services/knowledgeDispatcher.service.ts` — 0 errors
- `src/events/UaipEvents.ts` — 0 errors
- `backend/RESUME-PARSER-ARCHITECTURE.md` — 0 errors

### Test Files
Pre-existing TS errors in test files (unrelated to Sprint 4).

### Test Results
```
Test Suites: 58 passed, 58 total
Tests:       437 passed, 437 total
```

No regressions from Sprint 3 baseline (418 tests). +19 new tests.

---

## Conclusion

Sprint 4 implementation is well-executed and follows the approved plan. The primary blocker is the `entityExtractionStrategy` enum mismatch which will cause runtime failures. All other findings are medium or low priority and can be addressed in follow-up work.

**Verdict:** APPROVED WITH FIXES

---

*End of Sprint 4 Code Review Evidence*
*Generated: 2026-07-25*
