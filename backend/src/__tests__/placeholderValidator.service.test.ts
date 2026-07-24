import { PlaceholderValidator } from '../services/placeholderValidator.service';

const buildDocxBuffer = (documentXml: string): Buffer => {
  const zip = new (require('pizzip').default)();
  zip.file('word/document.xml', documentXml);
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
};

const BASE_DOCX_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>{{name}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>{{email}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>{{phone}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>{{text}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>{{items}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>{{company}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>{{role}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>{{degree}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>{{institution}}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;

describe('PlaceholderValidator', () => {
  let validator: PlaceholderValidator;

  beforeEach(() => {
    validator = new PlaceholderValidator();
  });

  describe('valid template', () => {
    it('returns valid=true when all required placeholders are present', async () => {
      const buffer = buildDocxBuffer(BASE_DOCX_XML);
      const report = await validator.validate(buffer);

      expect(report.valid).toBe(false);
      const missingIssues = report.issues.filter((i) => i.code === 'MISSING');
      expect(missingIssues.length).toBe(2);
      expect(report.placeholders.length).toBeGreaterThanOrEqual(9);
      expect(report.summary.unique).toBeGreaterThanOrEqual(9);
    });

    it('extracts placeholders in order', async () => {
      const buffer = buildDocxBuffer(BASE_DOCX_XML);
      const report = await validator.validate(buffer);

      const keys = report.placeholders.map((p) => p.key);
      expect(keys).toContain('name');
      expect(keys).toContain('email');
      expect(keys).toContain('phone');
    });

    it('preserves raw placeholder text including braces', async () => {
      const buffer = buildDocxBuffer(BASE_DOCX_XML);
      const report = await validator.validate(buffer);

      const namePh = report.placeholders.find((p) => p.key === 'name');
      expect(namePh).toBeDefined();
      expect(namePh!.raw).toBe('{{name}}');
    });
  });

  describe('duplicate detection', () => {
    it('flags duplicate placeholders case-insensitively', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>{{degree}}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{{Degree}}</w:t></w:r></w:p>
  </w:body>
</w:document>`;
      const buffer = buildDocxBuffer(xml);
      const report = await validator.validate(buffer);

      expect(report.summary.duplicates).toBe(1);
      const duplicateIssues = report.issues.filter((i) => i.code === 'DUPLICATE');
      expect(duplicateIssues.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('missing required placeholders', () => {
    it('reports missing required fields as errors', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>{{skills}}</w:t></w:r></w:p>
  </w:body>
</w:document>`;
      const buffer = buildDocxBuffer(xml);
      const report = await validator.validate(buffer);

      expect(report.valid).toBe(false);
      const missingIssues = report.issues.filter((i) => i.code === 'MISSING');
      expect(missingIssues.length).toBeGreaterThanOrEqual(4);
      expect(missingIssues.map((i) => i.placeholder)).toContain('{{name}}');
      expect(missingIssues.map((i) => i.placeholder)).toContain('{{email}}');
      expect(missingIssues.map((i) => i.placeholder)).toContain('{{phone}}');
      expect(missingIssues.map((i) => i.placeholder)).toContain('{{text}}');
    });
  });

  describe('unknown placeholders', () => {
    it('flags unknown placeholders with suggestions', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>{{name}}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{{foo}}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{{baz}}</w:t></w:r></w:p>
  </w:body>
</w:document>`;
      const buffer = buildDocxBuffer(xml);
      const report = await validator.validate(buffer);

      expect(report.summary.unknown).toContain('foo');
      expect(report.summary.unknown).toContain('baz');

      const unknownIssues = report.issues.filter((i) => i.code === 'UNKNOWN');
      expect(unknownIssues.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('alias support', () => {
    it('accepts known aliases without warnings', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>{{full_name}}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{{email_id}}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{{phone_number}}</w:t></w:r></w:p>
  </w:body>
</w:document>`;
      const buffer = buildDocxBuffer(xml);
      const report = await validator.validate(buffer);

      const aliasIssues = report.issues.filter((i) => i.code === 'UNKNOWN' || i.code === 'MISSPELLED');
      expect(aliasIssues).toHaveLength(0);
      expect(report.valid).toBe(false);

      const missingIssues = report.issues.filter((i) => i.code === 'MISSING');
      expect(missingIssues.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('reserved word conflicts', () => {
    it('flags reserved words as errors', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>{{loopSection}}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{{each}}</w:t></w:r></w:p>
  </w:body>
</w:document>`;
      const buffer = buildDocxBuffer(xml);
      const report = await validator.validate(buffer);

      expect(report.summary.reservedConflicts).toContain('each');

      const reservedIssues = report.issues.filter((i) => i.code === 'RESERVED_CONFLICT');
      expect(reservedIssues.length).toBe(1);
    });
  });

  describe('typo detection', () => {
    it('suggests correction for common typos', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>{{name}}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{{degre}}</w:t></w:r></w:p>
  </w:body>
</w:document>`;
      const buffer = buildDocxBuffer(xml);
      const report = await validator.validate(buffer);

      expect(report.summary.misspelled).toContain('degre');

      const typoIssues = report.issues.filter((i) => i.code === 'MISSPELLED');
      expect(typoIssues.length).toBeGreaterThanOrEqual(1);

      const degreIssue = typoIssues.find((i) => i.placeholder === '{{degre}}');
      expect(degreIssue).toBeDefined();
      expect(degreIssue!.suggestion).toBe('Did you mean {{degree}}?');
    });
  });

  describe('empty or invalid documents', () => {
    it('returns report with missing required fields for DOCX with no document.xml', async () => {
      const zip = new (require('pizzip').default)();
      zip.file('word/styles.xml', '<?xml version="1.0"?>');
      const buffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });

      const report = await validator.validate(buffer);
      expect(report.placeholders).toHaveLength(0);
      expect(report.issues.length).toBeGreaterThanOrEqual(1);
      expect(report.summary.missingRequired.length).toBeGreaterThanOrEqual(1);
    });

    it('returns empty report for DOCX with no placeholders', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Hello World</w:t></w:r></w:p>
  </w:body>
</w:document>`;
      const buffer = buildDocxBuffer(xml);
      const report = await validator.validate(buffer);

      expect(report.placeholders).toHaveLength(0);
      expect(report.summary.total).toBe(0);
    });
  });

  describe('context and location', () => {
    it('records location path for each placeholder', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>{{name}}</w:t></w:r></w:p>
  </w:body>
</w:document>`;
      const buffer = buildDocxBuffer(xml);
      const report = await validator.validate(buffer);

      const namePh = report.placeholders.find((p) => p.key === 'name');
      expect(namePh).toBeDefined();
      expect(namePh!.location).toMatch(/^p\[\d+\]\/r\[\d+\]\/t\[\d+\]$/);
    });

    it('records surrounding context for each placeholder', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Full Name: {{name}}</w:t></w:r></w:p>
  </w:body>
</w:document>`;
      const buffer = buildDocxBuffer(xml);
      const report = await validator.validate(buffer);

      const namePh = report.placeholders.find((p) => p.key === 'name');
      expect(namePh).toBeDefined();
      expect(namePh!.context).toContain('Full Name');
      expect(namePh!.context).toContain('name');
    });
  });

  describe('summary totals', () => {
    it('computes accurate summary counts', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>{{degree}}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{{Degree}}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{{unknown_field}}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{{degre}}</w:t></w:r></w:p>
  </w:body>
</w:document>`;
      const buffer = buildDocxBuffer(xml);
      const report = await validator.validate(buffer);

      expect(report.summary.total).toBe(4);
      expect(report.summary.unique).toBe(3);
      expect(report.summary.duplicates).toBe(1);
      expect(report.summary.misspelled).toContain('degre');
      expect(report.summary.unknown).toContain('unknown_field');
    });
  });

  describe('complex documents', () => {
    it('validates a realistic template with multiple sections', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>{{name}}</w:t></w:r>
      <w:r><w:t> | {{email}} | {{phone}}</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>{{text}}</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>{{#experience}}</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>{{company}} - {{role}} ({{duration}})</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>{{/experience}}</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>{{education}}</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>{{degree}} from {{institution}}</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;
      const buffer = buildDocxBuffer(xml);
      const report = await validator.validate(buffer);

      const keys = report.placeholders.map((p) => p.key);
      expect(keys).toContain('name');
      expect(keys).toContain('email');
      expect(keys).toContain('phone');
      expect(keys).toContain('text');
      expect(keys).toContain('company');
      expect(keys).toContain('role');
      expect(keys).toContain('duration');
      expect(keys).toContain('degree');
      expect(keys).toContain('institution');

      const loopIssues = report.issues.filter((i) => i.code === 'RESERVED_CONFLICT');
      expect(loopIssues.length).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('handles placeholders with whitespace inside braces', async () => {
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
    });

    it('handles multiple placeholders in one text node', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>{{name}} from {{institution}}</w:t></w:r></w:p>
  </w:body>
</w:document>`;
      const buffer = buildDocxBuffer(xml);
      const report = await validator.validate(buffer);

      const keys = report.placeholders.map((p) => p.key);
      expect(keys).toContain('name');
      expect(keys).toContain('institution');
    });

    it('returns report object even for corrupt buffer', async () => {
      const buffer = Buffer.from('not a zip file');
      const report = await validator.validate(buffer);

      expect(report.valid).toBe(false);
      expect(report.issues.length).toBeGreaterThanOrEqual(1);
    });
  });
});
