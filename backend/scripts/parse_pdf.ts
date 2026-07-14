const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

async function run(){
  const dataPath = path.resolve(__dirname, '..', 'tmp', 'real_paper_data.json');
  const pdfPath = path.resolve(__dirname, '..', 'tmp', 'exports_ui_real', 'real_ui_paper.pdf');
  const raw = JSON.parse(fs.readFileSync(dataPath,'utf8'));
  const buf = fs.readFileSync(pdfPath);
  const parser = (pdfParse.default || pdfParse);
  const data = await parser(buf);
  console.log('Extracted text snippet:', data.text.substring(0,400));
  console.log('Title present?', data.text.includes(raw.topic));
  console.log('Abstract present?', data.text.includes(raw.abstract.substring(0,20)));
}

run().catch(e=>{ console.error(e); process.exit(1); });
