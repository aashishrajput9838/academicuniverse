# Resume Builder Architecture Redesign Proposal

## 1. Executive Summary

The current placeholder-based resume template engine has a fundamental product mismatch: faculty must manually add `{{tags}}` to DOCX files, but the actual workflow requires normal resumes to be converted into reusable templates automatically. This proposal redesigns the engine around DOCX structure understanding rather than placeholder extraction.

## 2. Current vs Target State

| Aspect | Current (Broken) | Target |
|--------|------------------|--------|
| Faculty input | DOCX with `{{name}}`, `{{email}}` | Normal DOCX resume |
| Extraction | Regex on `{{...}}` | LLM + rule-based entity detection |
| Template model | Flat `questions[]` array | Hierarchical `sections[]` with typed fields |
| Student experience | Form for placeholders | Form mapped to detected entities |
| Generation | `docxtemplater` with raw data | `docxtemplater` with structured data + formatting preservation |

## 3. Proposed Architecture

```
Faculty Upload (Normal DOCX)
    │
    ▼
Upload Service
    │
    ▼
DOCX Parser (PizZip + Mammoth)
    │
    ├── word/document.xml → raw text + formatting metadata
    └── Media extraction → images, styles
    │
    ▼
Entity Detection Engine
    │
    ├── Primary: LLM (Gemini/Claude) with structured output schema
    │   - Detect sections (Contact, Summary, Skills, Experience, etc.)
    │   - Extract entities within each section
    │   - Classify field types (text, textarea, date, list, link)
    │
    ├── Fallback: Rule-based parser
    │   - Regex patterns for common section headers
    │   - Heuristics for dates, emails, phone numbers
    │   - Bullet point detection
    │
    └── Confidence scoring
    │
    ▼
Template Model Builder
    │
    ├── sections: [
    │     {
    │       id: "contact",
    │       title: "Contact Information",
    │       fields: [
    │         { key: "name", label: "Full Name", type: "text", required: true },
    │         { key: "email", label: "Email", type: "text", required: true },
    │         { key: "phone", label: "Phone", type: "text", required: false }
    │       ]
    │     },
    │     {
    │       id: "experience",
    │       title: "Work Experience",
    │       repeatable: true,
    │       fields: [
    │         { key: "company", label: "Company", type: "text" },
    │         { key: "role", label: "Role", type: "text" },
    │         { key: "startDate", label: "Start Date", type: "date" },
    │         { key: "endDate", label: "End Date", type: "date" },
    │         { key: "bullets", label: "Responsibilities", type: "textarea", aiEnhanceable: true }
    │       ]
    │     }
    │   ]
    │
    └── formattingMetadata: {
          styles: [...],
          margins: {...},
          fonts: {...}
        }
    │
    ▼
Database Storage
    │
    ├── ResumeTemplate
    │   ├── templateName
    │   ├── type / target / organizationId / uploadedBy
    │   ├── fileUrl (original DOCX)
    │   ├── sections[] ← NEW
    │   ├── formattingMetadata ← NEW
    │   ├── confidence: number
    │   ├── reviewed: boolean
    │   └── createdAt / updatedAt
    │
    └── TemplateReviewQueue (optional)
        ├── templateId
        ├── issues: []
        └── status: 'pending' | 'approved' | 'rejected'
    │
    ▼
Student Template Selection
    │
    ▼
Dynamic Form Generator
    │
    ├── Iterate template.sections
    ├── Render fields based on type (text, textarea, date, list)
    ├── Support repeatable sections (multiple experiences)
    ├── Client-side validation
    └── AI enhancement for textarea fields
    │
    ▼
Resume Generation
    │
    ├── Flatten student form data into key-value pairs
    ├── Handle repeatable sections (arrays)
    ├── Inject into original DOCX via docxtemplater
    ├── Apply formatting metadata
    ├── Convert to HTML preview via Mammoth
    └── Return DOCX buffer + HTML preview
```

