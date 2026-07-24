const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater').default;

// Manually construct a minimal DOCX with just <w:t>{{name}}</w:t>
const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>{{name}}</w:t></w:r></w:p></w:body></w:document>';

const zip = new PizZip();
zip.file('word/document.xml', xml);
zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
zip.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>');

const buf = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
fs.writeFileSync('minimal-test.docx', buf);

try {
  const dt = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  dt.setData({ name: 'World' });
  dt.render();
  const rendered = dt.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  console.log('Render succeeded! Size:', rendered.length);
  
  const renderedZip = new PizZip(rendered);
  const renderedXml = renderedZip.file('word/document.xml').asText();
  console.log('Rendered XML:', renderedXml);
} catch (err) {
  console.error('Error:', err.message);
}
