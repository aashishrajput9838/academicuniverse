"use strict";

const fs = require('fs');
const path = require('path');

async function main() {
  const templatePath = path.join(__dirname, 'proper-headings-template.docx');
  const originalBuffer = fs.readFileSync(templatePath);

  const { TemplateProcessingOrchestrator } = require('./src/services/templateProcessingOrchestrator.service');
  const orchestrator = new TemplateProcessingOrchestrator({ enableAiAssistance: false });

  console.log('Running end-to-end pipeline...');
  console.log(`Template: ${templatePath}`);
  console.log(`Size: ${originalBuffer.length} bytes\n`);

  const result = await orchestrator.process(originalBuffer);

  console.log('=== PIPELINE RESULT ===');
  console.log(`Success: ${result.success}`);
  console.log(`Issues: ${result.issues.join(', ') || 'none'}`);

  console.log('\n=== MILESTONE 2 (SECTION DETECTION) ===');
  console.log(`Sections detected: ${result.milestone2Result.sections.length}`);
  result.milestone2Result.sections.forEach((s, i) => {
    console.log(`  [${i}] "${s.title}" | headingParagraphIndex=${s.headingParagraphIndex} | fields=${s.fields.map(f => f.key).join(', ')}`);
  });

  console.log('\n=== PLACEHOLDER INJECTION ===');
  console.log(`Placeholders injected: ${result.injectionResult.placeholdersInjected}`);
  console.log(`Data key mapping:`, result.injectionResult.dataKeyMapping || '{}');
  console.log(`Issues: ${result.injectionResult.issues.join(', ') || 'none'}`);

  console.log('\n=== GENERATION ===');
  console.log(`Success: ${result.generationResult.success}`);
  console.log(`Output size: ${result.generationResult.buffer.length} bytes`);
  console.log(`Issues: ${result.generationResult.issues.join(', ') || 'none'}`);

  if (result.injectionResult.success && result.injectionResult.placeholdersInjected > 0) {
    const outputPath = path.join(__dirname, 'proper-headings-pipeline-output.docx');
    fs.writeFileSync(outputPath, result.processedBuffer);
    console.log(`\nOutput written to: ${outputPath}`);
  }

  if (process.env.PLACEHOLDER_INJECTOR_DEBUG === 'true') {
    const debugLog = orchestrator['placeholderInjector'].getDebugLog();
    console.log('\n=== DEBUG LOG ===');
    console.log(debugLog.join('\n'));
  }
}

main().catch(err => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
