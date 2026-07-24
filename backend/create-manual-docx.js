const PizZip = require('pizzip');
const fs = require('fs');

const INPUT = 'test-minimal.docx';
const OUTPUT = 'proper-headings-template-manual.docx';

const buf = fs.readFileSync(INPUT);
const zip = new PizZip(buf);

const newXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document mc:Ignorable="w14 w15 wp14" xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 wp14"><w:body><w:p><w:r><w:t>John Doe&apos;s Resume</w:t></w:r></w:p><w:p><w:r><w:t>Education</w:t></w:r></w:p><w:p><w:r><w:t>BS Computer Science, MIT, 2020</w:t></w:r></w:p><w:p><w:r><w:t>Skills</w:t></w:r></w:p><w:p><w:r><w:t>JavaScript, TypeScript, React, Node.js</w:t></w:r></w:p></w:body></w:document>`;

zip.file('word/document.xml', newXml);
const out = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
fs.writeFileSync(OUTPUT, out);
console.log('Created:', OUTPUT, '(' + out.length + ' bytes)');
