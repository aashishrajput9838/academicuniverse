# Rollback & Recovery Plan

## Objective
Define the rollback and recovery guidance for the Sprint 1 implementation phase.

## Context
- Sprint 1 is a planning sprint; no production changes are made yet.
- The recovery plan is preparatory and should be used when Sprint 1 work moves to implementation.

## Rollback principles
- Keep remediation scoped to high-risk flows so rollback is simple.
- Prefer backend-only authorization hardening with minimal side effects.
- Preserve existing route and request semantics to avoid broad contract rollback.

## Recovery guidance
- If a planned Gmail state validation change causes a regression, revert to the previous callback handling and isolate the fix behind a staging flag.
- If token storage compatibility work causes data access errors, roll back to the previous `gmailTokens` schema handling while preserving data.
- If resume template ownership validation blocks legitimate requests, temporarily allow known safe templates and add diagnostics.

## Preconditions for rollback
- Implementation must include a documented fallback mode or feature flag for safety-critical changes.
- The implementation unit should be small enough that reverting a single service/controller change restores prior behavior.

## Sprint 1-specific recovery note
- Because Sprint 1 is planning-only, this document remains a blueprint; actual rollback procedures will be defined during implementation.
