import PizZip from 'pizzip';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import Docxtemplater from 'docxtemplater';

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

async function test() {
  const zip = new PizZip(require('fs').readFileSync('input data/resume templet 5 conv.docx'));
  const docXml = zip.file('word/document.xml')?.asText() || '';
  
  // Parse and rebuild WITHOUT modification
  const parsed = xmlParser.parse(docXml);
  const rebuilt = xmlBuilder.build(parsed);
  
  // Save rebuilt XML to a new zip
  const newZip = new PizZip();
  newZip.file('word/document.xml', rebuilt);
  for (const file of Object.keys(zip.files)) {
    if (file !== 'word/document.xml') {
      newZip.file(file, zip.file(file)?.asText() || '');
    }
  }
  const buffer = newZip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  require('fs').writeFileSync('test-rebuilt.docx', buffer);
  
  console.log('Original size:', docXml.length);
  console.log('Rebuilt size:', rebuilt.length);
  
  try {
    const testZip = new PizZip(buffer);
    const doc = new Docxtemplater(testZip, { paragraphLoop: true, linebreaks: true });
    doc.setData({ x: '1' });
    doc.render();
    console.log('REBUILT_RENDER: OK');
  } catch (e: any) {
    console.log('REBUILT_RENDER: FAIL - ' + e.message);
  }
}

test().catch(e => console.error(e));