## 4. DOCX Parsing Strategy

### 4.1 Extraction Layers

**Layer 1: Structural Extraction (Deterministic)**
- Unzip DOCX using `PizZip`
- Parse `word/document.xml` for paragraph runs
- Extract `w:p` (paragraph) and `w:r` (run) elements
- Identify text runs with their formatting (bold, italic, font, size, color)
- Extract from `word/styles.xml` for heading styles
- Extract media from `word/media/`

**Layer 2: Section Detection (Rule-based + LLM)**
- Build ordered list of paragraphs with styles and content
- Run rule-based header detection:
  - Headings: `H1`, `H2` styles, or ALL CAPS, or followed by newline
  - Contact patterns: phone regex, email regex, URL regex, LinkedIn/GitHub patterns
  - Section headers: "Experience", "Education", "Skills", "Projects", "Certifications", "Publications"
- Pass paragraph list to LLM with structured output schema for section classification

**Layer 3: Entity Extraction (LLM Primary)**
- For each detected section, extract structured entities
- Example prompt for Experience section:
  ```
  Input: [
    "PawfectLifePet Store | Shopify",
    "Internshala ( https://pawfectlife-pet-store.myshopify.com/password )",
    "Feb2026 - March 2026",
    "Greater Noida,India",
    "Designed a Shopify e-commerce store...",
    "Developed product pages and collections..."
  ]
  
  Output: {
    company: "PawfectLifePet Store",
    role: "Shopify Developer",
    startDate: "Feb2026",
    endDate: "March 2026",
    location: "Greater Noida, India",
    bullets: ["Designed...", "Developed..."]
  }
  ```

**Layer 4: Validation**
- Confidence score per section
- Flag low-confidence extractions for faculty review
- Require manual approval before template becomes available to students

## 5. Entity Detection Strategy

### 5.1 Resume Section Taxonomy

Based on analysis of the Kushagra resume, standard sections include:

| Section | Detection Signals | Entity Fields |
|---------|-------------------|---------------|
| Contact | Phone regex, email regex, URL patterns | name, phone, email, github, portfolio, linkedin |
| Summary | Located near top, paragraph format | text (textarea) |
| Skills | Bullet points, comma-separated, "Skills:" header | items (list of strings) |
| Experience | Company names, date ranges, bullet points | company, role, startDate, endDate, location, bullets[] |
| Projects | Tech stack indicators, "Projects:" header | name, techStack, link, date, bullets[] |
| Education | Institution names, degree keywords, CGPA/GPA | institution, degree, startDate, endDate, cgpa, location |
| Certifications | "Certification", "Udemy", dates | title, issuer, date, link |
| Research | "Research", "Publications", IEEE patterns | title, authors, conference, year, link |

### 5.2 Rule-based Patterns

```typescript
const PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  phone: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
  url: /https?:\/\/[^\s]+/,
  github: /github\.com\/[a-zA-Z0-9_-]+/,
  linkedin: /linkedin\.com\/in\/[a-zA-Z0-9_-]+/,
  dateRange: /\w{3,}\s*\d{4}\s*[-–]\s*\w{3,}\s*\d{4}/,
  cgpa: /CGPA\s*[\d.]+|GPA\s*[\d.]+/,
  bullet: /^[•\-\*]\s+.+/
};
```

### 5.3 LLM Prompting Strategy

- Use structured output with `responseMimeType: 'application/json'`
- Provide section context to LLM (e.g., "Extract entities from this EXPERIENCE section")
- Use few-shot examples for each section type
- Temperature: 0.1-0.2 for deterministic extraction
- Validate JSON schema before saving

## 6. AI vs Rule-based Extraction

