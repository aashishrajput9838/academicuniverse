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
  
  const outPath = 'rc-verification/render-result.txt';
  let result = `${name}: placeholders=${injectionResult.placeholdersInjected}\n`;
  
  try {
    const zip = new PizZip(injectionResult.buffer);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.setData(data);
    doc.render();
    const output = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    result += `${name}: docxtemplater OK (${output.length} bytes)\n`;
  } catch (e: any) {
    result += `${name}: docxtemplater FAIL - ${e.message}\n`;
  }
  
  fs.appendFileSync(outPath, result);
}

async function main() {
  const templates = [
    'resume templet 4 conv.docx',
    'resume templet 5 conv.docx',
    'resume templet kushagra conv.docx'
  ];
  
  if (!fs.existsSync('rc-verification')) fs.mkdirSync('rc-verification', { recursive: true });
  fs.writeFileSync('rc-verification/render-result.txt', '');
  
  for (const t of templates) {
    await testOne(t);
  }
}

main().catch(e => fs.appendFileSync('rc-verification/render-result.txt', 'FATAL: ' + e + '\n'));
