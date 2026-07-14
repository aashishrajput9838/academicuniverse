# Implementation Sequence

## Objective
Define the smallest sequence of planning and preparation work for Sprint 1.

## Sequence
1. Confirm constraints and scope
   - Validate that no production code will be changed during planning.
   - Document missing Technical Contract source and preserve SOURCE_ARTIFACT_UNAVAILABLE.
   - Confirm the frozen audit classification and blocker status.

2. Define targeted remediation plans for P0 items
   - F-001 Gmail callback state handling.
   - F-002 Gmail token storage compatibility.
   - F-003 Resume template ownership validation.

3. Define tenancy authorization boundaries
   - Identify tenant-owned resource patterns and minimal ownership checks.
   - Use existing `authenticateUser` / `req.organizationId` as the integration point.

4. Define compatibility and migration constraints
   - Document backend-only compatibility for Gmail token storage.
   - Specify that external API signatures remain unchanged unless explicitly required.

5. Define test strategy and rollback/recovery plan
   - Focus on validation of authorization and compatibility assumptions.

6. Finalize risk register and go/no-go criteria
   - Record remaining UNKNOWNs and conditional dependencies.

## Rationale
- The sequence avoids broad refactor and keeps planner effort bounded.
- It preserves the existing production behavior while preparing the smallest safe remediation sprint.
- It ensures no incremental implementation takes place before definition and review.

## Sprint 1 implementation unit count estimate
- 1 planning unit for Gmail OAuth state treatment.
- 1 planning unit for Gmail token persistence compatibility.
- 1 planning unit for resume template ownership validation.
- 1 planning unit for tenancy authorization boundary definition.
- 1 planning unit for compatibility, risk register, and go/no-go documentation.

## Notes
- These are planning units, not code tasks, to preserve the planning-only phase requirement.
- Map planned executable tests TC-001 through TC-014 to the blocker remediation and compatibility units.
- Growth duplicate-call investigation remains CONDITIONAL future work and is intentionally not included as a Sprint 1 implementation unit.
