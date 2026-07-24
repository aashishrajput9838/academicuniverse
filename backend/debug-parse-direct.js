const PizZip = require('pizzip');
const Lexer = require('docxtemplater/js/lexer');

const zip = new PizZip();
zip.file('word/document.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>{{name}}</w:t></w:r></w:p></w:body></w:document>');

const content = zip.file('word/document.xml').asText();

const xmlLexed = Lexer.xmlparse(content, {
  text: ["w:t", "a:t", "m:t", "vt:lpstr", "vt:lpwstr"],
  other: ["w:proofState", "w:tc", "w:tr", "w:tbl", "w:ftr", "w:hdr", "w:body", "w:document", "w:p", "w:r", "w:br", "w:rPr", "w:pPr", "w:spacing", "w:sdtContent", "w:sdt", "w:drawing", "w:sectPr", "w:type", "w:headerReference", "w:footerReference", "w:bookmarkStart", "w:bookmarkEnd", "w:commentRangeStart", "w:commentRangeEnd", "w:commentReference"]
});

console.log('xmlLexed length:', xmlLexed.length);
xmlLexed.forEach((part, i) => {
  console.log(`[${i}] type=${part.type} position=${part.position || 'undefined'} text=${part.text || 'n/a'} value=${JSON.stringify(part.value)}`);
});

// Manually run decodeContentParts
var inTextTag = false;
for (var i = 0; i < xmlLexed.length; i++) {
  var part = xmlLexed[i];
  var isStart = part.text && part.type === "tag" && part.position === "start";
  var isEnd = part.text && part.type === "tag" && part.position === "end";
  if (isStart) inTextTag = true;
  if (isEnd) inTextTag = false;
  if (part.type === "content") {
    part.position = inTextTag ? "insidetag" : "outsidetag";
  }
}

console.log('\nAfter decodeContentParts:');
xmlLexed.forEach((part, i) => {
  if (part.type === 'content') {
    console.log(`[${i}] type=${part.type} position=${part.position} value=${JSON.stringify(part.value)}`);
  }
});

// getContentParts
var innerContentParts = [];
for (var i = 0; i < xmlLexed.length; i++) {
  var part = xmlLexed[i];
  if (part.type === "content" && part.position === "insidetag") {
    innerContentParts.push(part);
  }
  if (part.type === "placeholder") {
    innerContentParts.push(part);
  }
}

console.log('\ninnerContentParts:');
innerContentParts.forEach((part, i) => {
  console.log(`[${i}] position=${part.position} value=${JSON.stringify(part.value)}`);
});

var full = '';
for (var i = 0; i < innerContentParts.length; i++) {
  full += innerContentParts[i].value;
}

console.log('\nfull:', JSON.stringify(full));

// parseDelimiters
var delimiterMatches = [];
var offset = -1;
var insideTag = false;
var start = '{{';
var end = '}}';
while (true) {
  var startOffset = full.indexOf(start, offset + 1);
  var endOffset = full.indexOf(end, offset + 1);
  var position = null;
  var len;
  if (startOffset === -1 && endOffset === -1) break;
  if (startOffset === endOffset) {
    position = insideTag ? "end" : "start";
    len = insideTag ? end.length : start.length;
    offset = startOffset;
  } else if (endOffset === -1 || (startOffset !== -1 && startOffset < endOffset)) {
    position = "start";
    len = start.length;
    offset = startOffset;
  } else {
    position = "end";
    len = end.length;
    offset = endOffset;
  }
  delimiterMatches.push({ position: position, offset: offset, length: len });
  insideTag = position === "start";
}

console.log('\ndelimiterMatches:', delimiterMatches);
