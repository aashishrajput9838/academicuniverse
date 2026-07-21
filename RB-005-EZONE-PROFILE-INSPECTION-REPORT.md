# RB-005 — EzoneAcademicProfile Inspection Report

**Date:** 2026-07-21  
**Status:** Inspection Complete — No Implementation  
**Scope:** Database inspection of EzoneAcademicProfile for specific user  
**Constraint:** No code changes. No business logic modifications.

---

## 1. Query Parameters

| Field | Value |
|-------|-------|
| userId | `6a58b65d816b680ebffb8b89` |
| organizationId | `6a58b59aa8c379340d290b31` |

---

## 2. Document Found

**YES — Document exists.**

```json
{
  "_id": "6a5f8dd80f790c8018371930",
  "organizationId": "6a58b59aa8c379340d290b31",
  "userId": "6a58b65d816b680ebffb8b89",
  "__v": 0,
  "absentClasses": 0,
  "attendancePercentage": 0,
  "caMarks": [
    {
      "courseCode": "Design Patterns & Microservices [CSCR3216]",
      "courseName": "4.0",
      "assignment1": "9.5",
      "assignment2": "5.0",
      "assessment1": "5.0",
      "assessment2": "23.5",
      "total": "N/A"
    },
    {
      "courseCode": "Social Media Analytics [CSCR4202]",
      "courseName": "4.75",
      "assignment1": "9.5",
      "assignment2": "5.0",
      "assessment1": "5.0",
      "assessment2": "24.25",
      "total": "N/A"
    },
    {
      "courseCode": "Compiler Design [CSE353]",
      "courseName": "4.50",
      "assignment1": "3.5",
      "assignment2": "4.5",
      "assessment1": "5.0",
      "assessment2": "17.5",
      "total": "N/A"
    },
    {
      "courseCode": "Artificial Intelligence [CSE472]",
      "courseName": "5.0",
      "assignment1": "9.0",
      "assignment2": "4.75",
      "assessment1": "5.0",
      "assessment2": "23.75",
      "total": "N/A"
    }
  ],
  "createdAt": "2026-07-21T15:18:48.209Z",
  "holidays": [
    {
      "name": "Design Patterns & Microservices [CSCR3216]",
      "date": "4.0"
    },
    {
      "name": "Social Media Analytics [CSCR4202]",
      "date": "4.75"
    },
    {
      "name": "Compiler Design [CSE353]",
      "date": "4.50"
    },
    {
      "name": "Artificial Intelligence [CSE472]",
      "date": "5.0"
    }
  ],
  "lastSyncedAt": "2026-07-21T15:18:48.208Z",
  "presentClasses": 0,
  "program": "N/A",
  "school": "N/A",
  "status": "N/A",
  "studentName": "",
  "subjects": [
    {
      "courseCode": "Design Patterns & Microservices [CSCR3216]",
      "courseName": "4.0",
      "faculty": "9.5",
      "courseType": "5.0",
      "credits": 5,
      "attendancePercentage": 23.5
    },
    {
      "courseCode": "Social Media Analytics [CSCR4202]",
      "courseName": "4.75",
      "faculty": "9.5",
      "courseType": "5.0",
      "credits": 5,
      "attendancePercentage": 24.25
    },
    {
      "courseCode": "Compiler Design [CSE353]",
      "courseName": "4.50",
      "faculty": "3.5",
      "courseType": "4.5",
      "credits": 5,
      "attendancePercentage": 17.5
    },
    {
      "courseCode": "Artificial Intelligence [CSE472]",
      "courseName": "5.0",
      "faculty": "9.0",
      "courseType": "4.75",
      "credits": 5,
      "attendancePercentage": 23.75
    }
  ],
  "systemId": "N/A",
  "timetable": [
    {
      "time": "5.0",
      "subject": "Design Patterns & Microservices [CSCR3216]",
      "faculty": "4.0",
      "room": "9.5"
    },
    {
      "time": "5.0",
      "subject": "Social Media Analytics [CSCR4202]",
      "faculty": "4.75",
      "room": "9.5"
    },
    {
      "time": "4.5",
      "subject": "Compiler Design [CSE353]",
      "faculty": "4.50",
      "room": "3.5"
    },
    {
      "time": "4.75",
      "subject": "Artificial Intelligence [CSE472]",
      "faculty": "5.0",
      "room": "9.0"
    }
  ],
  "totalClasses": 0,
  "updatedAt": "2026-07-21T15:18:48.209Z"
}
```

---

## 3. Field-by-Field Analysis

