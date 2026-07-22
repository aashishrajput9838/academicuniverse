const fs = require('fs');
const PizZip = require('pizzip');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const Docxtemplater = require('docxtemplater');

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '#text',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false,
});

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '#text',
  suppressEmptyNode: true,
  format: false,
});

async function testSingleModification() {
  const zip = new PizZip(fs.readFileSync('input data/resume templet 5 conv.docx'));
  const docXml = zip.file('word/document.xml')?.asText() || '';
  
  // Parse XML
  const parsed = xmlParser.parse(docXml);
  const doc = parsed['w:document'];
  const paragraphs = Array.isArray(doc['w:body']['w:p']) ? doc['w:body']['w:p'] : [doc['w:body']['w:p']];
  
  // Modify ONLY the first paragraph's first run
  const firstParagraph = paragraphs[0];
  if (firstParagraph && firstParagraph['w:r']) {
    const runs = Array.isArray(firstParagraph['w:r']) ? firstParagraph['w:r'] : [firstParagraph['w:r']];
    if (runs[0] && runs[0]['w:t']) {
      const textNodes = Array.isArray(runs[0]['w:t']) ? runs[0]['w:t'] : [runs[0]['w:t']];
      if (textNodes[0]) {
        const originalText = typeof textNodes[0] === 'string' ? textNodes[0] : textNodes[0]['#text'];
        console.log('Original text:', originalText);
        textNodes[0] = '{{SINGLE_TEST}}';
        console.log('Modified text: {{SINGLE_TEST}}');
      }
    }
  }
  
  const rebuilt = xmlBuilder.build(parsed);
  console.log('XML rebuilt. Size:', rebuilt.length);
  
  const newZip = new PizZip();
  newZip.file('word/document.xml', rebuilt);
  for (const file of Object.keys(zip.files)) {
    if (file !== 'word/document.xml') {
      newZip.file(file, zip.file(file)?.asText() || '');
    }
  }
  const buffer = newZip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  
  try {
    const testZip = new PizZip(buffer);
    const doc = new Docxtemplater(testZip, { paragraphLoop: true, linebreaks: true });
    doc.setData({ SINGLE_TEST: 'HELLO' });
    doc.render();
    console.log('Single modification: RENDER OK');
  } catch (e: any) {
    console.log('Single modification: RENDER FAIL -', e.message);
  }
}

testSingleModification().catch(e => console.error(e));
