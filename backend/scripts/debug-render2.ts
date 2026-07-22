import { PlaceholderInjector } from '../src/services/placeholderInjector.service';
import { DocxExtractionService } from '../src/docxExtraction.service';
import { ExtractionResultService } from '../src/services/extractionResult.service';
import fs from 'fs';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

const data: Record<string, any> = {
  text: 'x', category: 'y', items: ['a'], name: 'n', description: 'd',
  tech_stack: ['t'], issuer: 'i', date: '2026', degree: 'deg', institution: 'inst',
  year: 'yr', cgpa: '8', company: 'c', role: 'r', duration: 'd', responsibilities: 'resp'
};

async function testOne(name: string) {
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
    doc.setData(data);
    doc.render();
    const output = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    console.log(`${name}: docxtemplater OK (${output.length} bytes)`);
  } catch (e: any) {
    console.log(`${name}: docxtemplater FAIL - ${e.message}`);
  }
}

async function main() {
  await testOne('resume templet 4 conv.docx');
  await testOne('resume templet 5 conv.docx');
  await testOne('resume templet kushagra conv.docx');
}

main().catch(e => console.error(e));
