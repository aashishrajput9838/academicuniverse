# Resume Placeholder Architecture Redesign

**Date:** 2026-07-26  
**Architect:** Kilo (Senior Product Architect / Resume System Designer)  
**Status:** Design Document — No Implementation Code  

---

## 1. Current Problem Analysis

### 1.1 Existing Placeholders

| Current Tag | Used In | Issue |
|-------------|---------|-------|
| `{{name}}` | Header | ✅ OK |
| `{{phone}}` | Header | ✅ OK |
| `{{email}}` | Header | ✅ OK |
| `{{text}}` | GitHub, Summary, Experience, Education, Projects, Certifications | ❌ Reused 6× |
| `{{items}}` | Skills, Additional Info | ❌ Reused 2× |
| `{{company}}` | Experience | ✅ OK |
| `{{role}}` | Experience | ✅ OK |
| `{{degree}}` | Education | ✅ OK |
| `{{institution}}` | Education | ✅ OK |
| `{{project_name}}` | Projects | ✅ OK |
| `{{certification_name}}` | Certifications | ✅ OK |
| `{{category}}` | Skills | ✅ OK |

### 1.2 Root Cause

Generic tags (`text`, `items`) were used as a shortcut during template creation. This creates ambiguity during generation because Docxtemplater cannot distinguish which field maps to which semantic field without additional context.

---

## 2. Design Principles

1. **One Responsibility**: Every placeholder maps to exactly one semantic field.
2. **Snake Case**: All tags use lowercase_with_underscores.
3. **No Generic Names**: Prohibited: `text`, `value`, `items`, `data`, `content`, `description`.
4. **Array-Aware**: Repeatable fields use proper Docxtemplater loop syntax.
5. **ATS-Friendly**: Placeholder names should be self-documenting for HR software compatibility.
6. **Extensible**: Design supports AI field enhancement, dynamic forms, and template versioning.

---

## 3. Placeholder Specification Table

### 3.1 Header / Contact

| Placeholder | Type | Required | Description |
|-------------|------|----------|-------------|
| `{{full_name}}` | string | Yes | Student's full legal name |
| `{{phone}}` | string | Yes | Contact phone number |
| `{{email}}` | string | Yes | Professional email address |
| `{{github}}` | string | No | GitHub profile URL or username |
| `{{linkedin}}` | string | No | LinkedIn profile URL |
| `{{website}}` | string | No | Personal portfolio or website URL |
| `{{location}}` | string | No | City, State or Country |

### 3.2 Professional Summary

| Placeholder | Type | Required | Description |
|-------------|------|----------|-------------|
| `{{professional_summary}}` | string | Yes | 2-3 sentence professional objective |

### 3.3 Skills

| Placeholder | Type | Required | Description |
|-------------|------|----------|-------------|
| `{{skills}}` | array | Yes | Array of skill objects `{name, level}` |

### 3.4 Experience

| Placeholder | Type | Required | Description |
|-------------|------|----------|-------------|
| `{{experiences}}` | array | Yes | Array of experience objects |

**Experience entry fields:**
- `{{company}}`
- `{{role}}`
- `{{start_date}}`
- `{{end_date}}`
- `{{experience_description}}`
- `{{technologies}}`

### 3.5 Education

| Placeholder | Type | Required | Description |
|-------------|------|----------|-------------|
| `{{education_entries}}` | array | Yes | Array of education objects |

**Education entry fields:**
- `{{degree}}`
- `{{institution}}`
- `{{start_year}}`
- `{{end_year}}`
- `{{gpa}}` (optional)
- `{{education_details}}`

### 3.6 Projects

| Placeholder | Type | Required | Description |
|-------------|------|----------|-------------|
| `{{projects}}` | array | Yes | Array of project objects |

**Project entry fields:**
- `{{project_name}}`
- `{{project_description}}`
- `{{project_technologies}}`
- `{{project_url}}`

### 3.7 Certifications

| Placeholder | Type | Required | Description |
|-------------|------|----------|-------------|
| `{{certifications}}` | array | Yes | Array of certification objects |

**Certification entry fields:**
- `{{certification_name}}`
- `{{issuer}}`
- `{{issue_date}}`
- `{{expiry_date}}` (optional)
- `{{certification_details}}`

### 3.8 Additional Information

| Placeholder | Type | Required | Description |
|-------------|------|----------|-------------|
| `{{additional_info}}` | string | No | Any extra information section |
| `{{languages}}` | array | No | Array of language objects `{name, proficiency}` |
| `{{volunteering}}` | array | No | Array of volunteering objects |

---

## 4. Updated DOCX Placeholder Layout

```
{{full_name}}
{{phone}} | {{email}}
GitHub: {{github}}
LinkedIn: {{linkedin}}
Website: {{website}}
Location: {{location}}

PROFESSIONAL SUMMARY
{{professional_summary}}

SKILLS
{#each skills}
{{name}} — {{level}}
{/each}

EXPERIENCE
{#each experiences}}
{{company}} | {{role}} | {{start_date}} - {{end_date}}
{{experience_description}}
Technologies: {{technologies}}
{{/each}}

EDUCATION
{#each education_entries}}
{{degree}} | {{institution}} | {{start_year}} - {{end_year}}
{{education_details}}
{{/each}}

PROJECTS
{#each projects}}
{{project_name}}
{{project_description}}
Technologies: {{project_technologies}}
{{project_url}}
{{/each}}

CERTIFICATIONS
{#each certifications}}
{{certification_name}} | {{issuer}} | {{issue_date}}
{{certification_details}}
{{/each}}

ADDITIONAL INFORMATION
{{additional_info}}

LANGUAGES
{#each languages}}
{{name}} ({{proficiency}})
{{/each}}
```

