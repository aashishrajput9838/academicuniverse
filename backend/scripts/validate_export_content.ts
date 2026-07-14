import path from 'path';
import fs from 'fs';
import PizZip from 'pizzip';

const dataPath = path.resolve(__dirname, '..', 'tmp', 'real_paper_data.json');
const docPath = path.resolve(__dirname, '..', 'tmp', 'exports_ui_real', 'real_ui_paper.docx');

if (!fs.existsSync(dataPath) || !fs.existsSync(docPath)) {
  console.error('Required files missing');
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const docBuf = fs.readFileSync(docPath);
const zip = new PizZip(docBuf);
const docXml = zip.file('word/document.xml')?.asText() || '';

const results: any = { titleMatch: false, abstractMatch: false, sections: [] };
results.titleMatch = docXml.includes(raw.topic);
results.abstractMatch = docXml.includes(raw.abstract);
for (const s of raw.outline) {
  const titleExists = docXml.includes(s.title);
  const contentExists = docXml.includes((raw.content || {})[s.title] || '');
  results.sections.push({ title: s.title, titleExists, contentExists });
}

console.log(JSON.stringify(results, null, 2));
