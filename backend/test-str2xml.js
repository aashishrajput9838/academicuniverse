const str2xml = require('docxtemplater/js/doc-utils').str2xml;

const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>{{name}}</w:t></w:r></w:p></w:body></w:document>';

const dom = str2xml(xml);
const serializer = new XMLSerializer();
const serialized = serializer.serializeToString(dom);

console.log('Original length:', xml.length);
console.log('Serialized length:', serialized.length);
console.log('Same?', xml === serialized);
if (xml !== serialized) {
  console.log('First diff:');
  for (let i = 0; i < Math.min(xml.length, serialized.length); i++) {
    if (xml[i] !== serialized[i]) {
      console.log(`Offset ${i}: orig="${xml.substring(i, i+20)}" serial="${serialized.substring(i, i+20)}"`);
      break;
    }
  }
}