| Criterion | Rule-based Only | LLM Only | Hybrid (Recommended) |
|-----------|----------------|----------|----------------------|
| Accuracy on standard resumes | Medium | High | High |
| Accuracy on unusual layouts | Low | High | High |
| Latency | <100ms | 1-3s | 500ms-2s |
| Cost | Free | ~$0.01-0.05 per resume | ~$0.005-0.03 per resume |
| Determinism | High | Medium | Medium-High |
| Maintenance | High (fragile regex) | Low | Medium |
| Offline capability | Yes | No | Partial |

**Recommendation: Hybrid approach**
1. Run rule-based parser first for fast, deterministic extraction of contacts, dates, emails
2. Feed structured paragraph list to LLM for semantic section classification and entity extraction
3. Merge results, with LLM taking precedence on conflicts

## 7. Internal Template Model

### 7.1 Current Model (Broken)

```typescript
interface IResumeTemplate {
  templateName: string;
  type: 'section' | 'department' | 'global';
  target: string;
  fileUrl: string;
  organizationId: string;
  uploadedBy: string;
  questions: Array<{
    tag: string;
    question: string;
    type: 'text' | 'textarea';
    aiEnhanceable: boolean;
  }>;
}
```

### 7.2 Proposed Model

```typescript
interface IResumeTemplate {
  templateName: string;
  type: 'section' | 'department' | 'global';
  target: string;
  organizationId: string;
  uploadedBy: string;
  
  // NEW: Structured template definition
  sections: TemplateSection[];
  
  // NEW: Extracted formatting metadata
  formattingMetadata: {
    styles: Record<string, TextStyle>;
    headingLevels: Record<string, number>;
    bulletMarker: string;
    dateFormat: string;
  };
  
  // NEW: Quality metrics
  confidence: number; // 0-1 extraction confidence
  reviewed: boolean; // faculty approval flag
  reviewNotes?: string;
  
  // Preserved
  fileUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TemplateSection {
  id: string;
  title: string;
  order: number;
  repeatable: boolean;
  maxEntries?: number;
  minEntries?: number;
  fields: TemplateField[];
  aiPrompt?: string; // Section-specific AI instructions
}

interface TemplateField {
  key: string; // e.g., "company", "role", "startDate"
  label: string; // e.g., "Company Name"
  type: 'text' | 'textarea' | 'date' | 'email' | 'phone' | 'url' | 'select' | 'list';
  required: boolean;
  aiEnhanceable: boolean;
  placeholder?: string;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  options?: string[]; // For select type
}
```

## 8. Database Schema Changes

### 8.1 ResumeTemplate

```typescript
{
  // Existing fields preserved
  templateName: String,
  type: String, // enum: ['section', 'department', 'global']
  target: String,
  fileUrl: String,
  organizationId: ObjectId,
  uploadedBy: ObjectId,
  
  // Replaced
  // questions: [...] → sections: [...]
  
  // NEW
  sections: [{
    id: String,
    title: String,
    order: Number,
    repeatable: Boolean,
    maxEntries: Number,
    minEntries: Number,
    fields: [{
      key: String,
      label: String,
      type: String,
      required: Boolean,
      aiEnhanceable: Boolean,
      placeholder: String,
      validation: {
        pattern: String,
        minLength: Number,
        maxLength: Number
      },
      options: [String]
    }],
    aiPrompt: String
  }],
  
  formattingMetadata: {
    styles: Schema.Types.Mixed,
    headingLevels: Schema.Types.Mixed,
    bulletMarker: String,
    dateFormat: String
  },
  
  confidence: { type: Number, default: 0 },
  reviewed: { type: Boolean, default: false },
  reviewNotes: String,
  
  // Timestamps preserved
  createdAt: Date,
  updatedAt: Date
}
```

### 8.2 New Collection: TemplateReviewQueue (Optional but Recommended)

```typescript
{
  templateId: ObjectId,
  organizationId: ObjectId,
  submittedBy: ObjectId,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'needs_revision'],
    default: 'pending'
  },
  issues: [{
    section: String,
    field: String,
    severity: 'error' | 'warning' | 'info',
    message: String
  }],
  reviewedBy: ObjectId,
  reviewedAt: Date,
  notes: String
}
```

