import path from 'path';
import fs from 'fs';
import { generatePdfBuffer, generateDocxBuffer } from '../src/utils/exportUtils';

async function run() {
  const outDir = path.resolve(__dirname, '..', 'tmp', 'exports_ui');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const sample = {
    topic: 'Test Paper on AI',
    abstract: 'This is a short abstract about AI research.',
    outline: [{ title: 'Introduction' }, { title: 'Methods' }, { title: 'Results' }],
    content: { Introduction: 'Intro content here.', Methods: 'Methods content here.', Results: 'Results content here.' },
    citations: [{ apa: 'Doe, J. (2020). Example.', mla: 'Doe J. Example.', ieee: 'J. Doe, "Example", 2020.' }]
  };

  const pdfBuf = await generatePdfBuffer(sample as any);
  const pdfPath = path.join(outDir, 'ui_exported_paper.pdf');
  fs.writeFileSync(pdfPath, pdfBuf);
  console.log('Wrote PDF to', pdfPath, 'size', pdfBuf.length);

  const docBuf = await generateDocxBuffer(sample as any);
  const docPath = path.join(outDir, 'ui_exported_paper.docx');
  fs.writeFileSync(docPath, docBuf);
  console.log('Wrote DOCX to', docPath, 'size', docBuf.length);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
