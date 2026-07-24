const Lexer = require('docxtemplater/js/lexer');

var innerContentParts = [{ type: 'content', position: 'insidetag', value: '{{name}}' }];
var delimiters = { start: '{{', end: '}}' };
var syntaxOptions = { allowUnclosedTag: false, allowUnopenedTag: false };

var full = '';
for (var i = 0; i < innerContentParts.length; i++) {
  full += innerContentParts[i].value;
}

console.log('full:', JSON.stringify(full));

var delimiterMatches = [];
var offset = -1;
var insideTag = false;
var start = delimiters.start;
var end = delimiters.end;

while (true) {
  var startOffset = full.indexOf(start, offset + 1);
  var endOffset = full.indexOf(end, offset + 1);
  if (startOffset === -1 && endOffset === -1) break;
  
  var position, len;
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
  console.log('Match:', position, 'at', offset, 'len', len, 'insideTag:', insideTag);
}

console.log('\ndelimiterMatches:', JSON.stringify(delimiterMatches));

// Now run getDelimiterErrors manually
var errors = [];
var inDelimiter = false;
var lastDelimiterMatch = { offset: 0 };

console.log('\nReduce iterations:');
var delimiterWithErrors = delimiterMatches.reduce(function (delimiterAcc, currDelimiterMatch) {
  var position = currDelimiterMatch.position;
  var delimiterOffset = currDelimiterMatch.offset;
  var lastDelimiterOffset = lastDelimiterMatch.offset;
  var lastDelimiterLength = lastDelimiterMatch.length;
  var xtag = full.substr(lastDelimiterOffset, delimiterOffset - lastDelimiterOffset);
  
  console.log(`  curr: ${position} offset=${delimiterOffset} lastOff=${lastDelimiterOffset} lastLen=${lastDelimiterLength} inDelimiter=${inDelimiter} xtag=${JSON.stringify(xtag)}`);
  
  if (inDelimiter && position === "start") {
    if (lastDelimiterOffset + lastDelimiterLength === delimiterOffset) {
      errors.push({msg: 'duplicate_open'});
    }
  }
  if (!inDelimiter && position === "end") {
    if (lastDelimiterOffset + lastDelimiterLength === delimiterOffset) {
      errors.push({msg: 'duplicate_close'});
    }
  }
  
  inDelimiter = position === "start";
  lastDelimiterMatch = currDelimiterMatch;
  delimiterAcc.push(currDelimiterMatch);
  return delimiterAcc;
}, []);

console.log('\nErrors:', errors);
console.log('Final inDelimiter:', inDelimiter);
