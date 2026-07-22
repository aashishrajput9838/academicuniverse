import { PlaceholderInjector } from '../src/services/placeholderInjector.service';
import fs from 'fs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '#text',
  suppressEmptyNode: true,
  format: false,
});

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '#text',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false,
});

async function test() {
  // Create a minimal DOCX with one placeholder
  const zip = new PizZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/document.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mo="http://schemas.microsoft.com/office/mac/2008/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:mv="urn:schemas-microsoft-com:mac:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 wp14"><w:body><w:p><w:r><w:t>Hello {{name}}</w:t></w:r></w:p></w:body></w:document>');
  
  const buffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync('test-minimal.docx', buffer);
  
  const parsed = xmlParser.parse(zip.file('word/document.xml')?.asText() || '');
  const normalized = parsed;
  
  const simpleInjector = {
    async inject() {
      const doc = normalized['w:document'];
      const paragraphs = Array.isArray(doc['w:body']['w:p']) ? doc['w:body']['w:p'] : [doc['w:body']['w:p']];
      const targetRun = paragraphs[0]['w:r'];
      const textNode = targetRun['w:t']['#text'];
      targetRun['w:t'] = { '#text': 'Hello {{test_placeholder}}' };
      
      const modifiedXml = xmlBuilder.build(normalized);
      const outZip = new PizZip();
      outZip.file('word/document.xml', modifiedXml);
      
      for (const file of Object.keys(zip.files)) {
        if (file !== 'word/document.xml') {
          outZip.file(file, zip.file(file)?.asText() || '');
        }
      }
      
      return outZip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    }
  };
  
  const resultBuffer = await simpleInjector.inject();
  
  try {
    const outZip = new PizZip(resultBuffer);
    const doc = new Docxtemplater(outZip, { paragraphLoop: true, linebreaks: true });
    doc.setData({ test_placeholder: 'WORLD' });
    doc.render();
    console.log('Simple docxtemplater: OK');
  } catch (e: any) {
    console.log('Simple docxtemplater: FAIL -', e.message);
  }
}

test().catch(e => console.error(e));
