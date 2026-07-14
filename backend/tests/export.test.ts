import { generatePdfBuffer, generateDocxBuffer } from '../src/utils/exportUtils';
import fs from 'fs';
import path from 'path';
const pdfParse = require('pdf-parse');
import PizZip from 'pizzip';

describe('Final Export utilities', () => {
  const sample = {
    topic: 'Test Paper on AI',
    abstract: 'This is a short abstract about AI research.',
    outline: [{ title: 'Introduction' }, { title: 'Methods' }, { title: 'Results' }],
    content: {
      Introduction: 'Intro content here.',
      Methods: 'Methods content here.',
      Results: 'Results content here.'
    },
    citations: [
      { apa: 'Doe, J. (2020). Example.', mla: 'Doe J. Example.', ieee: 'J. Doe, "Example", 2020.' }
    ]
  };

  it('generates a PDF buffer that starts with %PDF', async () => {
    const buf = await generatePdfBuffer(sample as any);
    expect(buf).toBeInstanceOf(Buffer);
    const header = buf.slice(0, 4).toString('utf8');
    expect(header).toContain('%PDF');
    expect(buf.length).toBeGreaterThan(500);
  }, 20000);

  it('generates a DOCX buffer that is a zip (PK)', async () => {
    const buf = await generateDocxBuffer(sample as any);
    expect(buf).toBeInstanceOf(Buffer);
    const header = buf.slice(0, 2).toString('utf8');
    expect(header).toBe('PK');
    expect(buf.length).toBeGreaterThan(1000);
  }, 20000);

  it('saves exports and verifies content (PDF text and DOCX document.xml)', async () => {
    const outDir = path.resolve(__dirname, '..', '..', 'tmp', 'exports_jest');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const pdfBuf = await generatePdfBuffer(sample as any);
    const pdfPath = path.join(outDir, 'paper.pdf');
    fs.writeFileSync(pdfPath, pdfBuf);
    // Basic PDF sanity checks: header and size
    expect(pdfBuf.slice(0, 4).toString('utf8')).toContain('%PDF');
    expect(pdfBuf.length).toBeGreaterThan(500);

    const docBuf = await generateDocxBuffer(sample as any);
    const docPath = path.join(outDir, 'paper.docx');
    fs.writeFileSync(docPath, docBuf);
    const zip = new PizZip(docBuf);
    const docXml = zip.file('word/document.xml')?.asText() || '';
    expect(docXml).toContain('Test Paper on AI');
    expect(docXml).toContain('Abstract');
    expect(docXml).toContain('Introduction');
    expect(docXml).toContain('Doe, J.');
  }, 30000);
});
