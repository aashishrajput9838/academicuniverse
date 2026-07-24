const { Document, Paragraph, TextRun, HeadingLevel, Packer } = require('docx');
const fs = require('fs');
const path = require('path');

const OUTPUT = path.join(__dirname, 'proper-headings-template.docx');

const doc = new Document({
  sections: [{
    properties: {},
    children: [
      new Paragraph({
        text: "John Doe's Resume",
        heading: HeadingLevel.HEADING_1,
        bold: true,
      }),
      new Paragraph({
        text: "Education",
        heading: HeadingLevel.HEADING_1,
        bold: true,
      }),
      new Paragraph({
        children: [
          new TextRun("BS Computer Science, MIT, 2020"),
        ],
      }),
      new Paragraph({
        text: "Skills",
        heading: HeadingLevel.HEADING_1,
        bold: true,
      }),
      new Paragraph({
        children: [
          new TextRun("JavaScript, TypeScript, React, Node.js"),
        ],
      }),
    ],
  }],
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(OUTPUT, buffer);
  console.log('Created:', OUTPUT, '(' + buffer.length + ' bytes)');
});
