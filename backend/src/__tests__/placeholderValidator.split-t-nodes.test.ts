import { PlaceholderValidator } from '../services/placeholderValidator.service';

const buildDocxBuffer = (documentXml: string): Buffer => {
  const zip = new (require('pizzip').default)();
  zip.file('word/document.xml', documentXml);
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
};

describe('PlaceholderValidator — split <w:t> nodes', () => {
  let validator: PlaceholderValidator;

  beforeEach(() => {
    validator = new PlaceholderValidator();
  });

  const makeXml = (fragments: string[]): string => {
    const body = fragments
      .map((text) => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`)
      .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${body}
  </w:body>
</w:document>`;
  };

  it('detects <w:t>{{de</w:t><w:t>gree}}</w:t> as degree', async () => {
    const xml = makeXml(['{{de', 'gree}}']);
    const buffer = buildDocxBuffer(xml);
    const report = await validator.validate(buffer);

    const keys = report.placeholders.map((p) => p.key);
    expect(keys).toContain('degree');
  });

  it('detects <w:t>{{na</w:t><w:t>me}}</w:t> as name', async () => {
    const xml = makeXml(['{{na', 'me}}']);
    const buffer = buildDocxBuffer(xml);
    const report = await validator.validate(buffer);

    const keys = report.placeholders.map((p) => p.key);
    expect(keys).toContain('name');
  });

  it('detects <w:t>{{</w:t><w:t>email}}</w:t> as email', async () => {
    const xml = makeXml(['{{', 'email}}']);
    const buffer = buildDocxBuffer(xml);
    const report = await validator.validate(buffer);

    const keys = report.placeholders.map((p) => p.key);
    expect(keys).toContain('email');
  });

  it('detects <w:t>{{de</w:t><w:t>gree}}</w:t> across runs in same paragraph', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:t>{{de</w:t></w:r>
      <w:r><w:t>gree}}</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;
    const buffer = buildDocxBuffer(xml);
    const report = await validator.validate(buffer);

    const keys = report.placeholders.map((p) => p.key);
    expect(keys).toContain('degree');
  });
});
