const { Document, Paragraph, TextRun, Packer } = require('docx');
const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater').default;

async function main() {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          children: [new TextRun("Hello {{name}}")],
        }),
      ],
    }],
  });

  const buf = await Packer.toBuffer(doc);
  const zip = new PizZip(buf);
  
  const xml = zip.file('word/document.xml').asText();
  console.log('XML length:', xml.length);
  console.log('Contains {{name}}:', xml.includes('{{name}}'));
  
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
}

main();
