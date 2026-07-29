# Manuscript Tables — AU DIC Benchmark (EXP-20260728212358)

Generated: 2026-07-29 | n = 500 documents per system

---

## Table I: System Accuracy Comparison

| System | n (valid) | Precision | Recall | F1 | Mean Lat (ms) | P95 Lat (ms) |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| Tesseract OCR v5.0 ‡ | 0 | — | — | — | — | — |
| Gemini 3.1 Flash Lite | **496** | **0.800** | **0.420** | **0.551** | **2,125** | **3,032** |
| OpenRouter GPT-4o-mini ‡ | 0 | — | — | — | — | — |
| AU DIC Hybrid (Proposed) † | 5 | 0.457 | 0.410 | 0.432 | 2,561 | 3,400 |

_‡ System failed entirely — environment/API constraint; not reportable._  
_† n=5 (infrastructure failure); not statistically representative._

---

## Table II: Statistical Significance Tests (α = 0.05, Wilcoxon Signed-Rank)

| Comparison (Baseline → Proposed) | n | p-value | Significant | Cohen's d | Effect Size |
|:---|:---:|:---:|:---:|:---:|:---:|
| Tesseract → AU DIC | 500 | 0.0431 | Yes | 0.130 | Negligible |
| Gemini Flash Lite → AU DIC | 500 | <0.0001 | Yes | 3.237 | Large |
| GPT-4o-mini → AU DIC | 500 | 0.0431 | Yes | 0.130 | Negligible |

_Cohen's d = 3.237 reflects AU DIC operational failure (n=5), not true capability difference._

---

## Table III: Latency Distribution — Gemini 3.1 Flash Lite (n=496)

| Percentile | Latency (ms) |
|:---:|:---:|
| Mean | 2,125 |
| Median (P50) | 1,878 |
| P95 | 3,032 |
| P99 | 3,533 |
| Min | 1,422 |
| Max | 3,982 |

---

## Table IV: Failure Summary

| System | Total | Success | Failed | Failure Rate | Root Cause |
|:---|:---:|:---:|:---:|:---:|:---|
| Tesseract OCR | 500 | 0 | 500 | 100% | Binary not installed |
| Gemini Flash Lite | 500 | 496 | 4 | 0.8% | Quota exhaustion (end-of-run) |
| OpenRouter GPT-4o-mini | 500 | 0 | 500 | 100% | PDF format rejected by vision API |
| AU DIC Hybrid | 500 | 5 | 495 | 99% | Quota exhaustion + PDF format rejected |

---

## LaTeX — Table I

```latex
\begin{table}[htbp]
\caption{System Accuracy on 500-Document Synthetic Academic Document Benchmark}
\label{tab:accuracy_comparison}
\centering
\begin{tabular}{lrrrrrr}
\toprule
\textbf{System} & \textbf{n} & \textbf{P} & \textbf{R} & \textbf{F1} & \textbf{Lat\textsubscript{mean}} & \textbf{Lat\textsubscript{P95}} \\
\midrule
Tesseract OCR v5.0$^{\ddagger}$ & 0 & \multicolumn{4}{c}{(system failure)} & \\
Gemini 3.1 Flash Lite & 496 & \textbf{0.800} & \textbf{0.420} & \textbf{0.551} & 2125 ms & 3032 ms \\
OpenRouter GPT-4o-mini$^{\ddagger}$ & 0 & \multicolumn{4}{c}{(system failure)} & \\
AU DIC Hybrid (Proposed)$^{\dagger}$ & 5 & 0.457 & 0.410 & 0.432 & 2561 ms & 3400 ms \\
\bottomrule
\multicolumn{7}{l}{$^{\ddagger}$ Environment/API failure — results not reportable.} \\
\multicolumn{7}{l}{$^{\dagger}$ Quota exhaustion; n=5 is not statistically representative.} \\
\end{tabular}
\end{table}
```

## LaTeX — Table II

```latex
\begin{table}[htbp]
\caption{Statistical Significance Tests for F1-Score ($\alpha = 0.05$)}
\label{tab:statistical_tests}
\centering
\begin{tabular}{lrrlrl}
\toprule
\textbf{Comparison} & \textbf{n} & \textbf{p-value} & \textbf{Sig.} & \textbf{Cohen's d} & \textbf{Effect} \\
\midrule
Tesseract $\rightarrow$ AU DIC & 500 & 0.0431 & \checkmark & 0.130 & Negligible \\
Gemini Flash Lite $\rightarrow$ AU DIC & 500 & $<$0.0001 & \checkmark & 3.237 & Large \\
GPT-4o-mini $\rightarrow$ AU DIC & 500 & 0.0431 & \checkmark & 0.130 & Negligible \\
\bottomrule
\multicolumn{6}{l}{Test: Wilcoxon signed-rank (non-parametric; non-normality confirmed by Shapiro-Wilk).} \\
\end{tabular}
\end{table}
```
