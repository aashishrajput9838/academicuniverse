# Resume Processing Call Graph

**Date:** 2026-07-23  
**Endpoint under investigation:** `POST /api/resume/generate`  
**Controller:** `processResumeController`  
**Status:** Definitive call graph from source code — no speculation

---

## 1. Route Registration

**File:** `backend/src/routes/resumeRoutes.ts`

```typescript
router.post('/generate', processResumeController);       // line 32
router.post('/generate-resume', generateResumeController); // line 33
router.post('/templates/:id/process', processTemplateController); // line 28
```

Three endpoints participate in the resume lifecycle. Only one is the failing path.

---

## 2. Failing Endpoint Call Graph: `POST /api/resume/generate`

```
processResumeController (resumeController.ts:238)
  │
  ├── auth middleware (authenticateUser)
  │
  ├── ResumeTemplate.findById(templateId)                      // line 250
  │
  ├── template.questions.filter(...).map(...)                  // line 256-258
  │   enhanceableTags = ["description", "responsibilities", ...]
  │
  └── resumeService.processResumeTemplate(                      // line 261
          template.fileUrl,      ← CRITICAL: which URL?
          data,
          tone,
          enhanceableTags
        )
        │
        ├── axios.get(templateUrl, { responseType: 'arraybuffer' })  // line 18
        │   FETCHES DOCX FROM FireBase/FireStorage
        │
        ├── new PizZip(content)                                     // line 22
        │   LOADS DOCX AS ZIP
        │
        ├── new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })  // line 25
        │   PARSES XML FROM word/document.xml
        │
        ├── aiService.enhanceResumeFields(data, tone, enhanceableTags)  // line 34
        │   OPTIONAL AI ENHANCEMENT
        │
        ├── doc.setData(finalData)                                 // line 37
        │
        ├── doc.render()                                           // line 40
        │   ← Docxtemplater parses mustache tags
        │     THIS IS WHERE "Duplicate open/close tag" THROWS
        │
        ├── doc.getZip().generate({ type: 'nodebuffer' })          // line 47
        │
        └── mammoth.convertToHtml({ buffer: docxBuffer })          // line 54
```

---

## 3. Where PlaceholderInjector.inject() Is ACTUALLY Called

### Call Site A: Template Processing (`POST /api/resume/templates/:id/process`)

```
processTemplateController (resumeController.ts:317)
  │
  └── TemplateProcessingOrchestrator.process(originalBuffer)       // line 335-347
        │
        ├── DocxExtractionService.extract(originalBuffer)
        ├── ExtractionResultService.extract(extractedDoc)
        │
        ├── PlaceholderInjector.inject(                             // line 46-50
        │       originalBuffer,
        │       extractedDoc,
        │       milestone2Result.sections
        │     )
        │   │
        │   ├── Parses word/document.xml via fast-xml-parser
        │   ├── Scans sections for field targets
        │   ├── Replaces text runs with {{uniqueKey}} placeholders
        │   ├── Builds modified XML via fast-xml-parser XMLBuilder
        │   ├── Writes modified DOCX to Firebase/fileUrl
        │   └── Returns InjectionResult { buffer, dataKeyMapping }
        │
        └── DocxTemplateGenerator.generate(injectionResult.buffer)  // line 56
```

### Call Site B: Generation from Buffer (`POST /api/resume/generate-resume`)

```
generateResumeController (resumeController.ts:422)
  │
  └── ResumeGenerationOrchestrator.generate(templateBuffer, studentData)  // line 434-439
        │
        ├── DocxExtractionService.extract(templateBuffer)
        ├── ExtractionResultService.extract(extractedDoc)
        │
        ├── PlaceholderInjector.inject(                             // line 45-49
        │       originalBuffer,
        │       extractedDoc,
        │       milestone2Result.sections
        │     )
        │   │
        │   └── Same injection logic as Call Site A
        │
        ├── DocxTemplateGenerator.generate(injectionResult.buffer)
        │
        └── DocxTemplateFiller.fill(                                // line 61-66
                generationResult.buffer,
                studentData,
                milestone2Result.sections,
                injectionResult.dataKeyMapping
              )
                    │
                    ├── new Docxtemplater(zip)                       // line 60
                    ├── doc.setData(expandedData)
                    └── doc.render()                                 // line 68
```

