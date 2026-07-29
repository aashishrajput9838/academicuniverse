/**
 * Academic Universe — Metrics Calculator
 * Pure functions for computing TP, FP, FN, precision, recall, and F1
 * from field match results.
 *
 * DESIGN PRINCIPLE: These are the ONLY canonical computations in the pipeline.
 * Every metric in every artifact MUST originate from these functions.
 * No metric may ever be stored independently of its source fieldMatches.
 *
 * Mathematical guarantees enforced:
 *   Precision  = TP / (TP + FP)
 *   Recall     = TP / (TP + FN)
 *   F1         = 2 * P * R / (P + R)
 *   TP+FP+FN   = total fieldMatches count
 */

import { FieldMatchResult } from '../types/benchmark.types';

export interface FieldMetrics {
  tp: number;
  fp: number;
  fn: number;
  precision: number;
  recall: number;
  f1: number;
}

/**
 * Compute metrics from a single document's fieldMatches.
 *
 * Classification rules:
 *   isMatch = true                          → TP
 *   isMatch = false AND actual is non-null  → FP (wrong value extracted)
 *   isMatch = false AND actual is null/undefined → FN (field not extracted)
 */
export function computeFieldMetrics(fieldMatches: FieldMatchResult[]): FieldMetrics {
  let tp = 0;
  let fp = 0;
  let fn = 0;

  for (const fm of fieldMatches) {
    if (fm.isMatch) {
      tp++;
    } else if (fm.actual !== null && fm.actual !== undefined) {
      fp++;
    } else {
      fn++;
    }
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return { tp, fp, fn, precision, recall, f1 };
}

/**
 * Validate that stored metrics match metrics recomputed from fieldMatches.
 * Returns an error string if any invariant is violated, null if all pass.
 */
export function validateFieldMetrics(
  fieldMatches: FieldMatchResult[],
  stored: {
    truePositives: number;
    falsePositives: number;
    falseNegatives: number;
    precision: number;
    recall: number;
    f1Score: number;
  }
): string | null {
  const computed = computeFieldMetrics(fieldMatches);

  if (stored.truePositives !== computed.tp) {
    return `TP mismatch: stored=${stored.truePositives}, computed=${computed.tp}`;
  }
  if (stored.falsePositives !== computed.fp) {
    return `FP mismatch: stored=${stored.falsePositives}, computed=${computed.fp}`;
  }
  if (stored.falseNegatives !== computed.fn) {
    return `FN mismatch: stored=${stored.falseNegatives}, computed=${computed.fn}`;
  }
  if (Math.abs(stored.precision - computed.precision) > 1e-3) {
    return `Precision mismatch: stored=${stored.precision}, computed=${computed.precision}`;
  }
  if (Math.abs(stored.recall - computed.recall) > 1e-3) {
    return `Recall mismatch: stored=${stored.recall}, computed=${computed.recall}`;
  }
  if (Math.abs(stored.f1Score - computed.f1) > 1e-3) {
    return `F1 mismatch: stored=${stored.f1Score}, computed=${computed.f1}`;
  }

  return null;
}

/**
 * Validate that TP + FP + FN equals the total number of fieldMatches.
 * Rejects impossible states (e.g., 6 matches but TP=4, FP=3, FN=3).
 */
export function validateFieldCount(
  tp: number,
  fp: number,
  fn: number,
  fieldCount: number
): string | null {
  if (tp + fp + fn !== fieldCount) {
    return `TP+FP+FN (${tp + fp + fn}) does not equal fieldMatches count (${fieldCount}). ` +
           `Impossible state detected — each field must contribute to exactly one of TP, FP, FN.`;
  }
  return null;
}

/**
 * Validate that the F1 equation holds for stored precision, recall, and F1.
 */
export function validateMetricEquations(
  precision: number,
  recall: number,
  f1: number,
  tolerance = 1e-3
): string | null {
  const computedF1 = precision + recall > 0
    ? (2 * precision * recall) / (precision + recall)
    : 0;
  if (Math.abs(f1 - computedF1) > tolerance) {
    return `F1 equation violated: stored=${f1}, computed from P/R=${computedF1}. ` +
           `Equation: F1 = 2*P*R/(P+R)`;
  }
  return null;
}

/**
 * Deterministic HITL correction count derived from documentId + systemId seed.
 * Replaces Math.random() for reproducible benchmark simulation.
 * Returns a value in [0, maxCorrections].
 */
export function deterministicCorrectionCount(
  documentId: string,
  systemId: string,
  maxCorrections: number,
  reviewRequired: boolean
): number {
  if (!reviewRequired) return 0;
  // Simple deterministic hash: sum of char codes mod (maxCorrections+1)
  const seed = `${documentId}:${systemId}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % (maxCorrections + 1);
}