### 8.3 Migration Strategy

1. Add new fields as optional with defaults
2. Backfill existing templates:
   - Migrate `questions` array to `sections` format
   - Create default section for each legacy template
   - Confidence = 0 for migrated templates (requires review)
3. Gradual rollout:
   - Phase 1: New uploads use new format
   - Phase 2: Migrate old templates on next faculty edit
   - Phase 3: Remove legacy `questions` field

## 9. Dynamic Form Generation

### 9.1 Client-side Architecture

```
TemplateData (sections[])
    │
    ▼
FormBuilder (new component)
    │
    ├── SectionRenderer
    │   ├── Header (title, description)
    │   ├── FieldRenderer[] (iterates fields)
    │   └── RepeatableSection[] (if repeatable: true)
    │       ├── Add/Remove buttons
    │       └── Nested FieldRenderers
    │
    ├── ValidationEngine
    │   ├── Required field checks
    │   ├── Pattern matching
    │   └── Cross-field validation
    │
    └── AIEnhancementPanel
        ├── Triggered for aiEnhanceable fields
        ├── Sends field value + context to AI
        └── Shows enhanced version for acceptance
```

### 9.2 Field Type Handling

| Type | Input Component | Validation |
|------|-----------------|------------|
| `text` | `<input type="text">` | pattern, minLength, maxLength |
| `textarea` | `<textarea>` | minLength, maxLength |
| `date` | `<input type="date">` | ISO format validation |
| `email` | `<input type="email">` | email regex |
| `phone` | `<input type="tel">` | phone regex |
| `url` | `<input type="url">` | URL validation |
| `select` | `<Select>` | must be in options |
| `list` | Dynamic list with Add/Remove | minItems, maxItems |

### 9.3 Repeatable Sections

For Experience, Education, Projects:
- Start with minEntries empty forms
- "Add Another" button appends new form group
- Drag-and-drop reordering (optional enhancement)
- Each repeat has unique instance ID for form data

## 10. Resume Regeneration Pipeline

```typescript
interface GenerationPipeline {
  async generate(templateId: string, formData: FormData): Promise<{
    docxBuffer: Buffer;
    htmlPreview: string;
  }> {
    // 1. Load template
    const template = await ResumeTemplate.findById(templateId);
    
    // 2. Flatten form data into docxtemplater format
    const docxData = this.flattenFormData(formData, template.sections);
    
    // 3. Fetch original DOCX from Storage
    const docxBuffer = await fetch(template.fileUrl);
    
    // 4. Render with docxtemplater
    const zip = new PizZip(docxBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });
    
    // 5. AI enhancement phase
    if (this.aiEnabled) {
      const enhanceableFields = this.getEnhanceableFields(formData);
      const enhancedData = await this.enhanceFields(docxData, enhanceableFields);
      doc.setData(enhancedData);
    } else {
      doc.setData(docxData);
    }
    
    doc.render();
    
    // 6. Generate buffer
    const renderedBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });
    
    // 7. Generate HTML preview
    const htmlPreview = await mammoth.convertToHtml({ buffer: renderedBuffer });
    
    return { docxBuffer: renderedBuffer, htmlPreview: htmlPreview.value };
  }
  
  private flattenFormData(formData: FormData, sections: TemplateSection[]): any {
    const result: any = {};
    
    for (const section of sections) {
      if (section.repeatable) {
        const entries = formData[section.id] || [];
        result[section.id] = entries.map((entry: any) => {
          const item: any = {};
          for (const field of section.fields) {
            if (entry[field.key]) {
              item[field.key] = entry[field.key];
            }
          }
          return item;
        });
      } else {
        const sectionData: any = {};
        for (const field of section.fields) {
          if (formData[field.key]) {
            sectionData[field.key] = formData[field.key];
          }
        }
        result[section.id] = sectionData;
      }
    }
    
    return result;
  }
}
```