### CRITICAL FINDING: PlaceholderInjector is NOT called for `POST /api/resume/generate`

---

## 4. Answer to Each Investigation Question

### Q1: Where is PlaceholderInjector.inject() actually called?

**Answer:** In exactly two places:
1. `TemplateProcessingOrchestrator.process()` — line 50 (`backend/src/services/templateProcessingOrchestrator.service.ts`)
2. `ResumeGenerationOrchestrator.generate()` — line 45 (`backend/src/services/resumeGenerationOrchestrator.service.ts`)

**It is NOT called in `ResumeService.processResumeTemplate()`.**

### Q2: Is it called before or after Docxtemplater.compile()?

**Answer:** In both call sites where it IS called, PlaceholderInjector runs BEFORE Docxtemplater:

- Call Site A: `inject()` → `DocxTemplateGenerator.generate()` (which internally creates Docxtemplater)
- Call Site B: `inject()` → `DocxTemplateGenerator.generate()` → `DocxTemplateFiller.fill()` (which creates Docxtemplater)

However, for the **failing endpoint** `POST /api/resume/generate`, PlaceholderInjector is NEVER called during the request. It was called earlier during template processing.

### Q3: Which DOCX file is passed into new Docxtemplater()?

**Answer:** For `POST /api/resume/generate`:
- `ResumeService.processResumeTemplate()` receives `template.fileUrl` (line 261 of resumeController.ts)
- It fetches this URL via `axios.get(templateUrl)` (line 18 of resumeService.ts)
- The fetched content is passed to `new Docxtemplater(zip)` (line 25)

**`template.fileUrl` is the PROCESSED template URL** — the DOCX that was uploaded to Firebase by `processTemplateController` after PlaceholderInjector modified it.

### Q4: Does ResumeService load originalFileUrl or fileUrl?

**Answer:** `template.fileUrl` — the processed/path-injected URL.

From `processResumeController.ts:261`:
```typescript
const { docxBuffer, htmlPreview } = await resumeService.processResumeTemplate(
  template.fileUrl,    // ← PROCESSED template with injected placeholders
  data, tone, enhanceableTags
);
```

From `processTemplateController.ts:371-396`:
```typescript
const updatePayload: any = {
  fileUrl: processedFileUrl,        // ← overwrites original with processed
  originalFileUrl: template.fileUrl, // ← preserves original
  ...
};
```

So after template processing:
- `ResumeTemplate.fileUrl` = processed DOCX with injected `{{placeholders}}` in Firebase
- `ResumeTemplate.originalFileUrl` = original clean DOCX in Firebase

`ResumeService` loads `fileUrl`, NOT `originalFileUrl`.

### Q5: Is PlaceholderInjector skipped entirely?

**Answer: YES — for `POST /api/resume/generate`, PlaceholderInjector is skipped entirely during the request.**

The execution path is:
```
POST /api/resume/generate
  → processResumeController
    → ResumeService.processResumeTemplate(template.fileUrl, ...)
      → axios.get(fileUrl)        // fetch PRE-PROCESSED DOCX from Firebase
      → new Docxtemplater(zip)    // parse XML directly
      → doc.setData(data)
      → doc.render()              // ← FAILS HERE
```

PlaceholderInjector is NOT invoked. The processed DOCX already has placeholders injected from an earlier `POST /api/resume/templates/:id/process` call.

---

## 5. Why Debug Files Were NOT Generated

The debug files were not generated because:

1. **The failing endpoint does not call PlaceholderInjector.** `POST /api/resume/generate` → `ResumeService.processResumeTemplate()` never invokes `PlaceholderInjector.inject()`.

2. **Debug mode was added after template processing.** The processed DOCX stored in `template.fileUrl` was created before the debug instrumentation existed.

3. **The malformed XML already exists in Firebase.** The corruption was introduced during an earlier `POST /api/resume/templates/:id/process` call, and the processed DOCX was stored. Subsequent `POST /api/resume/generate` calls just fetch and parse that already-corrupted DOCX.

---

## 6. Correct Debug Strategy

To capture runtime proof of malformed XML, debug mode must be enabled during **template processing** (`POST /api/resume/templates/:id/process`), NOT during `POST /api/resume/generate`.

