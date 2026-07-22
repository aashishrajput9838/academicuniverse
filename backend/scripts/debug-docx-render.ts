import { PlaceholderInjector } from '../src/services/placeholderInjector.service';
import { DocxExtractionService } from '../src/docxExtraction.service';
import { ExtractionResultService } from '../src/services/extractionResult.service';
import fs from 'fs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

async function testDocxtemplater(name: string) {
  const buffer = fs.readFileSync(`input data/${name}`);
  const extractionService = new DocxExtractionService();
  const extractedDoc = await extractionService.extract(buffer);
  const extractionResultService = new ExtractionResultService({ enableAiAssistance: false });
  const extractionResult = await extractionResultService.extract(extractedDoc);
  
  const placeholderInjector = new PlaceholderInjector();
  const injectionResult = await placeholderInjector.inject(buffer, extractedDoc, extractionResult.sections);
  
  try {
    const zip = new PizZip(injectionResult.buffer);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.setData({ degree: 'B.Tech', institution: 'Univ', company: 'Corp', role: 'Dev', name: 'X', description: 'Y', tech_stack: ['A'] });
    doc.render();
    const output = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    console.log(`${name}: docxtemplater RENDER OK (${output.length} bytes)`);
  } catch (e: any) {
    console.log(`${name}: docxtemplater RENDER FAILED - ${e.message}`);
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
    await testDocxtemplater(t);
  }
}

main().catch(e => console.error(e));
