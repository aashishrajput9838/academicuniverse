const PizZip = require('pizzip');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const fs = require('fs');

const ORIGINAL_FILE = '../test.docx';

function normalizeDocx(node) {
  if (!node || typeof node !== 'object') return node;

  if (node['#text'] && typeof node['#text'] === 'string' && node['#text'].trim() === '') {
    delete node['#text'];
  }

  for (const key of Object.keys(node)) {
    if (key.startsWith('xmlns')) {
      delete node[key];
    }
  }

  for (const key of Object.keys(node)) {
    if (key === '#text') continue;
    const value = node[key];

    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        value[i] = normalizeDocx(value[i]);
      }
    } else if (value && typeof value === 'object') {
      node[key] = normalizeDocx(value);
    }
  }

  const arrayKeys = ['w:p', 'w:r', 'w:t', 'w:tbl', 'w:tr', 'w:tc', 'w:pPr', 'w:rPr', 'w:drawing'];
  for (const key of arrayKeys) {
    if (node[key] && !Array.isArray(node[key])) {
      node[key] = [node[key]];
    }
  }

  return node;
}

async function main() {
  const buf = fs.readFileSync(ORIGINAL_FILE);
  const zip = new PizZip(buf);
  const documentXml = zip.file('word/document.xml').asText();
  
  console.log('=== ORIGINAL word/document.xml (first 300 chars) ===');
  console.log(documentXml.substring(0, 300));
  console.log('\n=== ORIGINAL has xmlns:w? ===');
  console.log(documentXml.includes('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'));
  
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
    suppressEmptyNode: false,
    format: false,
    suppressBooleanAttributes: false,
  });

  const parsed = xmlParser.parse(documentXml);
  const normalized = normalizeDocx(parsed);
  const rebuilt = xmlBuilder.build(normalized);
  
  console.log('\n=== REBUILT word/document.xml (first 300 chars) ===');
  console.log(rebuilt.substring(0, 300));
  console.log('\n=== REBUILT has xmlns:w? ===');
  console.log(rebuilt.includes('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'));
  
  console.log('\n=== DIFF ===');
  console.log('Original length:', documentXml.length);
  console.log('Rebuilt length:', rebuilt.length);
  console.log('Difference:', rebuilt.length - documentXml.length, 'bytes');
  
  if (documentXml.includes('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"') && 
      !rebuilt.includes('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"')) {
    console.log('\nVERIFIED: normalizeDocx() removed xmlns:w from the rebuilt XML.');
  }
}

main().catch(console.error);
