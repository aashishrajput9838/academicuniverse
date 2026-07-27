# Milestone-2 Architecture Decision Records — Sprint-021

**Status:** APPROVED
**Date:** 2026-07-22

---

## ADR-001: Rule-Based Extraction as Primary Engine

### Context

The initial plan proposed a hybrid approach where both rule-based and AI methods could be considered primary depending on document complexity.

### Decision

Rule-based extraction is the **sole primary engine**. AI is used only for ambiguity resolution when explicitly enabled via the `enableAiAssistance` feature flag.

### Rationale

- **Determinism**: Rule-based extraction produces identical outputs for identical inputs, which is critical for testing and debugging.
- **Cost**: No API cost unless explicitly opted in. Production deployments can independently decide whether to enable AI.
- **Speed**: No network latency in the default path. Extraction completes in milliseconds.
- **Testability**: Pure function with no external dependencies. All 34 tests run offline.
- **Backward compatibility**: Doesn't change the Milestone-1 contract shape or introduce new required fields.

### Consequences

- Some edge cases may be missed by the rule set (e.g., unconventional heading styles).
- AI enhancement requires explicit opt-in via `enableAiAssistance` constructor parameter or environment variable.
- Entity detection quality in default mode depends entirely on regex coverage.
- Section detection quality depends on keyword coverage and formatting heuristics.

### Alternatives Considered

- **AI-first with rule fallback**: Rejected due to non-determinism, cost, and testability concerns.
- **Equal-weight hybrid**: Rejected because it complicates the pipeline without clear benefit over rule-based primary.

---

## ADR-002: AI Gated Behind Feature Flag `enableAiAssistance`

### Context

AI integration introduces network dependency, cost, and non-determinism. We need a mechanism to control when AI is used.

### Decision

All AI capabilities are gated behind a boolean feature flag: `enableAiAssistance`. Default is `false` in tests and production unless explicitly overridden.

### Rationale

- **Test isolation**: Tests must run in CI without external dependencies. Default `false` ensures deterministic tests.
- **Opt-in cost control**: Production deployments can opt into AI cost when ready.
- **Explicit behavior**: Makes AI usage explicit and auditable. No hidden network calls.
- **Graceful degradation**: When flag is `false`, pipeline behaves as a pure rule-based system.

### Consequences

- Need to maintain two code paths (rule-only and AI-assisted).
- `EntityDetectorService` constructor requires `EntityDetectorConfig` with flag.
- `ExtractionResultService` constructor requires `ExtractionOptions` with flag.
- Telemetry and logging must track flag state for debugging.

### Alternatives Considered

- **Environment variable only**: Rejected because constructor flag is more testable and composable.
- **Auto-detect AI availability**: Rejected because "availability" is ambiguous (network up ≠ API key valid).

---

## ADR-003: Graceful Degradation on AI Failure

### Context

AI services can timeout, rate-limit, return malformed JSON, or fail for network reasons. The pipeline must not crash because of AI errors.

### Decision

Pipeline never throws due to AI errors. On failure, it appends a warning to `extractionIssues` and continues with rule-only entities.

### Rationale

- **Extraction is the bottleneck; AI is an enhancement**: A partial result is better than an error.
- **User experience**: Users prefer degraded extraction over empty errors.
- **Review queue**: `extractionIssues` captures AI failures for human review.
- **Resilience**: Try/catch with 15s timeout prevents indefinite hangs.

### Consequences

- Confidence score reflects AI failure (reduced weighting due to warning issues).
- `extractionIssues` can accumulate warnings across services.
- No retry storms (max 2 retries, then give up and log warning).
- Callers must check `extractionIssues` to determine if AI enhancement succeeded.

### Alternatives Considered

- **Propagate AI errors to caller**: Rejected because it breaks the "never fail" guarantee.
- **Retry indefinitely**: Rejected because it risks hanging the pipeline.

---

