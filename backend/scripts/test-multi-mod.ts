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

async function testMultipleModifications() {
  const zip = new PizZip(fs.readFileSync('input data/resume templet 5 conv.docx'));
  const docXml = zip.file('word/document.xml')?.asText() || '';
  
  const parsed = xmlParser.parse(docXml);
  const doc = parsed['w:document'];
  const paragraphs = Array.isArray(doc['w:body']['w:p']) ? doc['w:body']['w:p'] : [doc['w:body']['w:p']];
  
  const placeholders = ['{{DEGREE}}', '{{CGPA}}', '{{COMPANY}}'];
  
  let pIdx = 0;
  for (const placeholder of placeholders) {
    while (pIdx < paragraphs.length) {
      const p = paragraphs[pIdx];
      if (p && p['w:r']) {
        const runs = Array.isArray(p['w:r']) ? p['w:r'] : [p['w:r']];
        if (runs[0] && runs[0]['w:t']) {
          const textNodes = Array.isArray(runs[0]['w:t']) ? runs[0]['w:t'] : [runs[0]['w:t']];
          if (textNodes[0]) {
            const originalText = typeof textNodes[0] === 'string' ? textNodes[0] : textNodes[0]['#text'];
            if (originalText && originalText.trim().length > 0) {
              textNodes[0] = placeholder;
              console.log(`Paragraph ${pIdx}: "${originalText.slice(0, 20)}" -> ${placeholder}`);
              break;
            }
          }
        }
      }
      pIdx++;
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
    doc.setData({ DEGREE: 'BTech', CGPA: '9', COMPANY: 'Corp' });
    doc.render();
    console.log('Multiple modifications: RENDER OK');
  } catch (e: any) {
    console.log('Multiple modifications: RENDER FAIL -', e.message);
  }
}

testMultipleModifications().catch(e => console.error(e));
