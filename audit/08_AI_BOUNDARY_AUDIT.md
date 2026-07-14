# AI / Gemini Boundary Audit

 Evidence of Gemini usage:
   - `backend/testImage.ts` references `process.env.GEMINI_API_KEY` and model `gemini-2.5-flash`. Evidence: [backend/testImage.ts](backend/testImage.ts#L9-L25).
   - Architecture docs reference `GeminiAIProvider` and provider files in modular plan docs.

 Observations:
   - AI conversation logs are written to Firestore (`aiChats`, `moodLogs`). Evidence: [backend/src/controllers/aiController.ts](backend/src/controllers/aiController.ts#L76-L105).

 Decision: KEEP provider but REFACTOR boundary & PII handling in Sprint 1.

 Validation note: classification is CONFIRMED_RISK — calls and persistence are statically present; runtime data review not performed so exact PII fields present per-record are UNKNOWN and require sampling in staging.
