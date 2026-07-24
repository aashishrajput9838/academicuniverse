const PizZip = require('pizzip');
const fs = require('fs');

const INPUT = 'test-rebuilt.docx';
const buf = fs.readFileSync(INPUT);
const zip = new PizZip(buf);

const oldContent = zip.file('word/document.xml').asText();
console.log('Old content includes {{name}}:', oldContent.includes('{{name}}'));

// Modify using zip.file()
const newContent = oldContent.replace('Hello {{name}}', 'Education');
zip.file('word/document.xml', newContent);

const newContentViaFile = zip.file('word/document.xml').asText();
console.log('New content via .file():', newContentViaFile.includes('Education'));

const newContentViaFilesProp = zip.files['word/document.xml'].asText();
console.log('New content via .files[]:', newContentViaFilesProp.includes('Education'));

// Check if they're the same object
console.log('Same entry?', zip.file('word/document.xml') === zip.files['word/document.xml']);
