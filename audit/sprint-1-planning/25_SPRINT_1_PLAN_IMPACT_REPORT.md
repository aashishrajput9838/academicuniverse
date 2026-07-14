(This file maps the consolidated normative baseline (CB items) to Sprint-1 planning artifacts and records required corrections.)

Summary of material impacts

- Tenant isolation (CB-0001, CB-0002)
	- Affects: `01_SPRINT_1_CHARTER.md`, `05_TENANCY_AUTHORIZATION_PLAN.md`, `03_SCOPE_IN_OUT.md`
	- required correction: Ensure `05_TENANCY_AUTHORIZATION_PLAN.md` explicitly mandates server-derived `organizationId` enforcement, repository lookup patterns using `{_id, organizationId}`, and index design per NC-0003/NC-0004.
	- materiality: HIGH

- Gmail/OAuth sensitive flows (CB-0006)
	- Affects: `04_P0_BLOCKER_TREATMENT_PLAN.md`, `06_DATA_MIGRATION_COMPATIBILITY_PLAN.md`, `09_TEST_STRATEGY.md`
	- required correction: Add encryption-at-rest decision, token re-encryption migration plan, and callback state integrity hardening to P0 treatment and migration plan.
	- materiality: CRITICAL

- Idempotency and outbox patterns (CB-0004)
	- Affects: `08_IMPLEMENTATION_SEQUENCE.md`, `07_API_COMPATIBILITY_PLAN.md`, `09_TEST_STRATEGY.md`
	- required correction: Add explicit Idempotency-Key enforcement requirement, outbox transactional design, and acceptance tests for idempotency/retry semantics.
	- materiality: HIGH

- Deletion and projection hygiene (CB-0005)
	- Affects: `10_ROLLBACK_RECOVERY_PLAN.md`, `12_DEFINITION_OF_DONE.md`
	- required correction: Define projection/index deletion steps in migration/rollback plans and include verification tests.
	- materiality: MEDIUM

Per-artifact action list (examples)
- `05_TENANCY_AUTHORIZATION_PLAN.md`: Add exact NC/CB citations (NC-0001, NC-0003, CB-0001).
- `04_P0_BLOCKER_TREATMENT_PLAN.md`: Insert CB-0006 remediation checklist (encryption decision, revoke behavior, migration plan).
- `09_TEST_STRATEGY.md`: Add tests for cross-tenant negative authorization, callback state integrity, token migration, idempotency replay, retry behavior, 409 semantics, and outbox delivery.

Notes:
- No planning artifacts were modified by this report. The report lists required exact file/section corrections to be performed under separate authorization.