## 11. Error Handling

| Failure Point | Detection | Recovery | User Experience |
|---------------|-----------|----------|------------------|
| DOCX upload fails | HTTP error, file size validation | Retry with exponential backoff | Show error, "Retry upload" button |
| DOCX parsing fails | PizZip throws, malformed XML | Fall back to plain text extraction | Show warning: "Could not extract formatting" |
| Section detection fails | LLM timeout or invalid JSON | Use rule-based fallback | Show "Basic template detected", manual review |
| LLM API unavailable | 5xx, timeout, rate limit | Use rule-based parser entirely | Show "Limited template detection", faculty reviews |
| Low confidence extraction | confidence < 0.6 | Queue for faculty review | Template listed as "Draft - needs review" |
| Field validation fails | Regex, pattern mismatch | Mark field invalid | Show inline error, prevent submission |
| DOCX generation fails | docxtemplater render error | Return error with context | Show "Generation failed", retry button |
| Preview conversion fails | Mammoth error | Show raw DOCX download | "Preview unavailable, download instead" |

## 12. Performance Considerations

| Concern | Mitigation |
|---------|------------|
| LLM latency (1-3s per template) | Show progress indicator, cache extracted templates |
| Large DOCX files (10MB+) | Limit to 5MB, stream processing |
| Concurrent uploads | Queue processing, rate limiting |
| Repeated LLM calls for similar resumes | Cache by hash, semantic similarity |
| Frontend form rendering with 50+ fields | Virtualize long lists, lazy load sections |

## 13. Security Considerations

| Concern | Mitigation |
|---------|------------|
| Malicious DOCX uploads | Validate MIME type, scan for macros, sandbox PizZip |
| LLM prompt injection | Sanitize extracted text, limit prompt scope |
| PII in DOCX | Do not log raw content, encrypt at rest |
| Firebase Storage access | Signed URLs with expiry, org-scoped paths |
| XSS in HTML preview | Sanitize Mammoth output, CSP headers |
| Template poisoning | Faculty-only upload, review queue for new templates |

## 14. Scalability Considerations

| Dimension | Current Limit | Scaling Strategy |
|-----------|--------------|------------------|
| Templates per org | ~100 | Pagination, lazy loading |
| Fields per template | ~20 | Virtualized form rendering |
| LLM calls | ~10/min | Batch processing, queue, caching |
| DOCX storage | ~50MB | Firebase Storage with CDN |
| Concurrent generations | ~5 | Job queue, WebSocket notifications |

## 15. Recommended Libraries/Packages

| Purpose | Library | Status |
|---------|---------|--------|
| DOCX parsing | `pizzip` | Already in use |
| DOCX templating | `docxtemplater` | Already in use |
| DOCX to HTML | `mammoth` | Already in use |
| LLM structured output | `@google/generative-ai` | Already in use |
| LLM alternative | `openai` (GPT-4o) | Optional |
| Form state management | React Hook Form + Zod | Recommended |
| Date handling | `date-fns` | Already in use |
| PDF generation (optional) | `pdf-lib` or `playwright` | Future |

## 16. Potential Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| LLM cost per resume | $0.01-0.05 per template extraction | Cache, batch, use cheaper models for simple docs |
| LLM accuracy on complex layouts | May miss sections in 2-column layouts | Rule-based preprocessing, faculty review queue |
| DOCX formatting preservation | Complex styles may not survive regeneration | Store style metadata, use docx template with conditional fields |
| Non-standard section names | "Work History" vs "Experience" | LLM handles semantic matching |
| Images in DOCX | Mammoth may not preserve all images | Store media separately, inject during generation |
| Tables in resumes | Hard to convert to dynamic forms | Support table sections as static blocks |

## 17. Future Extensibility

