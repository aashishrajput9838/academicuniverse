const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater').default;

const VERSIONS = {
  docxtemplater: require('docxtemplater/package.json').version,
  pizzip: require('pizzip/package.json').version,
};

function createMinimalDocx(text) {
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>${text}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;

  const zip = new PizZip();
  zip.file('word/document.xml', docXml);
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`);

  return zip.generate({ type: 'nodebuffer' });
}

function extractText(docxBuffer) {
  const zip = new PizZip(docxBuffer);
  const xml = zip.file('word/document.xml').asText();
  const matches = [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)];
  return matches.map(m => m[1]).join('');
}

function runTest(name, docxBuffer, options, data) {
  const zip = new PizZip(docxBuffer);
  const doc = new Docxtemplater(zip, options);
  doc.setData(data);
  
  let renderError = null;
  let renderedBuffer = null;
  
  try {
    doc.render();
    renderedBuffer = doc.getZip().generate({ type: 'nodebuffer' });
  } catch (e) {
    renderError = e.message;
    // Also capture the errors array if available
    if (e.errors && Array.isArray(e.errors)) {
      renderError = e.errors.map(err => `${err.name}: ${err.message}`).join('; ');
    }
  }
  
  const text = renderError ? 'N/A' : extractText(renderedBuffer);
  
  return {
    name,
    options,
    renderError,
    text,
  };
}

const templateBuffer = createMinimalDocx('{{name}}');

const tests = [
  {
    name: 'BASIC (no relaxed syntax)',
    options: {
      paragraphLoop: true,
      linebreaks: true,
    },
    data: { name: 'Alice' },
  },
  {
    name: 'RELAXED (allowUnclosedTag + allowUnopenedTag)',
    options: {
      paragraphLoop: true,
      linebreaks: true,
      syntax: {
        allowUnclosedTag: true,
        allowUnopenedTag: true,
      },
    },
    data: { name: 'Alice' },
  },
  {
    name: 'WITH nullGetter',
    options: {
      paragraphLoop: true,
      linebreaks: true,
      syntax: {
        allowUnclosedTag: true,
        allowUnopenedTag: true,
      },
      nullGetter: () => '',
    },
    data: { name: 'Alice', missingField: undefined },
  },
];

console.log('=== MINIMAL REPRODUCIBLE TEST ===');
console.log('docxtemplater version:', VERSIONS.docxtemplater);
console.log('pizzip version:', VERSIONS.pizzip);
console.log('');

for (const test of tests) {
  try {
    console.log(`--- ${test.name} ---`);
    console.log('Options:', JSON.stringify(test.options, null, 2));
    console.log('Data:', JSON.stringify(test.data));
    
    const result = runTest(test.name, templateBuffer, test.options, test.data);
    
    console.log('Render error:', result.renderError || 'none');
    console.log('Extracted text:', JSON.stringify(result.text));
    console.log('');
  } catch (e) {
    console.log(`--- ${test.name} ---`);
    console.log('FATAL ERROR:', e.message);
    console.log('');
  }
}
