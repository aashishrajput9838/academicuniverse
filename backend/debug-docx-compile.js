const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater').default;
const fs = require('fs');

const buf = fs.readFileSync('proper-headings-template-patched.docx');
const zip = new PizZip(buf);

// Monkey-patch compile to log zip content
const originalCompile = Docxtemplater.prototype.compile;
Docxtemplater.prototype.compile = function() {
  console.log('compile() called');
  console.log('zip.files keys:', Object.keys(this.zip.files).filter(k => !k.endsWith('/')));
  
  for (const key of Object.keys(this.zip.files)) {
    if (key.endsWith('/')) continue;
    const content = this.zip.files[key].asText();
    if (content.includes('{{')) {
      console.log(`File ${key} contains {{ at offsets:`);
      for (let i = 0; i < content.length; i++) {
        if (content[i] === '{' && content[i+1] === '{') {
          console.log(`  offset ${i}: ${content.substring(i, i+30)}`);
        }
      }
    }
  }
  
  return originalCompile.call(this);
};

try {
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.setData({ degree: 'BS CS', institution: 'MIT', category: 'Programming', items: 'JS, TS' });
  doc.render();
  console.log('Render succeeded');
} catch (err) {
  console.error('Failed:', err.message);
}
