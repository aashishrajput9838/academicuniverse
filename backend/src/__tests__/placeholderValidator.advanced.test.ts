import { PlaceholderValidator } from '../services/placeholderValidator.service';

const buildDocxBuffer = (documentXml: string): Buffer => {
  const zip = new (require('pizzip').default)();
  zip.file('word/document.xml', documentXml);
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
};

describe('PlaceholderValidator — advanced XML structures', () => {
  let validator: PlaceholderValidator;

  beforeEach(() => {
    validator = new PlaceholderValidator();
  });

  describe('tables', () => {
    it('detects placeholders inside table cells', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:tbl>
      <w:tr>
        <w:tc>
          <w:p><w:r><w:t>{{name}}</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:p><w:r><w:t>{{degree}}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`;
      const buffer = buildDocxBuffer(xml);
      const report = await validator.validate(buffer);

      const keys = report.placeholders.map((p) => p.key);
      expect(keys).toContain('name');
      expect(keys).toContain('degree');

      const namePh = report.placeholders.find((p) => p.key === 'name');
      expect(namePh!.location).toMatch(/^p\[\d+\]\/r\[\d+\]\/t\[\d+\]$/);
    });
  });

  describe('inline header-like and footer-like markup within document.xml (known limitation: separate word/header*.xml / word/footer*.xml parts are NOT scanned)', () => {
    it('detects placeholders inside inline w:hdr markup within document.xml', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Body</w:t></w:r></w:p>
  </w:body>
  <w:hdr>
    <w:p><w:r><w:t>{{name}}</w:t></w:r></w:p>
  </w:hdr>
</w:document>`;
      const buffer = buildDocxBuffer(xml);
      const report = await validator.validate(buffer);

      const keys = report.placeholders.map((p) => p.key);
      expect(keys).toContain('name');
    });

    it('detects placeholders inside inline w:ftr markup within document.xml', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Body</w:t></w:r></w:p>
  </w:body>
  <w:ftr>
    <w:p><w:r><w:t>{{pagenumber}}</w:t></w:r></w:p>
  </w:ftr>
</w:document>`;
      const buffer = buildDocxBuffer(xml);
      const report = await validator.validate(buffer);

      const keys = report.placeholders.map((p) => p.key);
      expect(keys).toContain('pagenumber');
    });
  });

  describe('nested runs and mixed formatting', () => {
    it('detects placeholder with mixed formatting in adjacent runs', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>{{na</w:t></w:r>
      <w:r><w:rPr><w:i/></w:rPr><w:t>me}}</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;
      const buffer = buildDocxBuffer(xml);
      const report = await validator.validate(buffer);

      const keys = report.placeholders.map((p) => p.key);
      expect(keys).toContain('name');
    });

    it('detects placeholder split across three runs with mixed formatting', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>{{</w:t></w:r>
      <w:r><w:rPr><w:i/></w:rPr><w:t>em</w:t></w:r>
      <w:r><w:rPr><w:u/></w:rPr><w:t>ail}}</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;
      const buffer = buildDocxBuffer(xml);
      const report = await validator.validate(buffer);

      const keys = report.placeholders.map((p) => p.key);
      expect(keys).toContain('email');
    });
  });

  describe('whitespace preservation and edge cases', () => {
    it('preserves placeholder with internal whitespace', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>{{  name  }}</w:t></w:r></w:p>
  </w:body>
</w:document>`;
      const buffer = buildDocxBuffer(xml);
      const report = await validator.validate(buffer);

      const namePh = report.placeholders.find((p) => p.key === 'name');
      expect(namePh).toBeDefined();
      expect(namePh!.raw).toBe('{{  name  }}');
    });

    it('detects placeholders in same paragraph with intervening text', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:t>{{name}}</w:t></w:r>
      <w:r><w:t> lives in </w:t></w:r>
      <w:r><w:t>{{institution}}</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;
      const buffer = buildDocxBuffer(xml);
      const report = await validator.validate(buffer);

      const keys = report.placeholders.map((p) => p.key);
      expect(keys).toContain('name');
      expect(keys).toContain('institution');
      expect(report.placeholders.length).toBe(2);
    });

    it('detects placeholders across paragraphs without false merging', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>{{name}}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{{email}}</w:t></w:r></w:p>
  </w:body>
</w:document>`;
      const buffer = buildDocxBuffer(xml);
      const report = await validator.validate(buffer);

      const keys = report.placeholders.map((p) => p.key);
      expect(keys).toContain('name');
      expect(keys).toContain('email');
      expect(report.placeholders.length).toBe(2);
    });

    it('does not detect placeholder without closing braces', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>{{name</w:t></w:r></w:p>
  </w:body>
</w:document>`;
      const buffer = buildDocxBuffer(xml);
      const report = await validator.validate(buffer);

      const keys = report.placeholders.map((p) => p.key);
      expect(keys).not.toContain('name');
    });

    it('detects escaped-looking but valid placeholders', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>{{na</w:t></w:r><w:r><w:t>me}}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{{email}}</w:t></w:r></w:p>
  </w:body>
</w:document>`;
      const buffer = buildDocxBuffer(xml);
      const report = await validator.validate(buffer);

      const keys = report.placeholders.map((p) => p.key);
      expect(keys).toContain('name');
      expect(keys).toContain('email');
    });
  });
});
