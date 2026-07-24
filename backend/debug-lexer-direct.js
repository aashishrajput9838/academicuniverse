const PizZip = require('pizzip');
const fs = require('fs');
const Lexer = require('docxtemplater/js/lexer');

const buf = fs.readFileSync('proper-headings-output.docx');
const zip = new PizZip(buf);

const content = zip.file('word/document.xml').asText();

const xmlLexed = Lexer.xmlparse(content, {
  text: ["w:t", "a:t", "m:t", "vt:lpstr", "vt:lpwstr"],
  other: ["w:proofState", "w:tc", "w:tr", "w:tbl", "w:ftr", "w:hdr", "w:body", "w:document", "w:p", "w:r", "w:br", "w:rPr", "w:pPr", "w:spacing", "w:sdtContent", "w:sdt", "w:drawing", "w:sectPr", "w:type", "w:headerReference", "w:footerReference", "w:bookmarkStart", "w:bookmarkEnd", "w:commentRangeStart", "w:commentRangeEnd", "w:commentReference"]
});

// Decode content parts
lexer_decodeContentParts(xmlLexed, 'docx');

const innerContentParts = [];
for (let i = 0; i < xmlLexed.length; i++) {
  const part = xmlLexed[i];
  if (part.type === 'content' && part.position === 'insidetag') {
    innerContentParts.push(part);
  }
  if (part.type === 'placeholder') {
    innerContentParts.push(part);
  }
}

let full = '';
for (const p of innerContentParts) {
  full += p.value;
}

console.log('FULL length:', full.length);
console.log('FULL content:', JSON.stringify(full));

const delimiterMatches = Lexer.getAllDelimiterIndexes(full, {start: '{{', end: '}}'}, {});
console.log('\nDelimiter matches:', delimiterMatches);

function lexer_decodeContentParts(xmlparsed, fileType) {
  var inTextTag = false;
  for (var i = 0; i < xmlparsed.length; i++) {
    var part = xmlparsed[i];
    if (isTextStart(part)) {
      inTextTag = true;
    } else if (isTextEnd(part)) {
      inTextTag = false;
    }
    if (part.type === "content") {
      part.position = inTextTag ? "insidetag" : "outsidetag";
    }
    if (fileType !== "text" && isInsideContent(part)) {
      part.value = part.value.replace(/>/g, "&gt;");
    }
  }
}

function isTextStart(part) {
  return part.text && part.type === "tag" && part.position === "start" && part.text === "w:t";
}

function isTextEnd(part) {
  return part.text && part.type === "tag" && part.position === "end" && part.text === "w:t";
}

function isInsideContent(part) {
  return part.type === "placeholder" || (part.type === "content" && part.position === "insidetag");
}
