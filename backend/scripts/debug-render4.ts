import { PlaceholderInjector } from '../src/services/placeholderInjector.service';
import { DocxExtractionService } from '../src/docxExtraction.service';
import { ExtractionResultService } from '../src/services/extractionResult.service';
import fs from 'fs';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

const templates = [
  'resume templet 2 conv.docx',
  'resume templet 3 conv.docx',
  'resume templet 4 conv.docx',
  'resume templet 5 conv.docx',
  'resume templet kushagra conv.docx'
];

async function testOne(name: string): Promise<string> {
  const buffer = fs.readFileSync(`input data/${name}`);
  const es = new DocxExtractionService();
  const ed = await es.extract(buffer);
  const ir = new ExtractionResultService({ enableAiAssistance: false });
  const er = await ir.extract(ed);
  
  const pi = new PlaceholderInjector();
  const res = await pi.inject(buffer, ed, er.sections);
  
  try {
    const zip = new PizZip(res.buffer);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.setData({ x: '1' });
    doc.render();
    return `${name}: RENDER_OK`;
  } catch (e: any) {
    return `${name}: RENDER_FAIL - ${e.message}`;
  }
}

async function main() {
  const results: string[] = [];
  for (const t of templates) {
    results.push(await testOne(t));
  }
  const outPath = 'rc-verification/render-result.txt';
  if (!fs.existsSync('rc-verification')) fs.mkdirSync('rc-verification', { recursive: true });
  fs.writeFileSync(outPath, results.join('\n'));
  console.log(results.join('\n'));
}

main().catch(e => console.error(e));
