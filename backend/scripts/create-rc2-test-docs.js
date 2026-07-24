var PizZip = require('pizzip');
var fs = require('fs');
var path = require('path');

function createDocx(filename, documentXml) {
  var zip = new PizZip();
  zip.file('word/document.xml', documentXml);
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  var buf = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(filename, buf);
  console.log('Created ' + filename + ' (' + buf.length + ' bytes)');
}

// Scenario 1: Valid template
createDocx('rc2-valid-template.docx', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>{{name}}</w:t></w:r></w:p><w:p><w:r><w:t>{{email}}</w:t></w:r></w:p><w:p><w:r><w:t>{{phone}}</w:t></w:r></w:p></w:body></w:document>');

// Scenario 2: Missing required (no email)
createDocx('rc2-missing-required.docx', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>{{name}}</w:t></w:r></w:p><w:p><w:r><w:t>{{phone}}</w:t></w:r></w:p></w:body></w:document>');

// Scenario 3: Unknown placeholders
createDocx('rc2-unknown-placeholders.docx', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>{{name}}</w:t></w:r></w:p><w:p><w:r><w:t>{{department}}</w:t></w:r></w:p></w:body></w:document>');

// Scenario 4: Duplicate placeholders
createDocx('rc2-duplicate-placeholders.docx', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>{{name}}</w:t></w:r></w:p><w:p><w:r><w:t>{{name}}</w:t></w:r></w:p><w:p><w:r><w:t>{{email}}</w:t></w:r></w:p></w:body></w:document>');

// Scenario 5: Misspelled placeholders
createDocx('rc2-misspelled-placeholders.docx', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>{{nam}}</w:t></w:r></w:p><w:p><w:r><w:t>{{emial}}</w:t></w:r></w:p></w:body></w:document>');

// Scenario 6: Reserved placeholders
createDocx('rc2-reserved-placeholders.docx', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>{{name}}</w:t></w:r></w:p><w:p><w:r><w:t>{{date}}</w:t></w:r></w:p><w:p><w:r><w:t>{{sectionname}}</w:t></w:r></w:p></w:body></w:document>');

// Scenario 7: Large DOCX
var largeXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>';
for (var i = 0; i < 500; i++) {
  largeXml += '<w:p><w:r><w:t>Paragraph ' + i + ' with filler text to make this a large document.</w:t></w:r></w:p>';
}
largeXml += '<w:p><w:r><w:t>{{name}}</w:t></w:r></w:p></w:body></w:document>';
createDocx('rc2-large-docx.docx', largeXml);

// Scenario 8: Tables
createDocx('rc2-tables.docx', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Field</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Value</w:t></w:r></w:p></w:tc></w:tr><w:tr><w:tc><w:p><w:r><w:t>Name</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>{{name}}</w:t></w:r></w:p></w:tc></w:tr><w:tr><w:tc><w:p><w:r><w:t>Email</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>{{email}}</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>');

// Scenario 9: Mixed formatting
createDocx('rc2-mixed-formatting.docx', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>{{name}}</w:t></w:r></w:p><w:p><w:r><w:rPr><w:i/></w:rPr><w:t>Contact:</w:t></w:r><w:r><w:t>{{email}}</w:t></w:r></w:p></w:body></w:document>');

// Scenario 10: Split runs
createDocx('rc2-split-runs.docx', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>{{na</w:t></w:r><w:r><w:t>me}}</w:t></w:r></w:p><w:p><w:r><w:t>{{em}}</w:t></w:r><w:r><w:t>ail}}</w:t></w:r></w:p></w:body></w:document>');

// Scenario 11: Legacy template (no placeholders)
createDocx('rc2-legacy-template.docx', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>This is a legacy template without any placeholders.</w:t></w:r></w:p><w:p><w:r><w:t>It uses auto-inject formatting.</w:t></w:r></w:p></w:body></w:document>');

console.log('\nAll RC-2 test DOCX files created.');