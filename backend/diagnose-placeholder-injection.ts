import dotenv from 'dotenv';
import path from 'path';
const envPath = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
dotenv.config({ path: path.resolve(__dirname, envPath) });

import PizZip from 'pizzip';
import { DocxExtractionService } from './src/docxExtraction.service';
import { SectionDetectorService } from './src/services/sectionDetector.service';
import { PlaceholderInjector } from './src/services/placeholderInjector.service';
import fs from 'fs';

const INPUT_FILE = '../backend/proper-headings-template.docx';

async function main() {
  const buf = fs.readFileSync(INPUT_FILE);
  const extractionService = new DocxExtractionService();
  const extractedDoc = await extractionService.extract(buf);

  console.log('=== EXTRACTED PARAGRAPHS ===');
  extractedDoc.paragraphs.forEach((p, i) => {
    console.log(`[${i}] rawText="${p.rawText}" style="${p.style}" isHeading=${p.isHeading}`);
    p.runs.forEach((r, j) => {
      console.log(`    run[${j}] text="${r.text}" bold=${r.formatting.bold} fontSize=${r.formatting.fontSize}`);
    });
  });

  const sectionDetector = new SectionDetectorService();
  const detected = sectionDetector.detect(extractedDoc);
  console.log('\n=== SECTION DETECTOR RESULT ===');
  console.log('Sections:', detected.sections.map(s => s.title));
  console.log('Issues:', detected.issues.map(i => i.message));

  console.log('\n=== PLACEHOLDER INJECTOR findSectionStart() SIMULATION ===');
  const injector = new PlaceholderInjector();
  detected.sections.forEach((section, idx) => {
    // Use reflection to call private method via any cast
    const findStart = (injector as any).findSectionStart.bind(injector);
    const startIdx = findStart(extractedDoc, section);
    console.log(`Section "${section.title}": findSectionStart returned ${startIdx}`);
    
    if (startIdx >= 0) {
      const paragraph = extractedDoc.paragraphs[startIdx];
      console.log(`  Next paragraph text: "${paragraph.rawText}"`);
      const hasBoldOrFont = paragraph.runs.some((r: any) => r.formatting.bold || (r.formatting.fontSize || 0) >= 14);
      console.log(`  Has bold/fontSize>=14: ${hasBoldOrFont}`);
    }
  });

  console.log('\n=== ROOT CAUSE ===');
  console.log('SectionDetector finds headings using: keywords, TitleCase, AND run bold/fontSize.');
  console.log('PlaceholderInjector.findSectionStart() ONLY uses run bold/fontSize.');
  console.log('The Heading1 paragraphs created by docx library have NO bold/fontSize on runs.');
  console.log('Therefore PlaceholderInjector cannot re-locate the sections detected by SectionDetector.');
}

main().catch(console.error);