| Feature | Approach |
|---------|----------|
| Multi-language resumes | LLM with multilingual prompts, locale-aware date formats |
| PDF template support | Add `pdf-parse` or `pdf-lib` extraction pipeline |
| Template marketplace | Public/private templates, versioning, forking |
| Collaborative editing | Real-time form builder for faculty |
| A/B testing templates | Track completion rates, generation success |
| Analytics | Most used fields, drop-off points, AI enhancement acceptance |

## 18. Approach Comparison

### Approach A: Re-enable Disabled Placeholder Extraction

**Description:** Simply uncomment the existing regex-based extraction in `resumeController.ts`.

**Advantages:**
- Minimal code change
- Immediate fix
- No new dependencies

**Disadvantages:**
- Still requires faculty to manually add `{{tags}}`
- Product vision mismatch (Kushagra resume proves this)
- No understanding of resume structure
- Limited to flat placeholder extraction
- No section awareness

**Complexity:** Very Low

**Verdict:** Not recommended for production SaaS. Only viable as temporary stopgap.

### Approach B: Pure Rule-based Parser

**Description:** Build comprehensive regex patterns and heuristics for every resume section type.

**Advantages:**
- Deterministic, no LLM cost
- Fast execution
- Predictable behavior

**Disadvantages:**
- Fragile across resume formats
- High maintenance burden
- Cannot handle creative layouts
- Requires exhaustive pattern library
- Poor accuracy on non-standard resumes

**Complexity:** Medium-High

**Verdict:** Not recommended. Rule-based alone cannot handle resume variation at scale.

### Approach C: Pure LLM Parsing (No Rules)

**Description:** Send entire DOCX text to LLM with structured output schema for full extraction.

**Advantages:**
- Highest accuracy on varied formats
- Handles 2-column layouts, creative designs
- Single integration point
- Easy to extend with new section types

**Disadvantages:**
- Latency: 1-3 seconds per template
- Cost: ~$0.01-0.05 per extraction
- Non-deterministic without strict temperature
- Requires robust JSON validation
- No fallback if LLM unavailable

**Complexity:** Medium

**Verdict:** Viable for small scale, but expensive and slow at production scale.

### Approach D: Hybrid Engine (Recommended)

**Description:** Rule-based pre-processing + LLM semantic extraction + faculty review queue.

**Advantages:**
- Best accuracy across formats
- Fast rule-based pass for common fields (email, phone, dates)
- LLM handles complex semantic extraction
- Lower LLM cost (smaller, focused prompts)
- Faculty review ensures quality
- Graceful degradation if LLM fails

**Disadvantages:**
- More complex than single-approach
- Requires maintaining rule library
- LLM dependency remains

**Complexity:** Medium

**Verdict:** **Recommended for production SaaS.** Optimal balance of accuracy, cost, and maintainability.

## 19. Recommended Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
1. Add `sections[]` and `formattingMetadata` to `ResumeTemplate` schema
2. Build DOCX parser service (text extraction + formatting metadata)
3. Implement rule-based section detector
4. Create basic template review UI for faculty

### Phase 2: LLM Integration (Week 3-4)
1. Integrate LLM structured extraction
2. Build entity detection prompts for each section type
3. Implement confidence scoring
4. Add fallback cascade: LLM → rules → manual

### Phase 3: Frontend Form Builder (Week 5-6)
1. Build dynamic form generator from `sections[]`
2. Support repeatable sections
3. Add field validation and AI enhancement UI
4. Wire up to existing generation pipeline

### Phase 4: Migration & Polish (Week 7-8)
1. Migrate legacy `questions` to `sections`
2. Backfill existing templates
3. Add review queue workflow
4. Performance optimization, caching

## 20. Conclusion

The placeholder-based approach is a product mismatch. The Kushagra resume proves that faculty upload normal, pre-filled resumes without any `{{tags}}`. The proposed hybrid architecture enables automatic structure understanding, making template creation a zero-effort faculty experience while maintaining the dynamic form generation and DOCX regeneration that students need.

**Immediate next step:** Approve Phase 1 schema changes and DOCX parser service.
