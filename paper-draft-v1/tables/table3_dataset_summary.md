# Table 3. Dataset Summary

**Synthetic Academic Document Benchmark (Version 1.0.0)**

| Attribute | Value |
|---|---|
| **Dataset Name** | Academic Universe Synthetic Benchmark Dataset |
| **Version** | 1.0.0 |
| **Total Documents** | 5 |
| **Generator Version** | 1.1.0 |
| **Seed** | 12345 |
| **Manifest Hash** | SHA256_aee13265b3e18437 |
| **Created** | 2026-07-29T08:42:44.155Z |
| **Disclaimer** | FOR RESEARCH BENCHMARKING ONLY. CONTAINS FICTIONAL INSTITUTIONS AND CONTENT. |

## Document Inventory

| Document ID | Category | Quality Profile | Template | Student Name | Roll Number | SGPA | CGPA | Issue Date | Courses |
|---|---|---|---|---|---|---|---|---|---|
| SYNTH_CERT_001 | CERTIFICATE | CLEAN_PDF | TEMPLATE_D | Tanya Verma | 2021329554 | 8.00 | 7.97 | 2023-04-20 | 5 |
| SYNTH_TT_002 | TIMETABLE | SCANNER_COPY | TEMPLATE_C | Isha Sinha | 2023568771 | 8.78 | 8.33 | 2026-01-10 | 5 |
| SYNTH_ID_003 | STUDENT_ID | MOBILE_CAMERA | TEMPLATE_B | Neha Mehta | 2022451611 | 7.33 | 7.84 | 2025-05-19 | 5 |
| SYNTH_MS_004 | MARKSHEET | MOBILE_CAMERA | TEMPLATE_C | Komal Tripathi | 2023733459 | 7.63 | 8.20 | 2025-03-19 | 5 |
| SYNTH_MS_005 | MARKSHEET | ROTATED | TEMPLATE_A | Utkarsh Saxena | 2022995286 | 7.53 | 8.10 | 2024-06-10 | 5 |

## Quality Profile Definitions

| Profile | Description | Simulated Degradation |
|---|---|---|
| CLEAN_PDF | Digital-born PDF with selectable text | None |
| SCANNER_COPY | Flatbed scanner output | Minor noise, slight skew |
| MOBILE_CAMERA | Smartphone photograph | Blur, perspective distortion, lighting variation |
| ROTATED | Document scanned/page rotated 90 degrees | Requires deskewing before OCR |

## Category Distribution

| Category | Count | Percentage |
|---|---|---|
| CERTIFICATE | 1 | 20% |
| TIMETABLE | 1 | 20% |
| STUDENT_ID | 1 | 20% |
| MARKSHEET | 2 | 40% |

## Ground Truth Structure

Each ground truth JSON file contains:
- 7 core fields: `studentName`, `rollNumber`, `semester`, `sgpa`, `cgpa`, `issueDate`, `courseMarks`
- `courseMarks` array with 5 entries, each containing `courseCode`, `courseName`, `marksObtained`, `maxMarks`
- `customFields` metadata including generation seed, template ID, quality profile, enrollment number, degree name, branch name

> **Note**: This experiment represents a workflow validation using a minimal validation dataset of five synthetic academic documents. Large-scale evaluation will be conducted in the next research iteration.
