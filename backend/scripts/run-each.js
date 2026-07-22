const { execSync } = require('child_process');

const templates = [
  'resume templet 2 conv.docx',
  'resume templet 3 conv.docx',
  'resume templet 4 conv.docx',
  'resume templet 5 conv.docx',
  'resume templet kushagra conv.docx'
];

for (const t of templates) {
  try {
    const out = execSync(`npx ts-node -e "import { PlaceholderInjector } from './src/services/placeholderInjector.service'; import { DocxExtractionService } from './src/docxExtraction.service'; import { ExtractionResultService } from './src/services/extractionResult.service'; import fs from 'fs'; import Docxtemplater from 'docxtemplater'; import PizZip from 'pizzip'; async function main() { const b = fs.readFileSync('input data/${t}'); const es = new DocxExtractionService(); const ed = await es.extract(b); const ir = new ExtractionResultService({enableAiAssistance: false}); const er = await ir.extract(ed); const pi = new PlaceholderInjector(); const res = await pi.inject(b, ed, er.sections); try { const z = new PizZip(res.buffer); const d = new Docxtemplater(z, {paragraphLoop:true, linebreaks:true}); d.setData({x:1}); d.render(); console.log('RENDER_OK'); } catch(e: any) { console.log('RENDER_FAIL ' + e.message); } } main();"`, {
      cwd: 'C:/github/academicuniverse.com/academicuniverse/backend',
      encoding: 'utf8',
      timeout: 120000
    });
    console.log(t + ': ' + out.trim());
  } catch (e: any) {
    const msg = (e.stdout || '').trim() || (e.stderr || '').trim() || e.message;
    console.log(t + ': FAIL - ' + msg.split('\n').pop());
  }
}
