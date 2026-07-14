# Test Strategy

## Objective
Define the testing approach for Sprint 1 planning and subsequent implementation verification.

## Verified current reality
- Backend routes use JWT auth and existing middleware.
- Gmail callback flow is a high-risk authentication/authorization vector.
- Resume template generation flow is a high-risk tenant control vector.

## Test types
1. Static validation
   - Review controller/service code for `findById` and `organizationId` checks.
   - Validate that the planning recommendations preserve current API shapes.

2. Unit test planning
   - Plan unit tests for Gmail callback state validation:
     - valid state accepted and user bound correctly
     - tampered state rejected
     - missing state rejected
     - wrong-session/user state rejected
   - Plan unit tests for Gmail token storage compatibility:
     - plaintext token read compatibility preserved
     - encrypted-token shape accepted when present
     - `refreshToken` preserving behavior when Google omits a new refresh token
     - disconnect clearing behavior expected
   - Plan unit tests for resume template ownership validation:
     - same-org template access allowed
     - cross-org template access denied
     - nonexistent template handled safely
     - guessed template ID denied or rejected consistently

3. Integration test planning
   - Plan integration tests for protected resume generation with cross-tenant template IDs.
   - Plan integration tests for Gmail callback acceptance/rejection behavior, including callback compatibility with existing redirect semantics.

4. Regression test planning
   - Document that existing authenticated endpoints should continue to operate unchanged.
   - Ensure any future implementation preserves `/api/gmail/callback` and `/api/resume/generate` request signature compatibility.

## Planned executable test cases
- TC-001: Gmail callback valid state flow
- TC-002: Gmail callback tampered state
- TC-003: Gmail callback missing state
- TC-004: Gmail callback wrong user/state binding
- TC-005: Gmail token plaintext compatibility read
- TC-006: Gmail token encrypted compatibility read/write
- TC-007: Gmail refresh token preserves existing token when absent
- TC-008: Gmail disconnect clears stored tokens
- TC-009: Resume generation same-org template access
- TC-010: Resume generation cross-org template denial
- TC-011: Resume generation nonexistent-template handling
- TC-012: Resume generation guessed template ID handling
- TC-013: Regression compatibility for `/api/gmail/callback` request shape
- TC-014: Regression compatibility for `/api/resume/generate` request shape

## Test categories
- TEST_CATEGORY: Gmail callback
  - TC-001, TC-002, TC-003, TC-004
- TEST_CATEGORY: Gmail token compatibility
  - TC-005, TC-006, TC-007, TC-008
- TEST_CATEGORY: Resume template ownership
  - TC-009, TC-010, TC-011, TC-012
- TEST_CATEGORY: Regression compatibility
  - TC-013, TC-014

## Conditional tests
- Growth investigation tests should be defined only if the root cause is confirmed.
- No tests are planned for AI/Gemini or Cloudinary hardening in Sprint 1.

## Deliverables
- Planned test cases for Sprint 1 safety work.
- A mapping from blocker treatment items to specific tests.
- A list of tests that are intentionally deferred to later sprints.
