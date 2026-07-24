import dotenv from 'dotenv';
import path from 'path';
const envPath = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
dotenv.config({ path: path.resolve(__dirname, envPath) });

import PizZip from 'pizzip';
import { XMLParser } from 'fast-xml-parser';
import { DocxExtractionService } from './src/docxExtraction.service';
import { SectionDetectorService } from './src/services/sectionDetector.service';
import { PlaceholderInjector } from './src/services/placeholderInjector.service';
import { DocxTemplateGenerator } from './src/services/docxTemplateGenerator.service';
import { TemplateProcessingOrchestrator } from './src/services/templateProcessingOrchestrator.service';
import mammoth from 'mammoth';
import fs from 'fs';

const INPUT_FILE = '../backend/proper-headings-template-patched.docx';
const OUTPUT_FILE = path.join(__dirname, 'proper-headings-output.docx');

function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{\{[^}]+\}\}/g);
  return matches || [];
}

async function main() {
  const buf = fs.readFileSync(INPUT_FILE);
  const zip = new PizZip(buf);
  const documentXml = zip.file('word/document.xml').asText();

  console.log('=== 1. INPUT word/document.xml ===');
  console.log(documentXml);
  
  const originalPlaceholders = extractPlaceholders(documentXml);
  console.log('\n=== 2. PLACEHOLDERS IN ORIGINAL TEMPLATE ===');
  console.log('Count:', originalPlaceholders.length);
  console.log('Tags:', originalPlaceholders);

  const formPayload = {
    degree: "BS Computer Science",
    institution: "MIT",
    year: "2020",
    category: "Programming",
    items: "JavaScript, TypeScript, React, Node.js",
  };
  console.log('\n=== 3. FORM SUBMISSION PAYLOAD ===');
  console.log(JSON.stringify(formPayload, null, 2));

  const orchestrator = new TemplateProcessingOrchestrator({ enableAiAssistance: false });
  const result = await orchestrator.process(buf);

  console.log('\n=== 4. ORCHESTRATOR RESULT ===');
  console.log('Success:', result.success);
  console.log('Issues:', result.issues);
  console.log('Placeholders injected:', result.injectionResult.placeholdersInjected);
  console.log('Data key mapping:', result.injectionResult.dataKeyMapping);

  console.log('\n=== 5. MILESTONE2 SECTIONS ===');
  result.milestone2Result.sections.forEach((s, i) => {
    console.log(`  [${i}] "${s.title}" fields: ${s.fields.map(f => f.key).join(', ')}`);
  });

  console.log('\n=== 6. GENERATED QUESTIONS (from controller mapping) ===');
  const questions = result.milestone2Result.sections.flatMap((section: any) =>
    section.fields.map((field: any) => ({
      tag: field.key,
      question: field.label,
      type: field.type === 'textarea' ? 'textarea' : 'text',
      aiEnhanceable: field.aiEnhanceable || false,
    }))
  );
  console.log(JSON.stringify(questions, null, 2));

  if (result.success) {
    const processedZip = new PizZip(result.processedBuffer);
    const processedXml = processedZip.file('word/document.xml').asText();
    const processedPlaceholders = extractPlaceholders(processedXml);
    
    console.log('\n=== 7. PLACEHOLDERS AFTER INJECTION ===');
    console.log('Count:', processedPlaceholders.length);
    console.log('Tags:', processedPlaceholders);
    console.log('XML (first 800 chars):', processedXml.substring(0, 800));

    fs.writeFileSync(OUTPUT_FILE, result.processedBuffer);
    console.log('\nSaved processed template to:', OUTPUT_FILE);

    const mismatches = processedPlaceholders.filter(p => {
      const key = p.replace(/\{\{|\}\}/g, '');
      return !Object.keys(formPayload).includes(key);
    });
    const unusedKeys = Object.keys(formPayload).filter(k => !processedPlaceholders.some(p => p === `{{${k}}}`));
    
    console.log('\n=== 8. MISMATCH ANALYSIS ===');
    console.log('Placeholders without matching finalData keys:', mismatches.length ? mismatches : 'NONE');
    console.log('finalData keys without matching placeholders:', unusedKeys.length ? unusedKeys : 'NONE');

    const Docxtemplater = require('docxtemplater');
    const doc = new Docxtemplater(processedZip, {
      paragraphLoop: true,
      linebreaks: true,
    });
    doc.setData(formPayload);
    try {
      doc.render();
      const renderedBuffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
      const renderedZip = new PizZip(renderedBuffer);
      const renderedXml = renderedZip.file('word/document.xml').asText();
      
      console.log('\n=== 9. RENDERED word/document.xml ===');
      console.log(renderedXml);
      
      const remainingPlaceholders = extractPlaceholders(renderedXml);
      console.log('\nRemaining placeholders after render:', remainingPlaceholders.length ? remainingPlaceholders : 'NONE');
      console.log('Render success:', remainingPlaceholders.length === 0);
    } catch (err) {
      console.error('\nDocxtemplater render failed:', err.message);
    }

    console.log('\n=== 10. MAMMOTH HTML PREVIEW ===');
    try {
      const mammothResult = await mammoth.convertToHtml({ buffer: result.processedBuffer });
      console.log('Mammoth success:', true);
      console.log('HTML length:', mammothResult.value.length);
      console.log('HTML (first 500 chars):', mammothResult.value.substring(0, 500));
    } catch (err) {
      console.error('Mammoth failed:', err.message);
    }
  }
}

main().catch(console.error);
