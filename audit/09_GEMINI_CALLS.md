# Gemini / AI Callsite Inventory

Callsites discovered via `generateContent` and GoogleGenAI usage:

1) `backend/src/services/aiService.ts` (AIService)
  - Symbols: `generateSupportResponse`, `enhanceResumeFields`, `generateTemplateQuestions`, `analyzeImage`
  - Model: `gemini-2.5-flash` hardcoded in calls
  - Prompt/context: includes student context, schedule, and sometimes entire resume JSON (in `enhanceResumeFields` uses full resume JSON)
  - Authorization: protected controller endpoints call into this service (calls originate from authenticated controllers)
  - Data sent: potentially PII (full resume content, image Base64 in `analyzeImage`) — high sensitivity
  - Outputs: free text, sometimes parsed JSON — parsed via `JSON.parse` or custom parsers
  - Firestore writes: `aiService` and `aiController` may write logs to `aiChats` or `moodLogs` depending on flow

2) `backend/src/controllers/softSkillsController.ts` (`improveSentence`)
  - Sends `originalSentence` to Gemini with deterministic prompt requesting JSON response. Writes analysis result to Firestore collection `softskills`.
  - Data sensitivity: low-medium (user-entered text could be PII)

3) `backend/src/services/documentParserService.ts` (`parseDocumentData`)
  - Uses `ai.models.generateContent` with `inlineData` containing base64 of documents/images. Parses JSON out of response and returns structured object.
  - Data sensitivity: High (images, PDFs can contain PII)

4) `backend/src/controllers/researchController.ts` (multiple endpoints)
  - Uses generateContent for topic/outlines/abstract generation and may write/append to Firestore `research` collection.

5) Other callsites: `backend/src/core/ai/gemini.provider.ts`, `backend/src/core/ai/mock.provider.ts`, `backend/src/controllers/aiController.ts`.

Observations & Risks:
- Several callsites send raw user documents, resume JSON, or base64 images to Gemini. These are high PII exposures and must be minimized or redacted.
- Responses are parsed unsafely in some places via `JSON.parse` after naive markdown stripping; robust validation is required.
- Retention: AI outputs are written to Firestore for history/UX (e.g., `softskills`, `aiChats`) — consider data minimization and retention policies.

Recommendations:
1. Centralize AI calls in a single secure service that enforces redaction rules, minimal context, and request-level audit logging.
2. Apply strict schema validation on AI JSON outputs before persisting or using them.
3. For image/document parsing, avoid sending full-resolution PII images unless strictly necessary; consider client-side redaction or ephemeral processing with no persistent storage of raw images.

References:
- `backend/src/services/aiService.ts`
- `backend/src/controllers/softSkillsController.ts`
- `backend/src/services/documentParserService.ts`
