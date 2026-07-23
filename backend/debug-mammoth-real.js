const mammoth = require('mammoth');
const PizZip = require('pizzip');

const zip = new PizZip();
zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
zip.file('word/document.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello World</w:t></w:r></w:p></w:body></w:document>');

const buf = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });

console.log('Buffer type:', typeof buf);
console.log('Buffer length:', buf.length);

mammoth.convertToHtml({ buffer: buf })
  .then(result => {
    console.log('Success!');
    console.log('HTML:', result.value.substring(0, 100));
  })
  .catch(err => {
    console.error('Error:', err.message);
  });
