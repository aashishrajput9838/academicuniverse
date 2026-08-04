# OFFICIAL NORMALIZATION RULE CONTRIBUTION REPORT

**Run ID**: `run_1785796639905`  
**Dataset**: `AU_DIC_Benchmark_v1.0`  
**Evaluated Items**: `360 Document Specimens (5,760 Total Fields)`

---

## 1. Rule Contribution Breakdown

This report quantifies the number of false-negative string mismatches resolved by each individual domain normalizer rule across the benchmark suite:

| Normalizer Rule | Target Domain | Corrected Mismatches (Count) | Percentage of Total Corrections |
| :--- | :--- | :---: | :---: |
| **Date Normalizer** | Domain-Specific Syntax | **720** | **27.48%** |
| **Roll Number Normalizer** | Domain-Specific Syntax | **720** | **27.48%** |
| **University Alias Normalizer** | Domain-Specific Syntax | **100** | **3.82%** |
| **Degree Alias Normalizer** | Domain-Specific Syntax | **360** | **13.74%** |
| **Numeric Normalizer** | Domain-Specific Syntax | **360** | **13.74%** |
| **Honorific / Whitespace Normalizer** | Domain-Specific Syntax | **360** | **13.74%** |
| **Total Mismatches Corrected** | All Rules Combined | **2,620** | **100.00%** |

---

## 2. Qualitative Analysis of Corrected Formatting Discrepancies

1. **Date Normalizer**: Converts text variations (`04/08/2026`, `August 4, 2026`, `14 Jul 2025`) into canonical ISO 8601 strings (`2025-07-14`).
2. **Roll Number Normalizer**: Removes separators (hyphens, slashes) and standardizes uppercase characters (`2021-IT-000150` $\rightarrow$ `2021IT000150`).
3. **University Alias Normalizer**: Expands short codes (`VTU` $\rightarrow$ `Vivekananda Technical University`).
4. **Degree Alias Normalizer**: Expands degree shorthands (`B.Tech` $\rightarrow$ `Bachelor of Technology`).
5. **Numeric Normalizer**: Standardizes floating-point CGPA and mark values (`4.93 / 10` $\rightarrow$ `4.93`).
6. **Honorific / Whitespace Normalizer**: Trims leading/trailing whitespace, collapses internal spaces, and strips honorific prefixes (`Mr. Trisha Das` $\rightarrow$ `trisha das`).
