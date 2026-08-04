# OFFICIAL FIELD-LEVEL ACCURACY & RANKING REPORT

**Target Suite**: `AU_DIC_Benchmark_v1.0`  
**Evaluated Fields**: `16 Unique Semantic Fields` across `360 Document Specimens`  
**Total Comparisons**: `5,760 Pairings`

---

## 1. Executive Summary

This report details the field-by-field performance of the extraction engine before and after semantic canonical normalization. Fields are ranked by their **Absolute F1 Improvement** to identify which document entities benefit most from canonical normalization.

---

## 2. Field-Wise Accuracy Improvement Ranking Table

| Rank | Field Name | Target Entity Domain | Samples ($N$) | Without Normalization | With Normalization | Absolute F1 Gain | Relative Gain (%) |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **1** | `student_name` | Personal Name | 360 | 0.00% | 100.00% | **+100.00%** | **+100.00%** |
| **2** | `roll_number` | Identifier / Roll No | 360 | 0.00% | 100.00% | **+100.00%** | **+100.00%** |
| **3** | `enrollment_number` | Identifier / Roll No | 360 | 0.00% | 100.00% | **+100.00%** | **+100.00%** |
| **4** | `degree_name` | Academic Degree | 360 | 0.00% | 100.00% | **+100.00%** | **+100.00%** |
| **5** | `date_of_birth` | Date / Temporal | 360 | 0.00% | 100.00% | **+100.00%** | **+100.00%** |
| **6** | `issue_date` | Date / Temporal | 360 | 0.00% | 100.00% | **+100.00%** | **+100.00%** |
| **7** | `cgpa` | Numeric / GPA | 360 | 0.00% | 100.00% | **+100.00%** | **+100.00%** |
| **8** | `university_name` | Institution Name | 360 | 0.00% | 27.78% | **+27.78%** | **+100.00%** |
| **9** | `branch_name` | Static Administrative | 360 | 100.00% | 100.00% | **+0.00%** | **+0.00%** |
| **10** | `batch_years` | Static Administrative | 360 | 100.00% | 100.00% | **+0.00%** | **+0.00%** |
| **11** | `father_name` | Static Administrative | 360 | 100.00% | 100.00% | **+0.00%** | **+0.00%** |
| **12** | `mother_name` | Static Administrative | 360 | 100.00% | 100.00% | **+0.00%** | **+0.00%** |
| **13** | `email` | Static Administrative | 360 | 100.00% | 100.00% | **+0.00%** | **+0.00%** |
| **14** | `phone` | Static Administrative | 360 | 100.00% | 100.00% | **+0.00%** | **+0.00%** |
| **15** | `address` | Static Administrative | 360 | 100.00% | 100.00% | **+0.00%** | **+0.00%** |
| **16** | `blood_group` | Static Administrative | 360 | 100.00% | 100.00% | **+0.00%** | **+0.00%** |

---

## 3. Key Scientific Findings

1. **Top Benefiting Entities**:
   - `cgpa`, `date_of_birth`, `degree_name`, `enrollment_number`, `issue_date`, `roll_number`, and `student_name` experienced a **+100.00% absolute F1 increase** (recovering from 0.00% raw match up to 100.00% canonical match).
2. **Institutional Alias Resolution**:
   - `university_name` improved by **+27.78%** (from 0.00% up to 27.78%), resolving acronym shorthand variations (`VTU` $\rightarrow$ `Vivekananda Technical University`).
3. **Static Metadata Baseline**:
   - Static administrative fields (`address`, `batch_years`, `blood_group`, `branch_name`, `email`, `father_name`, `mother_name`, `phone`) achieved **100.00% match rate in both passes**, as they contained no formatting or honorific syntax variations.
