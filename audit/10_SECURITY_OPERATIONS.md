# Observability, Security & Operations

- Sentry integration: `sentry.server.config.ts` and docs present.
- Env-based secrets: Cloudinary and Gemini API keys used via `process.env.*`. Evidence: [backend/src/config/cloudinary.ts](backend/src/config/cloudinary.ts#L5-L8), [backend/testImage.ts](backend/testImage.ts#L9-L11).
Logging: watch for sensitive values in logs (`storageService.ts` logs original file names).

Validation note: No evidence found of logs that print token values in plaintext. Confirmed absence across key services scanned; unknowns remain for ad-hoc debug logs in other modules.
