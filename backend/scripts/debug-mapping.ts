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
  console.log('Data key mapping:', JSON.stringify(injectionResult.dataKeyMapping, null, 2));
  console.log('Issues:', injectionResult.issues);
  
  const zip = new PizZip(injectionResult.buffer);
  const docXml = zip.file('word/document.xml')?.asText() || '';
  
  const matches: string[] = docXml.match(/\{\{[^}]+\}\}/g) || [];
  console.log('Total matches:', matches.length);
  console.log('Unique matches:', [...new Set(matches)].length);
  console.log('Matches:', matches);
}

debug().catch(e => console.error(e));
