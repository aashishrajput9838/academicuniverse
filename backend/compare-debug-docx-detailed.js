const PizZip = require('pizzip');
const fs = require('fs');
const mammoth = require('mammoth');

const RAW_FILE = 'debug-raw-template.docx';
const GENERATED_FILE = 'generated-debug.docx';

function getFileContent(buf, name) {
  const zip = new PizZip(buf);
  const file = zip.file(name);
  if (!file) return null;
  try {
    return file.asText();
  } catch (e) {
    return '[binary/unreadable]';
  }
}

function listEntries(buf, label) {
  const zip = new PizZip(buf);
  const entries = Object.keys(zip.files).sort();
  console.log(`\n=== ${label} ZIP ENTRIES (${entries.length} files) ===`);
  entries.forEach(name => {
    const file = zip.file(name);
    if (!file) return;
    let size = 0;
    try {
      size = file.asBinary().length;
    } catch (e) {
      size = file._data ? file._data.percentEncoded.length : 0;
    }
    console.log(`  ${name}  (${size} bytes)`);
  });
}

async function testMammoth(label, buf) {
  try {
    const result = await mammoth.convertToHtml({ buffer: buf });
    return { success: true, length: result.value.length, error: null };
  } catch (err) {
    return { success: false, length: 0, error: err.message };
  }
}

async function main() {
  const rawBuf = fs.readFileSync(RAW_FILE);
  const genBuf = fs.readFileSync(GENERATED_FILE);
  
  console.log('=== BUFFER SIZES ===');
  console.log(`Raw template:      ${rawBuf.length} bytes`);
  console.log(`Generated DOCX:    ${genBuf.length} bytes`);
  console.log(`Difference:        ${genBuf.length - rawBuf.length} bytes`);
  
  listEntries(rawBuf, 'RAW TEMPLATE');
  listEntries(genBuf, 'GENERATED DOCX');
  
  // Compare [Content_Types].xml
  console.log('\n=== [Content_Types].xml COMPARISON ===');
  const rawCT = getFileContent(rawBuf, '[Content_Types].xml');
  const genCT = getFileContent(genBuf, '[Content_Types].xml');
  console.log('RAW:');
  console.log(rawCT);
  console.log('\nGENERATED:');
  console.log(genCT);
  console.log('\nIDENTICAL:', rawCT === genCT);
  
  // Compare _rels/.rels
  console.log('\n=== _rels/.rels COMPARISON ===');
  const rawRels = getFileContent(rawBuf, '_rels/.rels');
  const genRels = getFileContent(genBuf, '_rels/.rels');
  console.log('RAW:');
  console.log(rawRels);
  console.log('\nGENERATED:');
  console.log(genRels);
  console.log('\nIDENTICAL:', rawRels === genRels);
  
  // Compare word/_rels/document.xml.rels
  console.log('\n=== word/_rels/document.xml.rels COMPARISON ===');
  const rawDocRels = getFileContent(rawBuf, 'word/_rels/document.xml.rels');
  const genDocRels = getFileContent(genBuf, 'word/_rels/document.xml.rels');
  console.log('RAW:');
  console.log(rawDocRels);
  console.log('\nGENERATED:');
  console.log(genDocRels);
  console.log('\nIDENTICAL:', rawDocRels === genDocRels);
  
  // Compare word/document.xml
  console.log('\n=== word/document.xml COMPARISON ===');
  const rawDoc = getFileContent(rawBuf, 'word/document.xml');
  const genDoc = getFileContent(genBuf, 'word/document.xml');
  console.log(`RAW length:      ${rawDoc ? rawDoc.length : 0} chars`);
  console.log(`GENERATED length:${genDoc ? genDoc.length : 0} chars`);
  console.log('IDENTICAL:', rawDoc === genDoc);
  
  if (rawDoc && genDoc) {
    if (rawDoc !== genDoc) {
      console.log('\n--- RAW document.xml (first 1000 chars) ---');
      console.log(rawDoc.substring(0, 1000));
      console.log('\n--- GENERATED document.xml (first 1000 chars) ---');
      console.log(genDoc.substring(0, 1000));
      
      // Find first difference
      const minLen = Math.min(rawDoc.length, genDoc.length);
      let firstDiff = -1;
      for (let i = 0; i < minLen; i++) {
        if (rawDoc[i] !== genDoc[i]) {
          firstDiff = i;
          break;
        }
      }
      if (firstDiff === -1 && rawDoc.length !== genDoc.length) {
        firstDiff = minLen;
      }
      if (firstDiff >= 0) {
        console.log(`\nFirst difference at index ${firstDiff}:`);
        const start = Math.max(0, firstDiff - 100);
        const end = Math.min(Math.max(rawDoc.length, genDoc.length), firstDiff + 100);
        console.log('CONTEXT (raw):   ...', rawDoc.substring(start, end), '...');
        console.log('CONTEXT (generated):...', genDoc.substring(start, end), '...');
      }
    }
    
    // Check for namespace issue
    const rawHasNs = rawDoc.includes('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"');
    const genHasNs = genDoc.includes('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"');
    console.log(`\nRAW has w: namespace declaration:      ${rawHasNs}`);
    console.log(`GENERATED has w: namespace declaration: ${genHasNs}`);
  }
  
  // Compare other files
  const otherFiles = ['docProps/app.xml', 'docProps/core.xml', 'docProps/custom.xml', 'word/fontTable.xml', 'word/settings.xml', 'word/styles.xml', 'word/webSettings.xml', 'word/theme/theme1.xml'];
  console.log('\n=== OTHER FILES COMPARISON ===');
  otherFiles.forEach(name => {
    const rawC = getFileContent(rawBuf, name);
    const genC = getFileContent(genBuf, name);
    const identical = rawC === genC;
    if (!identical) {
      console.log(`  [MODIFIED] ${name} (raw: ${rawC ? rawC.length : 0} chars, gen: ${genC ? genC.length : 0} chars)`);
    } else {
      console.log(`  [IDENTICAL] ${name}`);
    }
  });
  
  // Mammoth tests
  console.log('\n=== MAMMOTH CONVERSION TESTS ===');
  const rawMammoth = await testMammoth('RAW TEMPLATE', rawBuf);
  const genMammoth = await testMammoth('GENERATED DOCX', genBuf);
  
  console.log(`RAW TEMPLATE:      ${rawMammoth.success ? 'SUCCESS' : 'FAILED'} - ${rawMammoth.error || `(${rawMammoth.length} chars HTML)`}`);
  console.log(`GENERATED DOCX:    ${genMammoth.success ? 'SUCCESS' : 'FAILED'} - ${genMammoth.error || `(${genMammoth.length} chars HTML)`}`);
  
  console.log('\n=== FAILURE SUMMARY ===');
  console.log('Both files fail mammoth.convertToHtml() with:');
  console.log('  "Could not find the body element: are you sure this is a docx file?"');
  console.log('The raw template is already malformed before docxtemplater processes it.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
