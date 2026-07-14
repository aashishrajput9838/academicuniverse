import path from 'path';
import fs from 'fs';
import { generatePdfBuffer, generateDocxBuffer } from '../src/utils/exportUtils';
import PizZip from 'pizzip';

async function run() {
  const dataPath = path.resolve(__dirname, '..', 'tmp', 'real_paper_data.json');
  if (!fs.existsSync(dataPath)) {
    console.error('No real paper data found at', dataPath);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const outDir = path.resolve(__dirname, '..', 'tmp', 'exports_ui_real');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const pdfBuf = await generatePdfBuffer(raw as any);
  const pdfPath = path.join(outDir, 'real_ui_paper.pdf');
  fs.writeFileSync(pdfPath, pdfBuf);
  console.log('Wrote PDF', pdfPath, 'size', pdfBuf.length);

  const docBuf = await generateDocxBuffer(raw as any);
  const docPath = path.join(outDir, 'real_ui_paper.docx');
  fs.writeFileSync(docPath, docBuf);
  console.log('Wrote DOCX', docPath, 'size', docBuf.length);

  // Validate DOCX contains expected strings
  const zip = new PizZip(docBuf);
  const docXml = zip.file('word/document.xml')?.asText() || '';
  const checks = {
    title: docXml.includes(raw.topic),
    abstract: docXml.includes('Abstract') && docXml.includes(raw.abstract.substring(0, 20)),
    sections: raw.outline.every((s: any) => docXml.includes(s.title)),
  };
  console.log('Validation:', checks);
}

run().catch(err => { console.error(err); process.exit(1); });
