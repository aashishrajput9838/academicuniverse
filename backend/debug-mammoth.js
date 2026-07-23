const PizZip = require('pizzip');

const zip = new PizZip();
zip.file('test.txt', 'hello world');

const buf = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });

console.log('Type:', typeof buf);
console.log('Is Buffer:', Buffer.isBuffer(buf));
console.log('Is Uint8Array:', buf instanceof Uint8Array);
console.log('Length:', buf.length);
console.log('First 4 bytes:', buf.slice(0, 4).toString('hex'));
console.log('Constructor:', buf.constructor.name);

// Also test with a real docx structure
const zip2 = new PizZip();
zip2.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
zip2.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
zip2.file('word/document.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello</w:t></w:r></w:p></w:body></w:document>');

const buf2 = zip2.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
console.log('\nReal DOCX Type:', typeof buf2);
console.log('Real DOCX Is Buffer:', Buffer.isBuffer(buf2));
console.log('Real DOCX Length:', buf2.length);
console.log('Real DOCX First 4 bytes:', buf2.slice(0, 4).toString('hex'));
