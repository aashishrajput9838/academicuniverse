import { PlaceholderInjector } from '../src/services/placeholderInjector.service';
import { DocxExtractionService } from '../src/docxExtraction.service';
import { ExtractionResultService } from '../src/services/extractionResult.service';
import fs from 'fs';
import PizZip from 'pizzip';

async function testOne(name: string) {
  const buffer = fs.readFileSync(`input data/${name}`);
  const extractionService = new DocxExtractionService();
  const extractedDoc = await extractionService.extract(buffer);
  const extractionResultService = new ExtractionResultService({ enableAiAssistance: false });
  const extractionResult = await extractionResultService.extract(extractedDoc);
  
  const placeholderInjector = new PlaceholderInjector();
  const injectionResult = await placeholderInjector.inject(buffer, extractedDoc, extractionResult.sections);
  
  console.log(`\n=== ${name} ===`);
  console.log('Placeholders injected:', injectionResult.placeholdersInjected);
  console.log('Mapping keys:', Object.keys(injectionResult.dataKeyMapping || {}));
  
  const zip = new PizZip(injectionResult.buffer);
  const docXml = zip.file('word/document.xml')?.asText() || '';
  const matches: string[] = docXml.match(/\{\{[^}]+\}\}/g) || [];
  const unique = [...new Set(matches)];
  console.log('Placeholders in XML:', matches.length, 'unique:', unique.length);
  if (unique.length !== matches.length) {
    console.log('DUPLICATES FOUND:', matches.filter((m, i) => matches.indexOf(m) !== i));
  }
}

async function main() {
  const templates = [
    'resume templet 2 conv.docx',
    'resume templet 3 conv.docx',
    'resume templet 4 conv.docx',
    'resume templet 5 conv.docx',
    'resume templet kushagra conv.docx'
  ];
  
  for (const t of templates) {
    try {
      await testOne(t);
    } catch (e) {
      console.log(`\n=== ${t} ===`);
      console.error('ERROR:', e);
    }
  }
}

main().catch(e => console.error(e));