| Field | Expected | Actual | Status |
|-------|----------|--------|--------|
| `_id` | ObjectId | `6a5f8dd80f790c8018371930` | ✅ Present |
| `organizationId` | ObjectId | `6a58b59aa8c379340d290b31` | ✅ Present |
| `userId` | ObjectId | `6a58b65d816b680ebffb8b89` | ✅ Present |
| `studentName` | String | `""` (empty) | ❌ Missing |
| `systemId` | String | `"N/A"` | ❌ Placeholder |
| `department` | String | **NOT IN DOCUMENT** | ❌ MISSING |
| `program` | String | `"N/A"` | ❌ Placeholder |
| `school` | String | `"N/A"` | ❌ Placeholder |
| `semester` | String | **NOT IN DOCUMENT** | ❌ MISSING |
| `status` | String | `"N/A"` | ❌ Placeholder |
| `lastSyncedAt` | Date | `2026-07-21T15:18:48.208Z` | ✅ Present |

---

## 4. Answers to Investigation Questions

### 4.1 Is `department` actually present?

**NO.** The `department` field is completely absent from the document. It was never set during the sync.

### 4.2 Where in the sync pipeline should it have been populated?

The `department` field should have been populated during the **Ezone sync pipeline**, specifically in one of these stages:

1. **Scraping stage** (`ezone.scraper.ts`) — Should extract department from the Sharda University portal HTML
2. **Mapping stage** (`ezoneDataMapper.ts`) — Should map the scraped department value to the `department` field in the `EzoneAcademicProfile` schema
3. **Upsert stage** (`ezone.repository.ts:upsertProfile`) — Should persist the mapped department value to MongoDB

**Current state:** Either the scraper is not extracting department data, or the mapper is not mapping it to the correct field.

### 4.3 Was the document newly created or merely updated?

**NEWLY CREATED.** Evidence:
- `createdAt`: `2026-07-21T15:18:48.209Z`
- `lastSyncedAt`: `2026-07-21T15:18:48.208Z`
- `__v`: `0` (Mongoose version key, starts at 0 for new documents)
- The timestamps are identical, indicating a single upsert operation

The document did not exist before the sync completed at `2026-07-21T15:18:48`.

---

## 5. Critical Findings

### 5.1 Data is Garbled/Misaligned

The document contains **data mapping errors**. The arrays contain values that appear to be shifted into wrong fields:

| Array | Course Code Field | Other Fields | Problem |
|-------|------------------|--------------|---------|
| `caMarks` | `courseCode` | `courseName: "4.0"`, `faculty: "9.5"`, etc. | Numeric values in string fields |
| `subjects` | `courseCode` | `courseName: "4.0"`, `faculty: "9.5"` | Values look like grades/credits, not names |
| `timetable` | `subject` | `time: "5.0"`, `faculty: "4.0"`, `room: "9.5"` | Time/faculty/room contain numeric grades |
| `holidays` | `name` | `date: "4.0"` | Course names in holiday names, grades in dates |

**Conclusion:** The EzoneDataMapper is incorrectly mapping scraped data to schema fields. The mapper appears to be rotating/shifting values across fields.

### 5.2 Key Scalar Fields are Placeholders or Empty

| Field | Value | Issue |
|-------|-------|-------|
| `studentName` | `""` | Empty string |
| `systemId` | `"N/A"` | Placeholder string |
| `program` | `"N/A"` | Placeholder string |
| `school` | `"N/A"` | Placeholder string |
| `status` | `"N/A"` | Placeholder string |

These fields should contain actual student data from the Ezone portal.

### 5.3 No Resume Templates for This Organization

```
Resume Templates for Org: Count: 0
```

No templates have been uploaded for organization `6a58b59aa8c379340d290b31`. This explains why the student sees no templates at all (not even global ones from this org).

---

## 6. Root Cause Summary

| Issue | Root Cause | Location |
|-------|------------|----------|
| `department` missing | Scraper or mapper does not extract/populate department | `ezone.scraper.ts` or `ezoneDataMapper.ts` |
| Garbled array data | Data mapper incorrectly assigns values to wrong fields | `ezoneDataMapper.ts` |
| Placeholder scalar fields | Scraper returns "N/A" or mapper doesn't override defaults | `ezone.scraper.ts` or `ezoneDataMapper.ts` |
| No resume templates | No faculty upload for this org | Faculty action required |

---

## 7. Impact on Features

| Feature | Impact |
|---------|--------|
| Resume Builder (student) | **BLOCKED** — No templates exist for this org |
| Academic Profile UI | **BROKEN** — Shows N/A values due to bad data mapping |
| Template visibility by department | **BLOCKED** — `department` field is missing from profile |
| Ezone sync pipeline | **PARTIALLY BROKEN** — Sync completes but data is corrupted |

---

## 8. Recommendations (For Approval)

These are investigation findings only. No implementation has been performed.

1. **Fix EzoneDataMapper** — Correct the field mapping so scraped data goes into the correct schema fields
2. **Verify scraper output** — Inspect raw scraped HTML to confirm department and other fields are actually present in the portal
3. **Add data validation** — Reject or warn when mapped values contain "N/A" or are empty
4. **Upload a test template** — Faculty needs to upload a DOCX template for the student to see it in Resume Builder

---

*Inspection complete. No implementation performed.*
