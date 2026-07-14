import fs from 'fs';
import path from 'path';

const dataPath = path.resolve(__dirname, '..', 'tmp', 'real_paper_data.json');
const pdfPath = path.resolve(__dirname, '..', 'tmp', 'exports_ui_real', 'real_ui_paper.pdf');

if (!fs.existsSync(dataPath) || !fs.existsSync(pdfPath)) {
  console.error('Missing files');
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const buf = fs.readFileSync(pdfPath);
const text = buf.toString('utf8');

const checks: any = {
  fullTitle: text.includes(raw.topic),
  shortTitle: text.includes('AI-Driven') || text.includes('Applications of machine learning'),
  abstract: text.includes((raw.abstract || '').substring(0, 20)),
  sectionSample: text.includes(((raw.content || {})[raw.outline[0].title] || '').substring(0,20))
};

console.log(checks);
