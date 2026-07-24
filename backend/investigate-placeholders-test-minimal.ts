import dotenv from 'dotenv';
import path from 'path';
const envPath = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
dotenv.config({ path: path.resolve(__dirname, envPath) });

import PizZip from 'pizzip';
import { DocxExtractionService } from './src/docxExtraction.service';
import { SectionDetectorService } from './src/services/sectionDetector.service';
import { PlaceholderInjector } from './src/services/placeholderInjector.service';
import { DocxTemplateGenerator } from './src/services/docxTemplateGenerator.service';
import mammoth from 'mammoth';
import fs from 'fs';

const ORIGINAL_FILE = '../backend/test-minimal.docx';

function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{\{[^}]+\}\}/g);
  return matches || [];
}

async function main() {
  const buf = fs.readFileSync(ORIGINAL_FILE);
  const zip = new PizZip(buf);
  const documentXml = zip.file('word/document.xml').asText();

  console.log('=== 1. ORIGINAL word/document.xml ===');
  console.log(documentXml);
  
  const originalPlaceholders = extractPlaceholders(documentXml);
  console.log('\n=== 2. PLACEHOLDERS IN ORIGINAL TEMPLATE ===');
  console.log('Count:', originalPlaceholders.length);
  console.log('Tags:', originalPlaceholders);

  // Simulate form payload matching the template placeholder
  const formPayload = {
    name: 'John Doe',
  };
  console.log('\n=== 3. FORM SUBMISSION PAYLOAD (simulated) ===');
  console.log(JSON.stringify(formPayload, null, 2));

  // Extract document
  const extractionService = new DocxExtractionService();
  const extractedDoc = await extractionService.extract(buf);
  console.log('\n=== 4. EXTRACTED DOCUMENT ===');
  console.log('Paragraphs:', extractedDoc.paragraphs.length);
  console.log('Runs:', extractedDoc.runs.length);
  console.log('Placeholder count:', extractedDoc.placeholderCount);
  console.log('Paragraph text:');
  extractedDoc.paragraphs.forEach((p, i) => {
    console.log(`  [${i}] "${p.rawText}" isHeading=${p.isHeading} runs=${p.runs.length}`);
  });

  // Detect sections
  const sectionDetector = new SectionDetectorService();
  const detectedSections = sectionDetector.detect(extractedDoc);
  console.log('\n=== 5. DETECTED SECTIONS ===');
  console.log('Count:', detectedSections.sections.length);
  detectedSections.sections.forEach((s, i) => {
    console.log(`  [${i}] "${s.title}" fields: ${s.fields.map(f => f.key).join(', ')}`);
  });
  console.log('Issues:', detectedSections.issues.map(i => i.message));

  // Inject placeholders
  const injector = new PlaceholderInjector();
  const injectionResult = await injector.inject(buf, extractedDoc, detectedSections.sections);
  console.log('\n=== 6. PLACEHOLDER INJECTION RESULT ===');
  console.log('Success:', injectionResult.success);
  console.log('Placeholders injected:', injectionResult.placeholdersInjected);
  console.log('Issues:', injectionResult.issues);
  console.log('Data key mapping:', injectionResult.dataKeyMapping);

  if (injectionResult.success) {
    const injectedZip = new PizZip(injectionResult.buffer);
    const injectedXml = injectedZip.file('word/document.xml').asText();
    const injectedPlaceholders = extractPlaceholders(injectedXml);
    console.log('\n=== 7. PLACEHOLDERS AFTER INJECTION ===');
    console.log('Count:', injectedPlaceholders.length);
    console.log('Tags:', injectedPlaceholders);
    console.log('XML (first 500 chars):', injectedXml.substring(0, 500));

    // Generate final DOCX
    const generator = new DocxTemplateGenerator();
    const genResult = await generator.generate(injectionResult.buffer);
    console.log('\n=== 8. GENERATION RESULT ===');
    console.log('Success:', genResult.success);
    console.log('Size:', genResult.size);
    console.log('Issues:', genResult.issues);

    if (genResult.success) {
      const finalZip = new PizZip(genResult.buffer);
      const finalXml = finalZip.file('word/document.xml').asText();
      const finalPlaceholders = extractPlaceholders(finalXml);
      console.log('\n=== 9. PLACEHOLDERS IN FINAL GENERATED DOCX ===');
      console.log('Count:', finalPlaceholders.length);
      console.log('Tags:', finalPlaceholders);
      console.log('XML:', finalXml);

      // Now simulate what resumeService does with docxtemplater
      console.log('\n=== 10. DOCXTEMPLATER SIMULATION ===');
      console.log('finalData passed to doc.setData():', JSON.stringify(formPayload, null, 2));
      console.log('Placeholders in XML:', finalPlaceholders);
      console.log('Keys in finalData:', Object.keys(formPayload));
      
      const mismatch = finalPlaceholders.filter(p => {
        const key = p.replace(/\{\{|\}\}/g, '');
        return !Object.keys(formPayload).includes(key);
      });
      console.log('\nMISMATCH (placeholders without matching finalData keys):', mismatch.length ? mismatch : 'NONE');
      
      const unusedKeys = Object.keys(formPayload).filter(k => !finalPlaceholders.some(p => p === `{{${k}}}`));
      console.log('UNUSED KEYS (finalData keys without matching placeholders):', unusedKeys.length ? unusedKeys : 'NONE');

      // Actually render with docxtemplater
      const Docxtemplater = require('docxtemplater');
      const doc = new Docxtemplater(finalZip, {
        paragraphLoop: true,
        linebreaks: true,
      });
      doc.setData(formPayload);
      try {
        doc.render();
        const renderedBuffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
        const renderedZip = new PizZip(renderedBuffer);
        const renderedXml = renderedZip.file('word/document.xml').asText();
        console.log('\n=== 11. RENDERED word/document.xml ===');
        console.log(renderedXml);
        console.log('\nRendered placeholders:', extractPlaceholders(renderedXml));
        console.log('Unreplaced placeholders:', extractPlaceholders(renderedXml).filter(p => renderedXml.includes(p)));
      } catch (err) {
        console.error('docxtemplater render failed:', err);
      }
    }
  }
}

main().catch(console.error);
