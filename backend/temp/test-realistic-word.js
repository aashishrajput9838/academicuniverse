const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater').default;
const fs = require('fs');
const path = require('path');

// This mimics the exact XML structure of a real Word document
const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml">
  <w:body>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:t>{{name}}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;

const zip = new PizZip();
zip.file('word/document.xml', docXml);
zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`);

const buf = zip.generate({ type: 'nodebuffer' });
fs.writeFileSync(path.join(__dirname, 'realistic-word.docx'), buf);

const zip2 = new PizZip(buf);
const dt = new Docxtemplater(zip2, {
  paragraphLoop: true,
  linebreaks: true,
  syntax: { allowUnclosedTag: true, allowUnopenedTag: true }
});
dt.setData({ name: 'Alice' });
dt.render();
const out = dt.getZip().generate({ type: 'nodebuffer' });
const outZip = new PizZip(Buffer.from(out));
const xml = outZip.file('word/document.xml').asText();
const match = xml.match(/<w:t[^>]*>[^<]+<\/w:t>/);
console.log('Realistic Word template:', match ? match[0] : 'NO MATCH');
