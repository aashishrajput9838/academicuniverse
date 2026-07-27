# Certificate AI Extraction, Routing Null-Safety & Review Table Fix Report

**Sprint:** Fix Certificate AI Extraction, Routing Tab Crash & Review Tab Rendering  
**Status:** ✅ IMPLEMENTED, VERIFIED & SYNCHRONIZED  
**Date:** 2026-07-27

---

## Executive Summary

This sprint addressed three critical QA findings in the Growth Hub Document Intelligence pipeline:
1. **BUG 1 — Certificate AI Extraction Fails:** `candidateFields` was previously empty `{}` for classified `CERTIFICATE` uploads, causing AI Summary, Entities, Excel View, Raw Data, and Review Table to render blank.
2. **BUG 2 — Routing Tab Crashes:** Opening the Routing tab threw `TypeError: Cannot read properties of null (reading 'documentType')` when `routingInfo` or `routingDecision` was null.
3. **BUG 3 — Review Tab Empty:** Review tab displayed 0 rows when `candidateFields` had no formatted keys.

All three issues have been resolved without altering backend architecture or existing workflows.

---

## 1. Bug Fixes & Technical Implementations

### Bug 1: Complete Certificate AI Extraction Pipeline ([UaipDocumentAi.service.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/shared/application/UaipDocumentAi.service.ts))

- **Enhanced Prompt System Instruction:** Updated Gemini AI schema specification for `CERTIFICATE` documents to explicitly require:
  - `certificateTitle` / `title`
  - `candidateName` / `studentName`
  - `issuer` / `issuingOrganization`
  - `workshopName` / `courseName`
  - `issueDate` / `expiryDate`
  - `credentialId`
  - `instructor`
  - `signatories`
  - `description`
- **Validation & Field Normalization:** Implemented automatic normalization in `validateAiResponse` to harvest extracted values from `candidateFields` or `extractedEntities` and alias title/issuer fields.
- **MongoDB Persistence Guarantee:** Guarantees `KnowledgeRecord.candidateFields` and `extractedEntities` are populated so all UI tabs (Summary, Entities, Excel, Raw Data) display complete certificate details.

### Bug 2: Routing Tab Null-Safety & Guard ([GrowthUploadPanel.tsx](file:///c:/github/academicuniverse.com/academicuniverse/components/GrowthUploadPanel.tsx))

- **Defensive Guarding:** Replaced direct property access `routingInfo.routingDecision.documentType` with optional chaining:
  ```tsx
  {routingInfo && routingInfo.routingDecision ? (
    <span className="text-xs font-mono font-bold text-white">
      {routingInfo.routingDecision?.documentType ?? 'UNKNOWN'}
    </span>
  ) : (
    <div className="py-12 text-center text-slate-500">
      <p className="text-sm font-semibold text-slate-300">No routing information available.</p>
      <p className="text-xs mt-1 text-slate-500">The AI has not generated a routing recommendation yet.</p>
    </div>
  )}
  ```
- **Crash Prevention:** Prevents runtime crashes when backend returns `routingDecision: null`.

### Bug 3: Dynamic Review Tab Editable Spreadsheet ([GrowthUploadPanel.tsx](file:///c:/github/academicuniverse.com/academicuniverse/components/GrowthUploadPanel.tsx))

- **Expanded `getFieldSchema`:** Added all certificate fields (`certificateTitle`, `candidateName`, `issuer`, `issuingOrganization`, `workshopName`, `courseName`, `issueDate`, `expiryDate`, `credentialId`, `instructor`, `signatories`, `description`).
- **Dynamic Editable Grid Builder (`buildEditableGrid`):**
  ```typescript
  if (category === 'CERTIFICATE') {
    const headers = ['Field', 'Value'];
    const fieldsMap: Record<string, string> = {};
    Object.entries(candidateFields || {}).forEach(([k, v]) => {
      if (v !== null && v !== undefined) {
        fieldsMap[k] = Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v);
      }
    });
    const rows = Object.entries(fieldsMap).map(([k, val]) => [
      { path: `field-label-${k}`, header: 'Field', aiValue: k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim(), isReadOnly: true },
      { path: k, header: 'Value', aiValue: String(getNestedValue(originalFields, k) ?? val ?? '') },
    ]);
    return { sheets: [{ name: 'Certificate Details', headers, rows }] };
  }
  ```
- **Editable Table Guarantee:** Renders all extracted certificate fields in editable form.

---

## 2. QA Verification Results

- [x] **AI Summary:** Populated with Gemini AI summary & suggested target module.
- [x] **Metadata:** Populated with filename, MIME type, storage ID, confidence score.
- [x] **Entities:** Populated with extracted certificate title, candidate name, issuer, issue date, credential ID.
- [x] **Excel View:** Displays spreadsheet grid of candidate fields.
- [x] **Raw Data:** Displays formatted JSON of `KnowledgeRecord.candidateFields`.
- [x] **Routing Tab:** Renders safely without crashing when `routingDecision` is null.
- [x] **Review Tab:** Renders editable fields for all extracted certificate properties.
- [x] **Approve:** Writes to `CertificateRecord` & `SkillEvidence` MongoDB collections.
- [x] **Career Profile:** Certification count updates dynamically.
- [x] **AI Career Coach:** Recommendation auto-dismisses when `certifications.length > 0`.
- [x] **Resume Builder:** `filledData.certifications` synchronized in MongoDB.
- [x] **Generated Resume:** Resumes generated in DOCX/PDF include certificates automatically.
