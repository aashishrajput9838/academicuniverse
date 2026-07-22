import { PlaceholderInjector } from '../src/services/placeholderInjector.service';
import { DocxExtractionService } from '../src/docxExtraction.service';
import { ExtractionResultService } from '../src/services/extractionResult.service';
import fs from 'fs';
import PizZip from 'pizzip';

async function debug() {
  const buffer = fs.readFileSync('input data/resume templet 5 conv.docx');
  const extractionService = new DocxExtractionService();
  const extractedDoc = await extractionService.extract(buffer);
  
  const extractionResultService = new ExtractionResultService({ enableAiAssistance: false });
  const extractionResult = await extractionResultService.extract(extractedDoc);
  
  const placeholderInjector = new PlaceholderInjector();
  const injectionResult = await placeholderInjector.inject(buffer, extractedDoc, extractionResult.sections);
  
  console.log('Injection success:', injectionResult.success);
  console.log('Placeholders injected:', injectionResult.placeholdersInjected);
  console.log('Issues:', injectionResult.issues);
  
  const zip = new PizZip(injectionResult.buffer);
  const docXml = zip.file('word/document.xml')?.asText() || '';
  
  // Count placeholders
  const matches: string[] = docXml.match(/\{\{[^}]+\}\}/g) || [];
  console.log('Total placeholders found in XML:', matches.length);
  console.log('Placeholder samples:', matches.slice(0, 20));
  
  // Check for duplicates
  const unique = new Set(matches);
  console.log('Unique placeholders:', unique.size);
  
  if (unique.size !== matches.length) {
    const duplicates = matches.filter((item, index) => matches.indexOf(item) !== index);
    console.log('Duplicate placeholders:', duplicates);
  }
}

debug().catch(e => console.error(e));
