/**
 * Academic Universe — PII Detector & Masker
 * Scans raw document text and metadata for Personally Identifiable Information (PII).
 * Provides masking utilities and consent audit logging.
 *
 * NOTE: This runs on text extracted from documents — NOT on the raw binary files.
 * Integration point: run after OCR extraction, before storing in ground truth.
 */

import fs from 'fs';
import path from 'path';

export interface PIIDetectionResult {
  documentId: string;
  hasPII: boolean;
  detectedPatterns: Array<{
    type: string;
    value: string;       // Original value
    masked: string;      // Masked representation
    location: string;    // Description of where found
  }>;
  riskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  recommendation: string;
}

const PII_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  // Indian-specific academic PII
  { name: 'AADHAAR_NUMBER',  regex: /\b\d{4}\s?\d{4}\s?\d{4}\b/g },
  { name: 'MOBILE_NUMBER',   regex: /\b(?:\+91[-\s]?)?[6-9]\d{9}\b/g },
  { name: 'EMAIL_ADDRESS',   regex: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g },
  { name: 'PAN_NUMBER',      regex: /\b[A-Z]{5}\d{4}[A-Z]\b/g },
  // Generic PII
  { name: 'DATE_OF_BIRTH',   regex: /\bD(?:ate)?[\s.]*O(?:f)?[\s.]*B(?:irth)?\s*[:\-]?\s*\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/gi },
  { name: 'ADDRESS_HINT',    regex: /(?:address|residence|residing\s+at)\s*[:\-]?\s*.{10,100}/gi },
  { name: 'GUARDIAN_NAME',   regex: /(?:father['s]*|mother['s]*|guardian['s]*)\s+name\s*[:\-]?\s*[A-Za-z\s]{5,50}/gi },
];

export class PIIManager {
  private auditLogPath: string;

  constructor(benchmarkRoot: string) {
    const logDir = path.join(benchmarkRoot, 'dataset-pipeline', 'validation');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    this.auditLogPath = path.join(logDir, 'pii_audit.jsonl');
  }

  /** Scan extracted text for PII patterns */
  detect(documentId: string, text: string): PIIDetectionResult {
    const detected: PIIDetectionResult['detectedPatterns'] = [];

    for (const pattern of PII_PATTERNS) {
      const matches = [...text.matchAll(pattern.regex)];
      for (const match of matches) {
        detected.push({
          type: pattern.name,
          value: match[0],
          masked: this.mask(match[0], pattern.name),
          location: `character position ${match.index}`,
        });
      }
    }

    const riskLevel = detected.length === 0 ? 'NONE'
      : detected.length <= 2 ? 'LOW'
      : detected.length <= 5 ? 'MEDIUM'
      : 'HIGH';

    const recommendation = riskLevel === 'NONE'
      ? 'No PII detected — safe for benchmark use'
      : riskLevel === 'HIGH'
      ? 'HIGH PII RISK — redact or replace document with synthetic alternative'
      : `${detected.length} PII pattern(s) found — apply masking before use`;

    const result: PIIDetectionResult = {
      documentId,
      hasPII: detected.length > 0,
      detectedPatterns: detected,
      riskLevel,
      recommendation,
    };

    // Write audit log entry
    this.writeAudit({ action: 'PII_SCAN', documentId, riskLevel, detectedCount: detected.length });

    return result;
  }

  /** Apply masking to text — replaces PII with safe placeholders */
  maskText(text: string): string {
    let masked = text;
    for (const pattern of PII_PATTERNS) {
      masked = masked.replace(pattern.regex, (match) => this.mask(match, pattern.name));
    }
    return masked;
  }

  /** Mask a ground truth field value if it contains PII */
  maskFieldValue(value: string | null, fieldName: string): string | null {
    if (value === null || value === undefined) return null;
    // Student names are inherently PII — return placeholder
    if (fieldName === 'studentName') return '[STUDENT_NAME_REDACTED]';
    return this.maskText(value);
  }

  /** Check if a metadata object has consent for dataset use */
  validateConsent(metadata: { consentStatus: string; consentRef?: string; piiMasked: boolean }): {
    cleared: boolean;
    reason: string;
  } {
    if (metadata.consentStatus === 'SYNTHETIC') {
      return { cleared: true, reason: 'Synthetic document — no consent required' };
    }
    if (metadata.consentStatus === 'PUBLIC_DOMAIN') {
      return { cleared: true, reason: 'Public domain document' };
    }
    if (metadata.consentStatus === 'ANONYMIZED' && metadata.piiMasked) {
      return { cleared: true, reason: 'Document anonymized with PII masked' };
    }
    if (metadata.consentStatus === 'CONSENTED' && metadata.consentRef) {
      return { cleared: true, reason: `Consent on file: ${metadata.consentRef}` };
    }
    return { cleared: false, reason: `Consent unclear — status: ${metadata.consentStatus}` };
  }

  // --- Private Helpers ---

  private mask(value: string, type: string): string {
    switch (type) {
      case 'AADHAAR_NUMBER': return 'XXXX-XXXX-' + value.replace(/\D/g, '').slice(-4);
      case 'MOBILE_NUMBER':  return 'XXXXXXXX' + value.replace(/\D/g, '').slice(-2);
      case 'EMAIL_ADDRESS':  return '[EMAIL_REDACTED]';
      case 'PAN_NUMBER':     return '[PAN_REDACTED]';
      default:               return `[${type}_REDACTED]`;
    }
  }

  private writeAudit(entry: Record<string, unknown>): void {
    const log = { ...entry, timestamp: new Date().toISOString() };
    fs.appendFileSync(this.auditLogPath, JSON.stringify(log) + '\n', 'utf-8');
  }
}
