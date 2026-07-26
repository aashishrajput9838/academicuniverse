const PizZip = require('pizzip');
const fs = require('fs');

const INPUT = process.argv[2];
const OUTPUT = process.argv[3] || (INPUT ? INPUT.replace(/\.docx$/, '-fixed.docx') : 'docx-template-compatible.docx');

function buildCleanXml() {
  const placeholders = [
    'name',
    'email',
    'phone',
    'url',
    'text',
    'items',
    'category',
    'company',
    'role',
    'duration',
    'degree',
    'institution',
    'year',
    'project_name',
    'description',
    'tech_stack',
    'certification_name',
    'issuer',
    'cert_date',
  ];

  const paragraphs = [];

  const heading = (text) =>
    `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>${text}</w:t></w:r></w:p>`;

  const line = (text) =>
    `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;

  paragraphs.push(heading('Resume'));
  paragraphs.push(line('{{name}}'));
  paragraphs.push(line('{{email}}'));
  paragraphs.push(line('{{phone}}'));
  paragraphs.push(line('{{url}}'));
  paragraphs.push(heading('Professional Summary'));
  paragraphs.push(line('{{text}}'));
  paragraphs.push(heading('Skills'));
  paragraphs.push(line('{{category}}'));
  paragraphs.push(line('{{items}}'));
  paragraphs.push(heading('Experience'));
  paragraphs.push(line('{{company}}'));
  paragraphs.push(line('{{role}}'));
  paragraphs.push(line('{{duration}}'));
  paragraphs.push(heading('Education'));
  paragraphs.push(line('{{degree}}'));
  paragraphs.push(line('{{institution}}'));
  paragraphs.push(line('{{year}}'));
  paragraphs.push(heading('Projects'));
  paragraphs.push(line('{{project_name}}'));
  paragraphs.push(line('{{description}}'));
  paragraphs.push(line('{{tech_stack}}'));
  paragraphs.push(heading('Certifications'));
  paragraphs.push(line('{{certification_name}}'));
  paragraphs.push(line('{{issuer}}'));
  paragraphs.push(line('{{cert_date}}'));

  const body = paragraphs.join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${body}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1800" w:bottom="1440" w:left="1800" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

function mergeSplitPlaceholders(xml) {
  const paragraphs = [];
  const pRegex = /<w:p>([\s\S]*?)<\/w:p>/g;
  let m;
  while ((m = pRegex.exec(xml)) !== null) {
    paragraphs.push(m[0]);
  }

  if (paragraphs.length === 0) return xml;

  let modified = false;
  const fixedParagraphs = paragraphs.map((para) => {
    const runs = [];
    const rRegex = /<w:r>([\s\S]*?)<\/w:r>/g;
    let rm;
    while ((rm = rRegex.exec(para)) !== null) {
      runs.push(rm[0]);
    }

    if (runs.length === 0) return para;

    const runTexts = runs.map((run) => {
      const tMatch = run.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/);
      return tMatch ? tMatch[1] : '';
    });

    const allText = runTexts.join('');
    const PLACEHOLDER_RE = /\{\{([^{}]|\{[^{}]*\})*\}\}/g;
    const placeholders = [];
    let match;
    while ((match = PLACEHOLDER_RE.exec(allText)) !== null) {
      placeholders.push({
        raw: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    if (placeholders.length === 0) return para;

    let textOffset = 0;
    const newRuns = [];
    let i = 0;

    while (i < runs.length) {
      const currentText = runTexts[i];
      const runStart = textOffset;
      const runEnd = textOffset + currentText.length;

      const placeholderInRun = placeholders.find(
        (ph) => ph.start < runEnd && ph.end > runStart
      );

      if (!placeholderInRun) {
        newRuns.push(runs[i]);
        textOffset = runEnd;
        i++;
        continue;
      }

      const contributing = [];
      let combinedText = '';
      let j = i;

      while (j < runs.length) {
        const rt = runTexts[j];
        const re = textOffset + rt.length;
        contributing.push(runs[j]);
        combinedText += rt;
        if (textOffset + combinedText.length >= placeholderInRun.end) {
          break;
        }
        j++;
      }

      if (contributing.length > 1 && combinedText === placeholderInRun.raw) {
        modified = true;
        const firstRun = contributing[0];
        const fixedRun = firstRun.replace(
          /<w:t[^>]*>[\s\S]*?<\/w:t>/,
          '<w:t>' + combinedText + '</w:t>'
        );
        newRuns.push(fixedRun);
      } else {
        contributing.forEach((run) => newRuns.push(run));
      }

      textOffset += contributing.reduce((sum, run) => {
        const tMatch = run.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/);
        return sum + (tMatch ? tMatch[1].length : 0);
      }, 0);

      i = j + 1;
    }

    if (!modified || newRuns.length === runs.length) return para;

    return '<w:p>' + newRuns.join('') + '</w:p>';
  });

  if (!modified) return xml;

  let result = xml;
  paragraphs.forEach((para, idx) => {
    if (fixedParagraphs[idx] !== para) {
      result = result.replace(para, fixedParagraphs[idx]);
    }
  });

  return result;
}

let xml;
if (INPUT) {
  const buf = fs.readFileSync(INPUT);
  const zip = new PizZip(buf);
  xml = zip.file('word/document.xml').asText();

  const fixedXml = mergeSplitPlaceholders(xml);
  if (fixedXml !== xml) {
    zip.file('word/document.xml', fixedXml);
    const out = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    fs.writeFileSync(OUTPUT, out);
    console.log('Created fixed template:', OUTPUT, '(' + out.length + ' bytes)');
  } else {
    console.log('No split placeholders found in:', INPUT);
  }
} else {
  xml = buildCleanXml();
  const zip = new PizZip();
  zip.file('word/document.xml', xml);
  const out = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(OUTPUT, out);
  console.log('Created clean template:', OUTPUT, '(' + out.length + ' bytes)');
}
