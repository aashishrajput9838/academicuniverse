const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater').default;
const fs = require('fs');
const path = require('path');

const docXml = fs.readFileSync(path.join(__dirname, 'no-preserve.xml'), 'utf8');

const zip = new PizZip();
zip.file('word/document.xml', docXml);
zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
zip.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>');

const buf = zip.generate({ type: 'nodebuffer' });
fs.writeFileSync(path.join(__dirname, 'no-preserve.docx'), buf);

const zip2 = new PizZip(buf);
const dt = new Docxtemplater(zip2, {
  paragraphLoop: true,
  linebreaks: true,
  syntax: { allowUnclosedTag: true, allowUnopenedTag: true }
});
dt.setData({ name: 'Alice' });
try {
  dt.render();
  const out = dt.getZip().generate({ type: 'nodebuffer' });
  const outZip = new PizZip(Buffer.from(out));
  const xml = outZip.file('word/document.xml').asText();
  const match = xml.match(/<w:t[^>]*>[^<]+<\/w:t>/);
  console.log('Without xml:space=preserve:', match ? match[0] : 'NO MATCH');
} catch (e) {
  console.log('Without xml:space=preserve: ERROR -', e.message);
}
