const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater').default;
const fs = require('fs');

// Load a known-working DOCX template from the repo that already has placeholders
// test-minimal.docx has {{name}} but is incomplete (filetype error)
// Let's create a proper DOCX using docx library and see if docxtemplater works

const { Document, Paragraph, TextRun, Packer } = require('docx');

async function main() {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ children: [new TextRun("Hello {{name}}")] }),
      ],
    }],
  });

  const buf = await Packer.toBuffer(doc);
  const zip = new PizZip(buf);
  
  const xml = zip.file('word/document.xml').asText();
  console.log('XML length:', xml.length);
  console.log('Has {{name}}:', xml.includes('{{name}}'));
  
  try {
    const dt = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    dt.setData({ name: 'World' });
    dt.render();
    const rendered = dt.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    const renderedZip = new PizZip(rendered);
    const renderedXml = renderedZip.file('word/document.xml').asText();
    console.log('SUCCESS');
    console.log('Rendered XML:', renderedXml);
  } catch (err) {
    console.error('FAILED:', err.message);
    if (err.properties) {
      console.error('Properties:', JSON.stringify(err.properties, null, 2));
    }
  }
}

main();
