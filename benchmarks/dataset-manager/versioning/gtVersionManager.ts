/**
 * Academic Universe — Ground Truth Version Control & Audit Logging System
 * Tracks GT version history (v1, v2, ...), supports version rollbacks,
 * and maintains immutable audit logs for all scientific annotation actions.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { GroundTruthVersion, AuditLogEntry } from '../types/annotationPlatform.types';

export class GTVersionManager {
  private versionsDir: string;
  private auditLogPath: string;

  constructor(benchmarkRoot: string) {
    this.versionsDir = path.join(benchmarkRoot, 'dataset-pipeline', 'annotations', 'history');
    this.auditLogPath = path.join(benchmarkRoot, 'dataset-pipeline', 'validation', 'annotation_audit_full.jsonl');
    [this.versionsDir, path.dirname(this.auditLogPath)].forEach((d) => {
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    });
  }

  /** Record a new version snapshot for a document's ground truth */
  createVersion(
    documentId: string,
    gtData: Record<string, unknown>,
    updatedBy: string,
    changeSummary: string
  ): GroundTruthVersion {
    const history = this.getVersionHistory(documentId);
    const nextVersionNum = history.length + 1;

    const versionRecord: GroundTruthVersion = {
      version: nextVersionNum,
      timestamp: new Date().toISOString(),
      updatedBy,
      changeSummary,
      gtData,
    };

    history.push(versionRecord);
    const docHistoryPath = path.join(this.versionsDir, `${documentId}_history.json`);
    fs.writeFileSync(docHistoryPath, JSON.stringify(history, null, 2), 'utf-8');

    return versionRecord;
  }

  /** Get complete version history for a document */
  getVersionHistory(documentId: string): GroundTruthVersion[] {
    const docHistoryPath = path.join(this.versionsDir, `${documentId}_history.json`);
    if (!fs.existsSync(docHistoryPath)) return [];
    try {
      return JSON.parse(fs.readFileSync(docHistoryPath, 'utf-8')) as GroundTruthVersion[];
    } catch {
      return [];
    }
  }

  /** Restore a previous ground truth version */
  restoreVersion(documentId: string, targetVersion: number, restoredBy: string): Record<string, unknown> {
    const history = this.getVersionHistory(documentId);
    const target = history.find((h) => h.version === targetVersion);
    if (!target) throw new Error(`Version v${targetVersion} not found for document ${documentId}`);

    // Record new version for the restoration
    this.createVersion(
      documentId,
      target.gtData,
      restoredBy,
      `Restored GT from version v${targetVersion}`
    );

    this.logAudit({
      entryId: this.generateEntryId(),
      documentId,
      timestamp: new Date().toISOString(),
      action: 'VERSION_RESTORED',
      actor: restoredBy,
      details: `Restored ground truth to version v${targetVersion}`,
    });

    return target.gtData;
  }

  /** Log a structured audit action */
  logAudit(entry: AuditLogEntry): void {
    fs.appendFileSync(this.auditLogPath, JSON.stringify(entry) + '\n', 'utf-8');
  }

  /** Get audit log history for a specific document or all documents */
  getAuditLogs(documentId?: string): AuditLogEntry[] {
    if (!fs.existsSync(this.auditLogPath)) return [];
    const lines = fs.readFileSync(this.auditLogPath, 'utf-8').split('\n').filter(Boolean);
    const entries: AuditLogEntry[] = [];
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as AuditLogEntry;
        if (!documentId || parsed.documentId === documentId) {
          entries.push(parsed);
        }
      } catch {}
    }
    return entries;
  }

  private generateEntryId(): string {
    return 'AUD_' + crypto.randomBytes(6).toString('hex');
  }
}
