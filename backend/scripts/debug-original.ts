import fs from 'fs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

async function testOriginal(name: string) {
  const buffer = fs.readFileSync(`input data/${name}`);
  try {
    const zip = new PizZip(buffer);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.setData({ x: '1' });
    doc.render();
    const output = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    console.log(`${name}: ORIGINAL_RENDER_OK (${output.length} bytes)`);
  } catch (e: any) {
    console.log(`${name}: ORIGINAL_RENDER_FAIL - ${e.message}`);
  }
}

async function main() {
  await testOriginal('resume templet 4 conv.docx');
  await testOriginal('resume templet 5 conv.docx');
  await testOriginal('resume templet kushagra conv.docx');
}

main().catch(e => console.error(e));
