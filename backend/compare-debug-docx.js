const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const RAW_FILE = 'debug-raw-template.docx';
const GENERATED_FILE = 'generated-debug.docx';

function getZipEntries(buf) {
  const zip = new PizZip(buf);
  const entries = [];
  function traverse(dir, prefix) {
    const files = Object.keys(zip.files).filter(name => name.startsWith(prefix) && !name.endsWith('/')).sort();
    // For simplicity, just list all files
  }
  const files = Object.keys(zip.files).sort();
  files.forEach(name => {
    let content = null;
    try {
      if (!name.endsWith('/')) {
        content = zip.file(name).asText();
      }
    } catch (e) {
      content = '[binary or unreadable]';
    }
    entries.push({ name, content });
  });
  return entries;
}

function diffEntries(raw, generated) {
  const rawMap = new Map(raw.map(e => [e.name, e]));
  const genMap = new Map(generated.map(e => [e.name, e]));
  
  const allNames = new Set([...rawMap.keys(), ...genMap.keys()]);
  const diffs = [];
  
  allNames.forEach(name => {
    const inRaw = rawMap.has(name);
    const inGen = genMap.has(name);
    
    if (!inRaw) {
      diffs.push({ name, status: 'only_in_generated' });
    } else if (!inGen) {
      diffs.push({ name, status: 'only_in_raw' });
    } else {
      const rawContent = rawMap.get(name).content;
      const genContent = genMap.get(name).content;
      if (rawContent !== genContent) {
        diffs.push({ 
          name, 
          status: 'modified', 
          rawLength: rawContent ? rawContent.length : 0,
          genLength: genContent ? genContent.length : 0,
        });
      } else {
        diffs.push({ name, status: 'identical' });
      }
    }
  });
  
  return diffs;
}

async function main() {
  const rawBuf = fs.readFileSync(RAW_FILE);
  const genBuf = fs.readFileSync(GENERATED_FILE);
  
  console.log('=== BUFFER SIZES ===');
  console.log('Raw template:', rawBuf.length, 'bytes');
  console.log('Generated:', genBuf.length, 'bytes');
  
  const rawEntries = getZipEntries(rawBuf);
  const genEntries = getZipEntries(genBuf);
  
  console.log('\n=== RAW TEMPLATE ENTRIES ===');
  rawEntries.forEach(e => console.log(' ', e.name, e.content ? `(${e.content.length} chars)` : '(dir)'));
  
  console.log('\n=== GENERATED ENTRIES ===');
  genEntries.forEach(e => console.log(' ', e.name, e.content ? `(${e.content.length} chars)` : '(dir)'));
  
  const diffs = diffEntries(rawEntries, genEntries);
  console.log('\n=== DIFF SUMMARY ===');
  diffs.forEach(d => {
    if (d.status === 'identical') return;
    console.log(`  [${d.status.toUpperCase()}] ${d.name}`);
    if (d.status === 'modified') {
      console.log(`      raw: ${d.rawLength} chars, generated: ${d.genLength} chars`);
    }
  });
  
  // Show specific content diffs for key files
  const keyFiles = ['[Content_Types].xml', 'word/document.xml', '_rels/.rels', 'word/_rels/document.xml.rels'];
  console.log('\n=== KEY FILE COMPARISONS ===');
  keyFiles.forEach(name => {
    const rawEntry = rawEntries.find(e => e.name === name);
    const genEntry = genEntries.find(e => e.name === name);
    if (!rawEntry && !genEntry) {
      console.log(`  ${name}: missing in both`);
      return;
    }
    console.log(`\n--- ${name} ---`);
    if (rawEntry && rawEntry.content) {
      console.log('  RAW (first 500 chars):', rawEntry.content.substring(0, 500).replace(/\n/g, '\\n'));
    }
    if (genEntry && genEntry.content) {
      console.log('  GEN  (first 500 chars):', genEntry.content.substring(0, 500).replace(/\n/g, '\\n'));
    }
  });
  
  // Mammoth tests
  console.log('\n=== MAMMOTH CONVERSION TESTS ===');
  
  async function testMammoth(label, buf) {
    try {
      const result = await mammoth.convertToHtml({ buffer: buf });
      console.log(`  ${label}: SUCCESS (${result.value.length} chars)`);
      return { success: true, error: null };
    } catch (err) {
      console.log(`  ${label}: FAILED - ${err.message}`);
      return { success: false, error: err.message };
    }
  }
  
  const rawResult = await testMammoth('RAW TEMPLATE', rawBuf);
  const genResult = await testMammoth('GENERATED DOCX', genBuf);
  
  console.log('\n=== CONCLUSION ===');
  console.log('Raw template mammoth:', rawResult.success ? 'PASS' : 'FAIL');
  console.log('Generated DOCX mammoth:', genResult.success ? 'PASS' : 'FAIL');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
