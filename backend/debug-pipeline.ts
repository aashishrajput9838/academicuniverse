"use strict";

const fs = require('fs');
const path = require('path');

async function main() {
  const templatePath = path.join(__dirname, 'proper-headings-template.docx');
  const originalBuffer = fs.readFileSync(templatePath);

  const { DocxExtractionService } = require('./src/services/docxExtraction.service');
  const { SectionDetectorService } = require('./src/services/sectionDetector.service');
  const { PlaceholderInjector } = require('./src/services/placeholderInjector.service');
  const { ExtractionResultService } = require('./src/services/extractionResult.service');
  const { ExtractionOptions } = require('./src/services/milestone2.types');

  const options = { enableAiAssistance: false };
  const docxService = new DocxExtractionService();
  const sectionDetector = new SectionDetectorService(options);
  const extractionResultService = new ExtractionResultService(options);
  const placeholderInjector = new PlaceholderInjector();
  placeholderInjector.enableDebug();

  console.log('=== STEP 1: EXTRACTION ===');
  const extractedDoc = await docxService.extract(originalBuffer);
  console.log(`Paragraphs extracted: ${extractedDoc.paragraphs.length}`);
  extractedDoc.paragraphs.forEach((p, i) => {
    console.log(`  [${i}] raw="${p.rawText}" | runs=${p.runs.length} | bold=${p.runs[0]?.formatting.bold || false} | fontSize=${p.runs[0]?.formatting.fontSize || 0}`);
  });

  console.log('\n=== STEP 2: SECTION DETECTION ===');
  const milestone2Result = await extractionResultService.extract(extractedDoc);
  console.log(`Sections detected: ${milestone2Result.sections.length}`);
  milestone2Result.sections.forEach((s, i) => {
    console.log(`  [${i}] "${s.title}" | headingParagraphIndex=${s.headingParagraphIndex} | fields=${s.fields.map(f => f.key).join(', ')}`);
  });

  console.log('\n=== STEP 3: PLACEHOLDER INJECTION ===');
  const injectionResult = await placeholderInjector.inject(originalBuffer, extractedDoc, milestone2Result.sections);
  console.log(`Placeholders injected: ${injectionResult.placeholdersInjected}`);
  console.log(`Data key mapping:`, JSON.stringify(injectionResult.dataKeyMapping, null, 2));

  console.log('\n=== DEBUG LOG ===');
  const debugLog = placeholderInjector.getDebugLog();
  console.log(debugLog.join('\n'));

  console.log('\n=== PLACEHOLDERS IN OUTPUT ===');
  const z = require('pizzip')(injectionResult.buffer);
  const x = z.file('word/document.xml').asText();
  const matches = x.match(/\{\{[^}]+\}\}/g);
  console.log('Found:', matches);
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
