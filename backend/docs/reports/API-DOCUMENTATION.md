# API Documentation — Resume Pipeline

## Base URL
`/api/resume`

## Authentication
All resume endpoints require JWT authentication via `authenticateUser` middleware.

---

## Endpoints

### 1. Upload Template (Faculty/Admin)
`POST /templates`

**Multipart form data:**
| Field | Type | Description |
|---|---|---|
| templateFile | File | DOCX or PDF resume template |

**Response 200:**
```json
{
  "success": true,
  "message": "Template uploaded successfully",
  "template": {
    "id": "...",
    "fileName": "resume templet 5 conv.docx",
    "format": "docx",
    "uploadedAt": "..."
  }
}
```

---

### 2. List Available Templates (Student)
`GET /templates`

**Response 200:**
```json
{
  "success": true,
  "templates": [
    {
      "id": "...",
      "fileName": "resume templet 5 conv.docx",
      "format": "docx",
      "uploadedAt": "..."
    }
  ]
}
```

---

### 3. Process Template (Faculty/Admin)
`POST /process`

**Body:**
```json
{
  "templateId": "..."
}
```

**Response 200:**
```json
{
  "success": true,
  "sections": [
    {
      "id": "section_1",
      "title": "Education",
      "fields": [
        { "key": "degree", "label": "Degree", "type": "text", "required": true }
      ]
    }
  ],
  "entities": [],
  "confidence": 0.85,
  "placeholdersInjected": 11
}
```

---

### 4. Generate Resume (Student)
`POST /generate-resume`

**Body:**
```json
{
  "processedTemplateBuffer": "base64...",
  "studentData": {
    "degree": "B.Tech",
    "institution": "State University",
    "company": "Tech Corp"
  }
}
```

**Response 200:**
```json
{
  "success": true,
  "docxBase64": "base64...",
  "htmlPreview": "<html>...</html>",
  "validation": { "valid": true, "issues": [] }
}
```

---

## Error Responses

| Status | Description |
|---|---|
| 400 | Missing required fields or invalid request body |
| 401 | Not authenticated |
| 404 | Template not found |
| 500 | Internal server error |

## Rate Limits
None configured.
