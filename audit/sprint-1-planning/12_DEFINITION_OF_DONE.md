# Definition of Done

## Sprint 1 planning definition of done
- All 14 planning artifacts are created in `audit/sprint-1-planning/`.
- The plan explicitly documents SOURCE_ARTIFACT_UNAVAILABLE for missing Technical Contract Passes 1–4.
- The plan preserves frozen audit classifications for F-001, F-002, and F-003.
- The plan does not include any production code changes.
- The plan distinguishes IN_SCOPE, OUT_OF_SCOPE, CONDITIONAL, and BLOCKED items.
- The plan delivers a P0 blocker treatment plan and tenancy authorization plan.
- The plan defines API compatibility, migration compatibility, test strategy, rollback guidance, and risk register.
- The plan includes stable executable test IDs TC-001 through TC-014 mapped to blocker remediation and compatibility items.
- The plan states remaining UNKNOWNs and preconditions before coding.

## Implementation definition of done (for later sprints)
- F-001 remediation is implemented with callback verification and consistent state handling.
- F-002 token storage policy is implemented in a backward-compatible manner.
- F-003 template ownership validation is implemented and covered by tests.
- No external API signatures are changed unless explicitly approved.
- Regression tests verify existing route behavior.
