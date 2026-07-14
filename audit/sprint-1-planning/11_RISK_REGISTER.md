# Risk Register

## High risks

1. Missing Technical Contract source
   - Status: SOURCE_ARTIFACT_UNAVAILABLE
   - Impact: contract-dependent decisions are BLOCKED unless supported by frozen audit artifacts.
   - Mitigation: use only `audit/11_CONTRACT_COMPATIBILITY_MATRIX.csv`, frozen Sprint 0 artifacts, and explicit prompt constraints.

2. F-001 Gmail OAuth state handling
   - Status: IN_SCOPE
   - Risk: proven attacker-controlled callback mapping.
   - Mitigation: plan server-side state validation, session/nonces, and explicit callback verification.

3. F-002 Gmail token persistence
   - Status: IN_SCOPE
   - Risk: confirmed plaintext token storage.
   - Mitigation: define token storage policy and compatibility options; preserve current data shape in planning.

4. F-003 Resume template ownership
   - Status: IN_SCOPE
   - Risk: authenticated template use without ownership validation.
   - Mitigation: define minimal post-read ownership checks.

## Medium/conditional risks

5. Tenant isolation sweep scope creep
   - Status: CONDITIONAL
   - Impact: if the sweep becomes broad, Sprint 1 may overrun.
   - Mitigation: restrict Sprint 1 to top-evidence flows and document any additional cases as candidate future work.

6. Growth duplicate investigation
   - Status: CONDITIONAL
   - Impact: unknown root cause may not justify Sprint 1 work.
   - Mitigation: plan only instrumentation and investigation; do not require deduplication unless confirmed.

7. API compatibility changes
   - Status: BLOCKED for changes not supported by explicit evidence.
   - Impact: external clients could break if endpoint signatures change.
   - Mitigation: require explicit API compatibility review before any contract-altering implementation.

## Low/Deferred risks

8. LocalStorage JWT strategy
   - Status: OUT_OF_SCOPE
   - Rationale: not in the smallest coherent Sprint 1.

9. AI/Gemini data minimization
   - Status: OUT_OF_SCOPE
   - Rationale: outside blocker scope and requires broader data-flow analysis.

10. Cloudinary MIME hardening
   - Status: OUT_OF_SCOPE
   - Rationale: not directly tied to P0 blocker evidence.

11. TenantContext rewrite
   - Status: OUT_OF_SCOPE
   - Rationale: current evidence does not require a full repository rewrite.

12. Profile/onboarding and observability
   - Status: OUT_OF_SCOPE
   - Rationale: not part of proven Sprint 1 blockers.
