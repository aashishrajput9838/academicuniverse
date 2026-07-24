const PizZip = require('pizzip');
const fs = require('fs');
const DocxtemplaterModule = require('docxtemplater');
const Docxtemplater = DocxtemplaterModule.default;

const buf = fs.readFileSync('proper-headings-output.docx');
const zip = new PizZip(buf);

try {
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });
  doc.setData({ degree: 'BS CS', institution: 'MIT', category: 'Programming' });
  doc.render();
  console.log('Render succeeded');
} catch (err) {
  console.error('Error:', err.message);
  if (err.properties) {
    console.error('Properties:', JSON.stringify(err.properties, null, 2));
  }
}
