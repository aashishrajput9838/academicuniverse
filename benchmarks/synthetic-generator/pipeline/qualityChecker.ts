/**
 * Academic Universe — Synthetic Quality & Integrity Checker
 * Verifies that generated Ground Truth JSON files exactly match rendered documents and manifest entries.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { SyntheticManifest } from '../types/syntheticGenerator.types';

export class QualityChecker {
  /** Validate a completed synthetic dataset output folder */
  static validateDataset(outputDir: string): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const manifestPath = path.join(outputDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      return { isValid: false, errors: ['manifest.json is missing in dataset directory'], warnings: [] };
    }

    let manifest: SyntheticManifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch (e: any) {
      return { isValid: false, errors: [`Failed to parse manifest.json: ${e.message}`], warnings: [] };
    }

    if (!manifest.documents || manifest.documents.length === 0) {
      errors.push('Manifest contains zero documents.');
    }

    const seenIds = new Set<string>();

    for (const doc of manifest.documents || []) {
      // 1. Check ID uniqueness
      if (seenIds.has(doc.documentId)) {
        errors.push(`Duplicate documentId detected in manifest: ${doc.documentId}`);
      }
      seenIds.add(doc.documentId);

      // 2. Check PDF file existence
      const pdfPath = path.join(outputDir, doc.relativeDocPath);
      if (!fs.existsSync(pdfPath)) {
        errors.push(`PDF document file missing for ${doc.documentId} at: ${pdfPath}`);
      } else {
        // Verify SHA-256 checksum
        const fileBuffer = fs.readFileSync(pdfPath);
        const actualSha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        if (actualSha256 !== doc.checksumSha256) {
          errors.push(`SHA-256 checksum mismatch for ${doc.documentId}. Manifest: ${doc.checksumSha256}, Actual: ${actualSha256}`);
        }
      }

      // 3. Check GT file existence & consistency
      const gtPath = path.join(outputDir, doc.groundTruthFile);
      if (!fs.existsSync(gtPath)) {
        errors.push(`Ground Truth file missing for ${doc.documentId} at: ${gtPath}`);
      } else {
        try {
          const gtData = JSON.parse(fs.readFileSync(gtPath, 'utf-8'));
          if (gtData.documentId !== doc.documentId) {
            errors.push(`GT documentId mismatch for ${doc.documentId}. Found: ${gtData.documentId}`);
          }
          if (gtData.category !== doc.category) {
            errors.push(`GT category mismatch for ${doc.documentId}. Expected: ${doc.category}, GT: ${gtData.category}`);
          }
          if (!gtData.studentName) {
            warnings.push(`GT studentName is empty for ${doc.documentId}`);
          }
        } catch (e: any) {
          errors.push(`Invalid Ground Truth JSON for ${doc.documentId}: ${e.message}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
