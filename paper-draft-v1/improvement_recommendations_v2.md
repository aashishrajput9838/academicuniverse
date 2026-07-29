# Improvement Recommendations V2

**Academic Universe Document Intelligence Core — Research Paper Version 2 Roadmap**

**Current Status**: Draft V1 completed with 5-document validation dataset (EXP-VAL-20260729)  
**Target**: Scalable, statistically robust research paper ready for IEEE Access submission

---

## 1. Scaling to 500-10,000+ Documents

### 1.1 Dataset Expansion

| Phase | Documents | Description | Timeline |
|---|---|---|---|
| Phase 1 | 50 | Expand synthetic generation to 50 documents with varied templates, institutions, and quality profiles | 2 weeks |
| Phase 2 | 500 | Include 500 documents with 10+ categories, 8+ quality profiles, and 3+ language variants | 4 weeks |
| Phase 3 | 5,000 | Partner with 5+ institutions for real-world document collection and human annotation | 8 weeks |
| Phase 4 | 10,000+ | Full-scale benchmark with continuous data pipeline and automated annotation | 12 weeks |

### 1.2 Synthetic Generation Improvements

- Implement template variation engine that introduces random formatting variations (fonts, spacing, colors)
- Add degradation simulation for: watermarks, coffee stains, creases, low-contrast scans
- Generate documents with deliberate errors (missing fields, incorrect values) to test error handling
- Include adversarial examples (documents designed to fool specific extraction patterns)

### 1.3 Real-World Data Collection

