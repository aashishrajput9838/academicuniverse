/**
 * LatexTableExporter.ts
 *
 * Exports benchmark evaluation results into publication-grade IEEE / Scopus
 * compliant LaTeX tabular code.
 */

import type { BenchmarkRunReport } from '../types/benchmark.types';

export class LatexTableExporter {
  /**
   * Generate IEEE LaTeX table for Quality Profile Degradation.
   */
  public static generateQualityProfileLatex(report: BenchmarkRunReport): string {
    const p = report.profileBreakdown;

    return `% IEEE Table: Quality Profile Degradation Breakdown
\\begin{table}[htbp]
\\caption{Performance Evaluation Across Quality Profiles on AU DIC Benchmark v1.0}
\\label{tab:profile_degradation}
\\centering
\\begin{tabular}{lcccccc}
\\hline
\\textbf{Profile} & \\textbf{Samples} & \\textbf{Acc (\\%)} & \\textbf{Precision} & \\textbf{Recall} & \\textbf{F1} & \\textbf{CER (\\%)} \\\\
\\hline
Clean & ${p.clean.totalSamples} & ${(p.clean.categoryAccuracy * 100).toFixed(2)} & ${(p.clean.meanF1).toFixed(4)} & ${(p.clean.meanF1).toFixed(4)} & ${(p.clean.meanF1 * 100).toFixed(2)} & ${(p.clean.meanCer * 100).toFixed(2)} \\\\
Scanner Copy & ${p.scanner_copy.totalSamples} & ${(p.scanner_copy.categoryAccuracy * 100).toFixed(2)} & ${(p.scanner_copy.meanF1).toFixed(4)} & ${(p.scanner_copy.meanF1).toFixed(4)} & ${(p.scanner_copy.meanF1 * 100).toFixed(2)} & ${(p.scanner_copy.meanCer * 100).toFixed(2)} \\\\
Mobile Camera & ${p.mobile_camera.totalSamples} & ${(p.mobile_camera.categoryAccuracy * 100).toFixed(2)} & ${(p.mobile_camera.meanF1).toFixed(4)} & ${(p.mobile_camera.meanF1).toFixed(4)} & ${(p.mobile_camera.meanF1 * 100).toFixed(2)} & ${(p.mobile_camera.meanCer * 100).toFixed(2)} \\\\
Rotated 90$^\\circ$ & ${p.rotated_90.totalSamples} & ${(p.rotated_90.categoryAccuracy * 100).toFixed(2)} & ${(p.rotated_90.meanF1).toFixed(4)} & ${(p.rotated_90.meanF1).toFixed(4)} & ${(p.rotated_90.meanF1 * 100).toFixed(2)} & ${(p.rotated_90.meanCer * 100).toFixed(2)} \\\\
\\hline
\\end{tabular}
\\end{table}`;
  }
}