## ADR-004: No New Dependencies for Core Pipeline

### Context

Milestone-2 was approved with no new dependencies.

### Decision

Use only `@google/genai` (already in package.json). No new packages added.

### Rationale

- Keeps install surface unchanged.
- Avoids version conflicts with existing dependencies.
- `@google/genai` is already managed by the project.

### Consequences

- Regex entity extraction must be implemented manually.
- Formatting analysis must be implemented without specialized libraries.
- JSON parsing of AI responses must use `JSON.parse` with regex fallback.

### Alternatives Considered

- **Add entity extraction library**: Rejected due to dependency policy.
- **Use different AI provider**: Rejected because `@google/genai` is already configured.

---

## ADR-005: Backward Compatibility with Milestone-1

### Context

Milestone-1 services and types must continue to work unchanged. Milestone-2 builds on top, not into, Milestone-1.

### Decision

Milestone-2 is implemented as **new services only**. No modifications to existing Milestone-1 files.

### Rationale

- Prevents regression.
- Allows independent versioning.
- Enables gradual rollout.
- Keeps test isolation.

### Consequences

- `DocxExtractionService` is unchanged.
- No controller changes.
- Milestone-1 test suite is the regression safety net.
- New types (`milestone2.types.ts`) import from Milestone-1 but don't modify it.

### Alternatives Considered

- **Modify Milestone-1 services to add AI hooks**: Rejected due to regression risk and coupling.

---

## ADR-006: Immutable Service Design

### Context

Milestone-1 established `DocxExtractionService` as immutable (never modifies input buffer, never writes back).

### Decision

All Milestone-2 services follow the same immutable pattern: input is read-only, output is new objects.

### Rationale

- Consistent with Milestone-1 design.
- Prevents side effects in pipeline.
- Enables safe parallel execution if needed in future.
- Simplifies testing (no cleanup needed).

### Consequences

- `ExtractedDocument` is never mutated by Milestone-2 services.
- `Milestone2Result` is a fresh object each call.
- No in-place updates to sections or entities after creation.

### Alternatives Considered

- **Mutable builder pattern**: Rejected due to inconsistency with Milestone-1 and test complexity.

---

## ADR-007: Separate Orchestrator Service

### Context

Milestone-2 has 4 sub-services (section detector, entity detector, confidence scorer, formatting builder). Need a way to compose them.

### Decision

`ExtractionResultService` acts as an orchestrator. It instantiates sub-services, calls them in order, collects issues, and returns the final result.

### Rationale

- Clean separation of concerns.
- Easy to reconfigure pipeline (e.g., swap AI provider).
- Single entry point for future Milestones.
- Testable via mocking sub-services.

### Consequences

- `ExtractionResultService` constructor has 4 dependencies.
- Top-level API is `extract(document: ExtractedDocument): Promise<Milestone2Result>`.
- Sub-services are not directly exposed to controllers (only orchestrator is).

### Alternatives Considered

- **Static utility functions**: Rejected because they make dependency injection and testing harder.
- **Middleware chain**: Rejected because it adds complexity without clear benefit for a 4-step pipeline.

---

## ADR-008: AI Only in EntityDetectorService

### Context

Initial plan suggested AI could assist in section detection as well as entity detection.

### Decision

AI is **only** used in `EntityDetectorService`. `SectionDetectorService` is rule-only in Milestone-2.

### Rationale

- Keeps the primary engine (section detection) fully deterministic.
- Entity detection benefits most from AI (named entity recognition).
- Limits AI dependency to one service, reducing failure surface.
- Simplifies testing (only one service needs AI mocking).

### Consequences

- Section detection quality depends entirely on rules.
- Some unconventional headings may be missed.
- AI disambiguation for sections is deferred to Milestone-3 if needed.

### Alternatives Considered

- **AI in both services**: Rejected due to increased complexity and test burden.

---

*End of Architecture Decision Records*
