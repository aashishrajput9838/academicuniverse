# 19_LINEAGE_AWARE_CONTRACT_RECONCILIATION

Summary
- Sources read (full JSON): `Academic_Universe_MVP_Technical_Contract_v1.0_Draft.json`, `..._Pass2.json`, `..._Pass3.json`, `..._Pass4.json` (confirmed present and SHA-256 matched to `18_SOURCE_CONTRACT_VERIFICATION.md`). DOCX files used for contextual verification where JSON contains flattened structure.
- Draft identity: `FOUNDATIONAL_DRAFT_ONLY` (Draft JSON labeled `status: WORKING_DRAFT`; no pass-1 identity markers).

What this report contains
- Complete normative clause ledger extraction from the four JSON families (NC-0001..NC-0024).
- Cross-pass clause evolution records mapping Draft→Pass2, Pass2→Pass3, Pass3→Pass4, Draft→Pass3, Draft→Pass4.
- Contract conflict register (no direct contradictions found; provisional zero unresolved conflicts beyond those requiring policy decisions).
- Consolidated normative baseline (CB-0001..CB-0006) built conservatively from NC support.

Methodology and evidence rules
- JSON files used as primary extraction artifacts; DOCX consulted for wording/paragraph-level confirmations where JSON compression risked loss of exceptions or conditions.
- Every NC row cites `source_file` and a JSON path (top-level section name or key) as evidence.
- No placeholder NC rows were carried into the ledger.

Lineage highlights (short)
- Draft → Pass2: NO_LINEAGE_EVIDENCE (Draft expresses foundational invariants; Pass2 introduces engineering ownership rules without explicit "derived from Draft" markers in JSON). Evidence: Draft `non_negotiable_invariants` vs Pass2 `organization_ownership_rules` (no explicit cross-reference).
- Pass2 → Pass3: CLARIFIED / EXPANDED where Pass3 refines schema invariants and index rules (evidence: Pass2 `schemas` vs Pass3 `academic_schemas` index/invariant blocks).
- Pass3 → Pass4: EXPLICIT_REFINEMENT where Pass3 `pass4_queue` explicitly lists items implemented in Pass4 and Pass4 JSON contains idempotency, endpoint, and outbox patterns.

Next steps (locked until acceptance)
- The full NC ledger and CB baseline are embedded in `20_NORMATIVE_CLAUSE_LEDGER.csv` and `22_CONSOLIDATED_NORMATIVE_BASELINE.md` respectively. Reviewers should validate mapping from JSON paths to NC IDs before any policy resolution.

Evidence files consulted
- audit/source-contracts/Academic_Universe_MVP_Technical_Contract_v1.0_Draft.json (primary)
- audit/source-contracts/Academic_Universe_MVP_Technical_Contract_v1.0_Pass2.json (primary)
- audit/source-contracts/Academic_Universe_MVP_Technical_Contract_v1.0_Pass3.json (primary)
- audit/source-contracts/Academic_Universe_MVP_Technical_Contract_v1.0_Pass4.json (primary)
- audit/sprint-1-planning/18_SOURCE_CONTRACT_VERIFICATION.md (verification hashes)

Assurance
- SHA-256 of all 8 artifacts verified against `18_SOURCE_CONTRACT_VERIFICATION.md` during extraction.
- No source files modified.

Conservative note
- This reconciliation remains conservative: where clause wording was ambiguous or conditional, the clause was preserved verbatim or recorded as a separate constrained NC. Any unresolved modal conflicts are recorded in the conflict register and left for policy decision.
