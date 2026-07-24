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

  const options = { enableAiAssistance: false };
  const docxService = new DocxExtractionService();
  const sectionDetector = new SectionDetectorService(options);
  const extractionResultService = new ExtractionResultService(options);
  const placeholderInjector = new PlaceholderInjector();
  placeholderInjector.enableDebug();

  const extractedDoc = await docxService.extract(originalBuffer);
  const milestone2Result = await extractionResultService.extract(extractedDoc);
  const injectionResult = await placeholderInjector.inject(originalBuffer, extractedDoc, milestone2Result.sections);

  console.log('=== EXTRACTED PARAGRAPHS ===');
  extractedDoc.paragraphs.forEach((p, i) => {
    console.log(`  [${i}] rawText="${p.rawText}" | runs=${p.runs.length} | isHeading=${sectionDetector['headingDetector']?.isHeading?.(p, extractedDoc) ?? 'N/A'}`);
  });

  console.log('\n=== DETECTED SECTIONS ===');
  milestone2Result.sections.forEach((s, i) => {
    console.log(`  [${i}] "${s.title}" | headingParagraphIndex=${s.headingParagraphIndex} | fields=[${s.fields.map(f => f.key).join(', ')}]`);
  });

  console.log('\n=== DEBUG LOG ===');
  const debugLog = placeholderInjector.getDebugLog();
  console.log(debugLog.join('\n'));

  console.log('\n=== OUTPUT PLACEHOLDERS ===');
  const z = require('pizzip')(injectionResult.buffer);
  const x = z.file('word/document.xml').asText();
  const matches = x.match(/\{\{[^}]+\}\}/g);
  console.log('Found:', matches);
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
