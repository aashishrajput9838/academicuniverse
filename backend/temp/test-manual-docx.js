const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater').default;
const fs = require('fs');
const path = require('path');

const docXmlPath = path.join(__dirname, 'manual-document.xml');
const docXml = fs.readFileSync(docXmlPath, 'utf8');

const zip = new PizZip();
zip.file('word/document.xml', docXml);
zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
zip.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>');

const buf = zip.generate({ type: 'nodebuffer' });
fs.writeFileSync(path.join(__dirname, 'manual-word.docx'), buf);

const zip2 = new PizZip(buf);
const dt = new Docxtemplater(zip2, {
  paragraphLoop: true,
  linebreaks: true,
});
dt.setData({ name: 'Alice' });
try {
  dt.render();
  const out = dt.getZip().generate({ type: 'nodebuffer' });
  const outZip = new PizZip(Buffer.from(out));
  const xml = outZip.file('word/document.xml').asText();
  const match = xml.match(/<w:t[^>]*>[^<]+<\/w:t>/);
  console.log('Manual MS-Word style output:', match ? match[0] : 'NO MATCH');
} catch (e) {
  console.log('Error:', e.message);
}
