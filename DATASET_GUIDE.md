# OFFICIAL DATASET GUIDE: ADBG v1.0

**Dataset Name**: Academic Document Benchmark Generator Suite v1.0 (`AU_DIC_Benchmark_v1.0`)  
**License**: MIT License  
**Specimens**: 360 Document Images/PDFs + 360 Ground-Truth JSON Annotations

---

## 1. Directory Structure

```text
ADBG/AU_DIC_Benchmark_v1.0/
├── groundtruth/
│   ├── clean/
│   │   ├── DEGREE_CERTIFICATE/
│   │   ├── MARKSHEET/
│   │   └── STUDENT_ID/
│   ├── scanner_copy/
│   ├── mobile_camera/
│   └── rotated_90/
├── metadata/
└── manifest.json
```

---

## 2. Ground-Truth JSON Schema

Each specimen is paired with a pixel-exact ground-truth JSON file containing:

```json
{
  "sampleId": "DOC-19B41F7C_clean",
  "category": "MARKSHEET",
  "qualityProfile": "clean",
  "student": {
    "student_name": "Trisha Das",
    "roll_number": "2021IT000150",
    "enrollment_number": "EN2021000150",
    "father_name": "Suresh Das",
    "mother_name": "Anita Das",
    "degree_name": "Bachelor of Technology",
    "branch_name": "Information Technology"
  },
  "university": {
    "name": "Vivekananda Technical University",
    "short_code": "VTU"
  },
  "cgpa": 6.84,
  "issue_date": "2024-02-05",
  "semesters": [...]
}
```