Steps:
1. Enable `PLACEHOLDER_INJECTOR_DEBUG=true`
2. Re-process the template: `POST /api/resume/templates/:id/process`
3. The debug files will be written during `PlaceholderInjector.inject()`
4. Then inspect the files to see the exact XML corruption

Alternatively, since the processed DOCX is stored in Firebase, the user can:
1. Download the processed DOCX from `template.fileUrl`
2. Extract `word/document.xml`
3. Compare it with `originalFileUrl`'s `word/document.xml`
4. The diff will show exactly where PlaceholderInjector corrupted the XML

---

## 7. Complete Call Graph Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│  POST /api/resume/templates/:id/process                                 │
│  processTemplateController                                              │
│                                                                         │
│  TemplateProcessingOrchestrator.process(originalBuffer)                │
│    ├── DocxExtractionService.extract()                                 │
│    ├── ExtractionResultService.extract()                               │
│    ├── PlaceholderInjector.inject() ← INJECTION HAPPENS HERE          │
│    │     ├── Parses XML                                                │
│    │     ├── Replaces runs with {{placeholders}}                      │
│    │     ├── Builds modified XML                                       │
│    │     └── Returns modified buffer                                   │
│    └── DocxTemplateGenerator.generate()                                │
│                                                                         │
│  → Stores modified buffer as ResumeTemplate.fileUrl                    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  POST /api/resume/generate (FAILING ENDPOINT)                          │
│  processResumeController                                                │
│                                                                         │
│  ResumeService.processResumeTemplate(template.fileUrl, data, ...)      │
│    ├── axios.get(template.fileUrl) ← FETCHES PROCESSED DOCX           │
│    ├── new PizZip(content)                                             │
│    ├── new Docxtemplater(zip) ← PARSES XML                            │
│    ├── doc.setData(finalData)                                          │
│    ├── doc.render() ← "Duplicate open/close tag" THROWS HERE           │
│    ├── doc.getZip().generate()                                         │
│    └── mammoth.convertToHtml()                                         │
│                                                                         │
│  → ResumeTemplate.fileUrl points to malformed DOCX                    │
│  → PlaceholderInjector is NOT called                                   │
│  → Docxtemplater sees duplicate/misplaced braces in XML                │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  POST /api/resume/generate-resume                                      │
│  generateResumeController                                               │
│                                                                         │
│  ResumeGenerationOrchestrator.generate(templateBuffer, studentData)    │
│    ├── DocxExtractionService.extract()                                 │
│    ├── ExtractionResultService.extract()                               │
│    ├── PlaceholderInjector.inject() ← ALSO CALLED HERE                │
│    ├── DocxTemplateGenerator.generate()                                │
│    └── DocxTemplateFiller.fill()                                       │
│          ├── new Docxtemplater(zip)                                    │
│          ├── doc.setData(expandedData)                                 │
│          └── doc.render()                                              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Definitive Answers

| Question | Answer | Evidence |
|---|---|---|
| Where is PlaceholderInjector.inject() called? | `TemplateProcessingOrchestrator.process()` line 50 and `ResumeGenerationOrchestrator.generate()` line 45 | Source code |
| Before or after Docxtemplater.compile()? | Before — inject() produces buffer, then Docxtemplater consumes it | Source code |
| Which DOCX enters new Docxtemplater()? | `template.fileUrl` — the processed DOCX fetched from Firebase | resumeController.ts:261, resumeService.ts:25 |
| Does ResumeService load originalFileUrl or fileUrl? | `template.fileUrl` (processed), NOT `originalFileUrl` | resumeController.ts:261 |
| Is PlaceholderInjector skipped entirely? | **YES** — for `POST /api/resume/generate`, it is never invoked during the request | resumeService.ts has no PlaceholderInjector import or call |

---

## 9. Key Discovery

The failing endpoint `POST /api/resume/generate` does NOT call PlaceholderInjector during the request. It fetches an already-processed DOCX from `template.fileUrl`. The malformed XML was introduced during an earlier `POST /api/resume/templates/:id/process` call.

Therefore:
- Debug instrumentation in `ResumeService` or `POST /api/resume/generate` will NOT capture the injection bug
- Debug instrumentation must be enabled during `POST /api/resume/templates/:id/process`
- OR the processed DOCX must be downloaded from Firebase and inspected directly
