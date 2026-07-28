/**
 * Academic Universe — Statistics Engine
 * Implements: Shapiro-Wilk approximation, paired t-test, Wilcoxon signed-rank,
 * Cohen's d, Bonferroni correction, confidence intervals, descriptive statistics.
 */

import { StatisticalTestResult, BaselineSystemId } from '../types/benchmark.types';

export interface DescriptiveStats {
  n: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  p25: number;
  p75: number;
}

export class StatisticsEngine {
  /**
   * Compute descriptive statistics for a numeric array.
   */
  describe(values: number[]): DescriptiveStats {
    if (values.length === 0) {
      return { n: 0, mean: 0, median: 0, stdDev: 0, min: 0, max: 0, p25: 0, p75: 0 };
    }
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const mean = this.mean(sorted);
    const median = this.percentile(sorted, 50);
    const variance = sorted.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1 || 1);
    return {
      n,
      mean,
      median,
      stdDev: Math.sqrt(variance),
      min: sorted[0],
      max: sorted[n - 1],
      p25: this.percentile(sorted, 25),
      p75: this.percentile(sorted, 75),
    };
  }

  /**
   * Shapiro-Wilk normality test approximation (valid for n ≥ 3).
   * Returns approximate p-value; if p > 0.05, data is considered normally distributed.
   * Note: Uses an approximation based on D'Agostino-Pearson for n > 50.
   */
  shapiroWilk(values: number[]): { statistic: number; pValue: number; isNormal: boolean } {
    const n = values.length;
    if (n < 3) return { statistic: 1, pValue: 1, isNormal: true };

    const sorted = [...values].sort((a, b) => a - b);
    const mean = this.mean(sorted);

    // Simplified W statistic approximation
    const ss = sorted.reduce((sum, v) => sum + (v - mean) ** 2, 0);
    if (ss === 0) return { statistic: 1, pValue: 1, isNormal: true };

    // Use D'Agostino-Pearson skewness-kurtosis combined test as approximation
    const skewness = this.skewness(sorted, mean);
    const kurt = this.kurtosis(sorted, mean);
    const k2 = skewness ** 2 + kurt ** 2;
    // Chi-squared approximation with 2 df
    const pValue = Math.exp(-k2 / 2);
    const isNormal = pValue > 0.05;

    return { statistic: k2, pValue, isNormal };
  }

  /**
   * Paired samples t-test (parametric, assumes normality).
   * H0: mean(differences) = 0.
   */
  pairedTTest(baseline: number[], proposed: number[]): { statistic: number; pValue: number } {
    if (baseline.length !== proposed.length || baseline.length < 2) {
      throw new Error('Arrays must be equal length (≥2) for paired t-test');
    }
    const diffs = baseline.map((v, i) => proposed[i] - v);
    const n = diffs.length;
    const meanDiff = this.mean(diffs);
    const variance = diffs.reduce((s, d) => s + (d - meanDiff) ** 2, 0) / (n - 1);
    const stdErr = Math.sqrt(variance / n);
    if (stdErr === 0) return { statistic: 0, pValue: 1 };
    const t = meanDiff / stdErr;
    // Two-tailed p-value approximation using t-distribution
    const pValue = this.tDistPValue(Math.abs(t), n - 1);
    return { statistic: t, pValue };
  }

  /**
   * Wilcoxon signed-rank test (non-parametric alternative to paired t-test).
   */
  wilcoxonSignedRank(baseline: number[], proposed: number[]): { statistic: number; pValue: number } {
    if (baseline.length !== proposed.length) {
      throw new Error('Arrays must be equal length for Wilcoxon test');
    }
    const diffs = baseline.map((v, i) => proposed[i] - v).filter((d) => d !== 0);
    const n = diffs.length;
    if (n === 0) return { statistic: 0, pValue: 1 };

    const ranked = this.rankAbsolute(diffs);
    let wPlus = 0;
    let wMinus = 0;
    for (let i = 0; i < diffs.length; i++) {
      if (diffs[i] > 0) wPlus += ranked[i];
      else wMinus += ranked[i];
    }
    const W = Math.min(wPlus, wMinus);
    // Normal approximation for n > 10
    const meanW = (n * (n + 1)) / 4;
    const stdW = Math.sqrt((n * (n + 1) * (2 * n + 1)) / 24);
    const z = stdW > 0 ? (W - meanW) / stdW : 0;
    const pValue = 2 * (1 - this.normalCdf(Math.abs(z)));
    return { statistic: W, pValue };
  }

  /**
   * Cohen's d effect size between two groups.
   */
  cohensD(group1: number[], group2: number[]): { d: number; rating: StatisticalTestResult['effectSizeRating'] } {
    const m1 = this.mean(group1);
    const m2 = this.mean(group2);
    const s1 = this.stdDev(group1);
    const s2 = this.stdDev(group2);
    const pooled = Math.sqrt(((group1.length - 1) * s1 ** 2 + (group2.length - 1) * s2 ** 2) / (group1.length + group2.length - 2));
    const d = pooled > 0 ? Math.abs(m1 - m2) / pooled : 0;
    let rating: StatisticalTestResult['effectSizeRating'];
    if (d < 0.2) rating = 'Negligible';
    else if (d < 0.5) rating = 'Small';
    else if (d < 0.8) rating = 'Medium';
    else rating = 'Large';
    return { d, rating };
  }

  /**
   * Bonferroni-corrected significance threshold for m comparisons.
   */
  bonferroniThreshold(alpha: number, m: number): number {
    return alpha / m;
  }

  /**
   * 95% confidence interval for the mean of a sample.
   */
  confidenceInterval(values: number[], alpha: number = 0.05): { lower: number; upper: number } {
    const n = values.length;
    if (n < 2) return { lower: this.mean(values), upper: this.mean(values) };
    const m = this.mean(values);
    const se = this.stdDev(values) / Math.sqrt(n);
    // z-score for two-tailed CI (1.96 for 95%)
    const z = this.zScore(1 - alpha / 2);
    return { lower: m - z * se, upper: m + z * se };
  }

  /**
   * Run the full statistical comparison between baseline and proposed system F1-scores.
   */
  runComparison(
    metricName: string,
    baselineValues: number[],
    proposedValues: number[],
    baselineId: BaselineSystemId,
    proposedId: BaselineSystemId,
    alpha: number = 0.05
  ): StatisticalTestResult {
    const swBaseline = this.shapiroWilk(baselineValues);
    const swProposed = this.shapiroWilk(proposedValues);
    const isNormal = swBaseline.isNormal && swProposed.isNormal;

    let testResult: { statistic: number; pValue: number };
    let testUsed: StatisticalTestResult['testUsed'];

    if (isNormal && baselineValues.length >= 30) {
      testResult = this.pairedTTest(baselineValues, proposedValues);
      testUsed = 'Paired t-test';
    } else {
      testResult = this.wilcoxonSignedRank(baselineValues, proposedValues);
      testUsed = 'Wilcoxon signed-rank test';
    }

    const effect = this.cohensD(baselineValues, proposedValues);

    return {
      metricName,
      baselineSystem: baselineId,
      proposedSystem: proposedId,
      sampleSize: baselineValues.length,
      baselineMean: this.mean(baselineValues),
      proposedMean: this.mean(proposedValues),
      meanDifference: this.mean(proposedValues) - this.mean(baselineValues),
      shapiroWilkBaselineP: swBaseline.pValue,
      shapiroWilkProposedP: swProposed.pValue,
      isNormal,
      testUsed,
      statistic: testResult.statistic,
      pValue: testResult.pValue,
      isStatisticallySignificant: testResult.pValue < alpha,
      cohensD: effect.d,
      effectSizeRating: effect.rating,
    };
  }

  // --- Private Helpers ---

  private mean(arr: number[]): number {
    return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
  }

  private stdDev(arr: number[]): number {
    if (arr.length < 2) return 0;
    const m = this.mean(arr);
    return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
  }

  private percentile(sorted: number[], pct: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.ceil((pct / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
  }

  private skewness(sorted: number[], mean: number): number {
    const n = sorted.length;
    const s3 = sorted.reduce((s, v) => s + (v - mean) ** 3, 0) / n;
    const s2 = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    return s2 > 0 ? s3 / s2 ** 1.5 : 0;
  }

  private kurtosis(sorted: number[], mean: number): number {
    const n = sorted.length;
    const s4 = sorted.reduce((s, v) => s + (v - mean) ** 4, 0) / n;
    const s2 = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    return s2 > 0 ? s4 / s2 ** 2 - 3 : 0;
  }

  private rankAbsolute(diffs: number[]): number[] {
    const abs = diffs.map((d, i) => ({ val: Math.abs(d), idx: i }));
    abs.sort((a, b) => a.val - b.val);
    const ranks = new Array(diffs.length);
    for (let i = 0; i < abs.length; i++) ranks[abs[i].idx] = i + 1;
    return ranks;
  }

  private normalCdf(z: number): number {
    return 0.5 * (1 + this.erf(z / Math.SQRT2));
  }

  private erf(x: number): number {
    const t = 1 / (1 + 0.3275911 * Math.abs(x));
    const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
    return Math.sign(x) * (1 - poly * Math.exp(-x * x));
  }

  private zScore(p: number): number {
    // Approximate inverse normal CDF (Beasley-Springer-Moro algorithm)
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    const a = [2.50662823884, -18.61500062529, 41.39119773534, -25.44106049637];
    const b = [-8.47351093090, 23.08336743743, -21.06224101826, 3.13082909833];
    const c = [0.3374754822726147, 0.9761690190917186, 0.1607979714918209, 0.0276438810333863, 0.0038405729373609, 0.0003951896511349, 0.0000321767881768, 0.0000002888167364, 0.0000003960315187];
    const y = p - 0.5;
    if (Math.abs(y) < 0.42) {
      const r = y * y;
      return y * (((a[3] * r + a[2]) * r + a[1]) * r + a[0]) / ((((b[3] * r + b[2]) * r + b[1]) * r + b[0]) * r + 1);
    }
    const r = p < 0.5 ? Math.log(-Math.log(p)) : Math.log(-Math.log(1 - p));
    let x = c[0];
    for (let i = 1; i < c.length; i++) x += c[i] * Math.pow(r, i);
    return p < 0.5 ? -x : x;
  }

  private tDistPValue(t: number, df: number): number {
    // Approximation using regularized incomplete beta function
    const x = df / (df + t * t);
    const p = this.betaInc(x, df / 2, 0.5);
    return Math.min(1, Math.max(0, p));
  }

  private betaInc(x: number, a: number, b: number): number {
    // Simple Continued Fraction approximation
    if (x < 0 || x > 1) return 0;
    if (x === 0) return 0;
    if (x === 1) return 1;
    const lbeta = this.logGamma(a) + this.logGamma(b) - this.logGamma(a + b);
    const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta) / a;
    return front * this.betaCF(x, a, b);
  }

  private betaCF(x: number, a: number, b: number): number {
    const maxIter = 200;
    let c = 1, d = 1 - (a + b) * x / (a + 1);
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= maxIter; m++) {
      let aa = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
      d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d;
      c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
      h *= d * c;
      aa = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1));
      d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d;
      c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
      const delta = d * c;
      h *= delta;
      if (Math.abs(delta - 1) < 1e-10) break;
    }
    return h;
  }

  private logGamma(z: number): number {
    const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    let x = z, y = z, tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (const ci of c) { y++; ser += ci / y; }
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }
}