---

## 5. Array Placeholders Requiring Loop Syntax

The following placeholders MUST be rendered using Docxtemplater's repeat block syntax:

| Placeholder | Template Syntax | Render Behavior |
|-------------|-----------------|-----------------|
| `skills` | `{#each skills}...{/each}` | Renders N skill blocks |
| `experiences` | `{#each experiences}...{/each}` | Renders N experience blocks |
| `education_entries` | `{#each education_entries}...{/each}` | Renders N education blocks |
| `projects` | `{#each projects}...{/each}` | Renders N project blocks |
| `certifications` | `{#each certifications}...{/each}` | Renders N certification blocks |
| `languages` | `{#each languages}...{/each}` | Renders N language blocks |

### Why Arrays Matter

Without proper array handling, the template either:
- Renders only the first entry, OR
- Serializes the entire array to a string like `"[object Object],[object Object]"`, OR
- Requires the backend to pre-flatten arrays into delimited strings

Using Docxtemplater loops preserves structure, supports checkbox-style AI enhancement per entry, and enables ATS-optimized section ordering.

---

## 6. Backend JSON Schema Recommendation

```json
{
  "full_name": "Aashish Rajput",
  "phone": "+91-9876543210",
  "email": "aashish@example.com",
  "github": "github.com/aashish",
  "linkedin": "linkedin.com/in/aashish",
  "website": "aashish.dev",
  "location": "New Delhi, India",
  "professional_summary": "Java Developer passionate about backend systems.",
  "skills": [
    { "name": "Java", "level": "Advanced" },
    { "name": "Spring Boot", "level": "Intermediate" }
  ],
  "experiences": [
    {
      "company": "OpenAI",
      "role": "Backend Intern",
      "start_date": "2023-06",
      "end_date": "2023-12",
      "experience_description": "Built scalable APIs...",
      "technologies": "Java, Spring Boot, PostgreSQL"
    }
  ],
  "education_entries": [
    {
      "degree": "B.Tech CSE",
      "institution": "Sharda University",
      "start_year": "2023",
      "end_year": "2027",
      "gpa": "8.5",
      "education_details": "CGPA: 8.5/10"
    }
  ],
  "projects": [
    {
      "project_name": "Academic Universe",
      "project_description": "Student ERP platform.",
      "project_technologies": "React, Node.js, MongoDB",
      "project_url": "github.com/academic-universe"
    }
  ],
  "certifications": [
    {
      "certification_name": "AWS Certified Developer",
      "issuer": "Amazon",
      "issue_date": "2024-01",
      "expiry_date": "2027-01",
      "certification_details": "Associate level certification"
    }
  ],
  "additional_info": "Open to relocation.",
  "languages": [
    { "name": "English", "proficiency": "Native" },
    { "name": "Hindi", "proficiency": "Native" }
  ],
  "volunteering": []
}
```

### Schema Rules

1. **All scalar fields are optional** except `full_name`, `phone`, `email`, `professional_summary`.
2. **All array fields default to empty** `[]` — never `null`.
3. **Array entries have a consistent shape** per section.
4. **No `text` or `items` keys** anywhere in the schema.
5. **AI enhancement targets** are explicit top-level keys.

---

## 7. Migration Strategy

### 7.1 From Current to New

| Current | New | Migration Action |
|---------|-----|------------------|
| `{{text}}` (GitHub) | `{{github}}` | Replace in template |
| `{{text}}` (Summary) | `{{professional_summary}}` | Replace in template |
| `{{text}}` (Experience) | `{{experience_description}}` | Replace + loop block |
| `{{text}}` (Education) | `{{education_details}}` | Replace + loop block |
| `{{text}}` (Projects) | `{{project_description}}` | Replace + loop block |
| `{{text}}` (Certifications) | `{{certification_details}}` | Replace + loop block |
| `{{items}}` (Skills) | `{{skills}}` loop | Replace + loop block |
| `{{items}}` (Additional) | `{{additional_info}}` | Replace in template |

### 7.2 Backward Compatibility

Old templates should continue to work with a `placeholderMap` adapter:

```typescript
const legacyToNew = {
  'text': 'professional_summary', // default mapping
  'items': 'skills' // default mapping
};
```

This allows the backend to serve both old and new templates during migration.

---

## 8. AI Enhancement Mapping

| AI-Enhanceable Field | Placeholder | Enhancement Target |
|---------------------|-------------|-------------------|
| Professional Summary | `{{professional_summary}}` | Full rewrite |
| Experience Description | `{{experience_description}}` | Per-entry rewrite |
| Project Description | `{{project_description}}` | Per-entry rewrite |
| Certification Details | `{{certification_details}}` | Per-entry rewrite |

Generic `text` tags cannot be targeted for AI because they carry no semantic meaning. The new schema enables precise, field-level AI enhancement.

---

## 9. Production Readiness Checklist

- [x] Every placeholder has a unique, descriptive name
- [x] No generic names (`text`, `items`, `value`, `data`)
- [x] Arrays are explicit and use Docxtemplater loop syntax
- [x] Backend JSON schema is type-safe and extensible
- [x] Compatibility with Docxtemplater syntax maintained
- [x] AI enhancement targets are explicit
- [x] Migration path from legacy templates defined
- [x] Supports dynamic form generation
- [x] Supports template versioning via `template_format_version` field

---

## 10. Open Questions for Product Owner

1. Should volunteering, languages, and awards be default sections or optional sections?
2. Should the backend enforce array limits (e.g., max 3 experiences)?
3. Should AI enhancement be enabled by default for summary only, or also for array entries?
4. This design assumes Docxtemplater loop support — is the team comfortable maintaining DOCX loop templates, or should we consider HTML-to-PDF for more complex layouts?
