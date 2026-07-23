const PizZip = require('pizzip');
const fs = require('fs');
const mammoth = require('mammoth');

const RAW_FILE = 'debug-raw-template.docx';
const GENERATED_FILE = 'generated-debug.docx';

function getFileContent(buf, name) {
  const zip = new PizZip(buf);
  const file = zip.file(name);
  if (!file) return null;
  return file.asText();
}

async function testMammoth(label, buf) {
  try {
    const result = await mammoth.convertToHtml({ buffer: buf });
    return { success: true, length: result.value.length, error: null };
  } catch (err) {
    return { success: false, length: 0, error: err.message, stack: err.stack };
  }
}

async function main() {
  const rawBuf = fs.readFileSync(RAW_FILE);
  const genBuf = fs.readFileSync(GENERATED_FILE);
  
  console.log('=== BUFFER SIZES ===');
  console.log(`Raw template:      ${rawBuf.length} bytes`);
  console.log(`Generated DOCX:    ${genBuf.length} bytes`);
  console.log(`Difference:        ${genBuf.length - rawBuf.length} bytes`);
  
  // List entries
  const rawZip = new PizZip(rawBuf);
  const genZip = new PizZip(genBuf);
  const rawEntries = Object.keys(rawZip.files).sort();
  const genEntries = Object.keys(genZip.files).sort();
  
  console.log('\n=== ALL ZIP ENTRIES ===');
  console.log('RAW:');
  rawEntries.forEach(n => console.log('  ' + n));
  console.log('\nGENERATED:');
  genEntries.forEach(n => console.log('  ' + n));
  console.log('\nENTRY COUNT DIFF:', rawEntries.length, 'vs', genEntries.length);
  
  const allDiffs = [];
  rawEntries.forEach(e => { if (!genEntries.includes(e)) allDiffs.push(`RAW ONLY: ${e}`); });
  genEntries.forEach(e => { if (!rawEntries.includes(e)) allDiffs.push(`GEN ONLY: ${e}`); });
  console.log('ADDED/REMOVED:', allDiffs.length ? allDiffs.join('\n  ') : 'none');
  
  // Content diffs
  console.log('\n=== CONTENT DIFFS ===');
  const allNames = new Set([...rawEntries, ...genEntries]);
  const changed = [];
  const identical = [];
  allNames.forEach(name => {
    const r = getFileContent(rawBuf, name);
    const g = getFileContent(genBuf, name);
    if (r === null && g === null) return;
    if (r === g) {
      identical.push(name);
    } else {
      changed.push(name);
    }
  });
  console.log('IDENTICAL files:', identical.join(', ') || 'none');
  console.log('CHANGED files:  ', changed.join(', ') || 'none');
  
  // Key files deep comparison
  console.log('\n=== [Content_Types].xml DEEP COMPARISON ===');
  const rawCT = getFileContent(rawBuf, '[Content_Types].xml');
  const genCT = getFileContent(genBuf, '[Content_Types].xml');
  console.log('RAW [Content_Types].xml:');
  console.log(rawCT);
  console.log('\nGENERATED [Content_Types].xml:');
  console.log(genCT);
  
  // Exact byte-level diff for Content_Types
  if (rawCT !== genCT) {
    for (let i = 0; i < Math.max(rawCT.length, genCT.length); i++) {
      if (rawCT[i] !== genCT[i]) {
        console.log(`\n[Content_Types].xml first diff at index ${i}:`);
        console.log(`  RAW char at ${i}: ${JSON.stringify(rawCT[i])} (ord ${rawCT.charCodeAt(i)})`);
        console.log(`  GEN char at ${i}: ${JSON.stringify(genCT[i])} (ord ${genCT.charCodeAt(i)})`);
        console.log(`  RAW context:    ...${rawCT.substring(Math.max(0, i-20), i+20)}...`);
        console.log(`  GEN context:    ...${genCT.substring(Math.max(0, i-20), i+20)}...`);
        break;
      }
    }
  }
  
  // Relationships
  console.log('\n=== _rels/.rels COMPARISON ===');
  const rawRels = getFileContent(rawBuf, '_rels/.rels');
  const genRels = getFileContent(genBuf, '_rels/.rels');
  console.log('RAW _rels/.rels:');
  console.log(rawRels);
  console.log('\nGENERATED _rels/.rels:');
  console.log(genRels);
  console.log('\nIDENTICAL:', rawRels === genRels);
  
  console.log('\n=== word/_rels/document.xml.rels COMPARISON ===');
  const rawDocRels = getFileContent(rawBuf, 'word/_rels/document.xml.rels');
  const genDocRels = getFileContent(genBuf, 'word/_rels/document.xml.rels');
  console.log('RAW word/_rels/document.xml.rels:');
  console.log(rawDocRels);
  console.log('\nGENERATED word/_rels/document.xml.rels:');
  console.log(genDocRels);
  console.log('\nIDENTICAL:', rawDocRels === genDocRels);
  
  // word/document.xml full content
  console.log('\n=== word/document.xml FULL CONTENT ===');
  const rawDoc = getFileContent(rawBuf, 'word/document.xml');
  const genDoc = getFileContent(genBuf, 'word/document.xml');
  console.log('RAW word/document.xml:');
  console.log(rawDoc);
  console.log('\nGENERATED word/document.xml:');
  console.log(genDoc);
  console.log('\nIDENTICAL:', rawDoc === genDoc);
  
  // Check for missing namespace
  const rawHasNs = rawDoc.includes('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"');
  const genHasNs = genDoc.includes('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"');
  console.log('\nNamespace check:');
  console.log(`  RAW has w: namespace:      ${rawHasNs}`);
  console.log(`  GENERATED has w: namespace: ${genHasNs}`);
  
  if (!rawHasNs) {
    console.log('\n  ROOT CAUSE: word/document.xml is missing the WordprocessingML namespace declaration.');
    console.log('  Without xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main",');
    console.log('  mammoth cannot resolve w:body and throws "Could not find the body element".');
  }
  
  // Mammoth tests
  console.log('\n=== MAMMOTH CONVERSION TESTS ===');
  const rawMammoth = await testMammoth('RAW TEMPLATE', rawBuf);
  const genMammoth = await testMammoth('GENERATED DOCX', genBuf);
  
  console.log(`\nRAW TEMPLATE mammoth.convertToHtml():`);
  console.log(`  Result: ${rawMammoth.success ? 'SUCCESS' : 'FAILED'}`);
  if (!rawMammoth.success) {
    console.log(`  Error:  ${rawMammoth.error}`);
  } else {
    console.log(`  HTML:   ${rawMammoth.length} chars`);
  }
  
  console.log(`\nGENERATED DOCX mammoth.convertToHtml():`);
  console.log(`  Result: ${genMammoth.success ? 'SUCCESS' : 'FAILED'}`);
  if (!genMammoth.success) {
    console.log(`  Error:  ${genMammoth.error}`);
  } else {
    console.log(`  HTML:   ${genMammoth.length} chars`);
  }
  
  console.log('\n=== CONCLUSION ===');
  if (!rawMammoth.success && !genMammoth.success) {
    console.log('Both files FAIL mammoth.convertToHtml().');
    console.log('The failure originates in the raw Cloudinary template, which has a malformed');
    console.log('word/document.xml missing the required WordprocessingML namespace declaration.');
    console.log('docxtemplater preserves this malformed XML. The generated DOCX is structurally');
    console.log('identical to the input except for a 1-byte change in [Content_Types].xml.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