- Partner with 3-5 educational institutions for anonymized document donation
- Implement IRB-approved human annotation protocol with 3 annotators per document
- Measure inter-annotator agreement (Cohen's kappa) as a quality metric
- Create public benchmark release with ground truth and evaluation scripts

---

## 2. Improving Statistical Analysis

### 2.1 Power Analysis

Conduct a priori power analysis to determine minimum sample size for detecting effect sizes of interest:

$$n = \frac{2(z_{1-\alpha/2} + z_{1-\beta})^2 \sigma^2}{\delta^2}$$

where $\alpha = 0.05$, $\beta = 0.20$, $\sigma$ is estimated from pilot data, and $\delta$ is the minimum detectable effect size (Cohen's d = 0.5).

### 2.2 Hypothesis Testing

For N >= 500, apply the following statistical tests:

| Comparison | Test | Null Hypothesis |
|---|---|---|
| SYS-PROP vs. SYS-BASE-1 | Paired t-test or Wilcoxon signed-rank | $\mu_{PROP} = \mu_{BASE1}$ |
| SYS-PROP vs. SYS-BASE-2 | Paired t-test or Wilcoxon signed-rank | $\mu_{PROP} = \mu_{BASE2}$ |
| SYS-PROP vs. SYS-BASE-3 | Paired t-test or Wilcoxon signed-rank | $\mu_{PROP} = \mu_{BASE3}$ |
| Fallback vs. non-fallback documents | Mann-Whitney U | $\mu_{fallback} = \mu_{no\_fallback}$ |
| HITL-corrected vs. raw AI | Paired t-test | $\mu_{corrected} = \mu_{raw}$ |

Report effect sizes using Cohen's d:

$$d = \frac{\bar{x}_1 - \bar{x}_2}{s_{pooled}}$$

with interpretation: small (0.2), medium (0.5), large (0.8).

### 2.3 Confidence Intervals

Report 95% confidence intervals for all aggregate metrics:

$$CI = \bar{x} \pm t_{(1-\alpha/2, n-1)} \cdot \frac{s}{\sqrt{n}}$$

### 2.4 Distribution Analysis

- Test normality of latency and F1-score distributions using Shapiro-Wilk test
- Report skewness and kurtosis
- Use non-parametric tests if normality assumption is violated

---

## 3. Addressing Threats to Validity

### 3.1 Internal Validity

| Threat | V2 Resolution |
|---|---|
| Small sample size | Scale to N >= 500; conduct power analysis |
| Simulated data | Collect 500+ real documents with human annotation |
| Single baseline per category | Add 2-3 baselines per category (EasyOCR, PaddleOCR, LayoutLMv3) |
| Single reviewer | Recruit 3-5 reviewers; compute inter-rater reliability |

### 3.2 External Validity

| Threat | V2 Resolution |
|---|---|
| Limited to academic documents | Add invoice, receipt, and legal contract categories |
| Synthetic degradation patterns | Use real mobile captures from field study |
| Tenant format diversity | Include documents from 10+ institutions with varied formats |
| AI provider version drift | Lock versions and report exact model identifiers |

### 3.3 Construct Validity

| Threat | V2 Resolution |
|---|---|
| F1-score limitations | Add BLEU, edit distance, and semantic similarity metrics |
| Latency measurement | Separate client-side, network, and server-side latencies |
| Binary success metric | Report partial credit metrics (weighted F1) |

### 3.4 Conclusion Validity

| Threat | V2 Resolution |
|---|---|
| No statistical testing | Implement full hypothesis testing with p-values and effect sizes |
| Chance differences | Increase N and conduct repeated trials |
| HITL confounding | Compare raw vs. HITL-corrected results with statistical testing |

---

## 4. Enhancing Figures and Tables

### 4.1 New Figures to Add

| Fig | Description | Type |
|---|---|---|
| Fig. 9 | Per-field F1 heatmap (documents x fields) | Heatmap |
| Fig. 10 | Latency CDF comparison across systems | CDF plot |
| Fig. 11 | HITL review time distribution | Box plot |
| Fig. 12 | Fallback trigger rate by quality profile | Bar chart |
| Fig. 13 | Provider agreement analysis (Gemini vs. OpenRouter) | Scatter plot |
| Fig. 14 | Confusion matrix for field-level errors | Heatmap |
| Fig. 15 | Cost-per-document analysis | Stacked bar chart |

### 4.2 Enhanced Existing Figures

| Fig | Enhancement |
|---|---|
| Fig. 1 | Add provider health indicators and tenant count badges |
| Fig. 5 | Add error bars showing standard deviation |
| Fig. 6 | Add individual data points as jittered scatter overlay |
| Fig. 8 | Add statistical significance annotations (* p < 0.05, ** p < 0.01) |

### 4.3 New Tables to Add

| Table | Description |
|---|---|
| Table 11 | Per-field precision/recall/F1 for SYS-PROP (all 35 field evaluations) |
| Table 12 | Statistical test results (t-test, Wilcoxon, Cohen's d) |
| Table 13 | Inter-rater reliability (Cohen's kappa) for HITL reviews |
| Table 14 | Cost analysis (API calls, tokens, USD per document) |
| Table 15 | Error analysis (most common extraction failures by field) |
| Table 16 | Ablation study (impact of individual system components) |

---

## 5. Additional Experiments to Conduct

### 5.1 Ablation Studies

| Experiment | Components Removed | Expected Impact |
|---|---|---|
| Ablation 1 | Remove HITL staging | Decrease F1, increase throughput |
| Ablation 2 | Remove fallback provider | Decrease resilience, no F1 change on clean docs |
| Ablation 3 | Remove dual-provider, use single best | Decrease F1, decrease latency |
| Ablation 4 | Remove OCR fallback (PaddleOCR) | Decrease F1 on SCANNER_COPY docs |

### 5.2 Sensitivity Analysis

- Vary AI temperature (0.0 to 1.0) and measure F1 impact
- Vary confidence threshold for HITL routing (0.5, 0.7, 0.9) and measure review burden vs. accuracy
- Vary prompt templates and measure extraction consistency

### 5.3 Comparative Baselines

Add the following systems to the benchmark:

| System | Description |
|---|---|
| SYS-BASE-4 | PaddleOCR + rule-based extraction |
| SYS-BASE-5 | Tesseract + regex patterns |
| SYS-BASE-6 | LayoutLMv3 fine-tuned on 100 academic documents |
| SYS-BASE-7 | GPT-4o with structured output prompt (no fallback) |
| SYS-BASE-8 | Donut (OCR-free transformer) |

### 5.4 Real-World Deployment Study

- Deploy AU DIC to production with 3 pilot institutions
- Collect 30-day operational metrics (throughput, error rates, reviewer time)
- Compare benchmark predictions with real-world performance
- Measure user satisfaction (SUS questionnaire for reviewers)

---

## 6. Target Journal-Specific Formatting Requirements

### 6.1 IEEE Access

| Requirement | V1 Status | V2 Action |
|---|---|---|
| Maximum length: No formal limit (typically 15-20 pages) | N/A | Target 18 pages including figures and tables |
| Double-column format | Markdown (single-column) | Convert to LaTeX or Word with IEEE Access template |
| Abstract: < 250 words | ~250 words | Trim to 240 words |
| Keywords: 5-8 keywords | 9 keywords | Reduce to 8 |
| Figures: Vector format preferred | SVG (vector) | Convert SVG to PDF/EPS for LaTeX |
| Tables: Three-line table format | Markdown | Convert to IEEE three-line format |
| References: IEEE style | IEEE style in BibTeX | Ensure all entries have required fields |
| Equation numbering | Inline and display | Number all display equations |
| Section numbering | Not numbered | Add IEEE-style section numbering (I, II, III...) |

### 6.2 Required V2 Formatting Changes

1. Convert `research_paper.md` to IEEE Access LaTeX template
2. Number all sections with Roman numerals
3. Number all figures and tables with Arabic numerals
4. Number all display equations
5. Ensure abstract is 240 words or fewer
6. Reduce keywords to 5-8
7. Convert SVG figures to PDF or EPS for LaTeX inclusion
8. Format tables in IEEE three-line style
9. Add author bios and photos (if required)
10. Ensure all citations use IEEE numeric style [N]

---

## 7. Code Quality and Reproducibility

### 7.1 Benchmark Automation

- Develop automated benchmark harness that:
  - Reads ground truth JSON files
  - Invokes each system via API or CLI
  - Collects and validates results
  - Generates metrics JSON and markdown tables
  - Produces figures via Python/Matplotlib or D3.js
- Integrate benchmark into CI/CD pipeline
- Add reproducibility badge to paper

### 7.2 Open-Source Release

- Prepare benchmark dataset for public release (if permissible)
- Document all system parameters (model versions, prompts, thresholds)
- Provide Docker containers for reproducible execution
- Include evaluation scripts in GitHub repository

---

## 8. Ethical and Regulatory Compliance

### 8.1 Data Privacy

- Conduct GDPR/DPDP compliance review
- Implement data anonymization for real-world documents
- Add consent management for document donors
- Document data retention and deletion policies

### 8.2 Bias Assessment

- Measure extraction accuracy across demographic groups (if names are included)
- Evaluate provider bias (Gemini vs. OpenRouter performance on different document types)
- Implement fairness metrics (equalized odds, demographic parity)

### 8.3 Explainability

- Log AI reasoning for each extracted field
- Implement SHAP or LIME explanations for reviewer trust
- Document confidence calibration across providers

---

## 9. Timeline Summary

| Phase | Duration | Key Deliverables |
|---|---|---|
| V2 Planning | 1 week | Updated methodology, expanded dataset plan |
| Dataset Expansion | 4 weeks | 500 synthetic + 100 real documents |
| Experimentation | 4 weeks | Statistical analysis, ablation studies, new baselines |
| Writing | 3 weeks | LaTeX conversion, new sections, enhanced figures/tables |
| Review & Revision | 2 weeks | Internal review, peer review, journal submission |

**Total V2 Timeline**: 14 weeks

---

## 10. Success Criteria for V2

| Criterion | Target |
|---|---|
| Dataset size | >= 500 documents |
| Statistical significance | p < 0.05 for at least 2 system comparisons |
| Effect size | Cohen's d >= 0.5 for at least 2 system comparisons |
| Inter-rater reliability | Cohen's kappa >= 0.80 for HITL reviews |
| Figures | >= 15 high-quality vector figures |
| Tables | >= 20 three-line tables |
| References | >= 50 verified IEEE-style references |
| Reproducibility | Automated benchmark harness with CI/CD integration |
| Journal readiness | IEEE Access LaTeX format with all requirements met |
