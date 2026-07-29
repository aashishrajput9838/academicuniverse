/**
 * Academic Universe — Synthetic Manifest & Report Builder
 * Generates manifest.json, metadata.json, and generation-report.md.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  GenerationReport,
  SyntheticManifest,
  SyntheticManifestEntry,
} from '../types/syntheticGenerator.types';

export class ManifestBuilder {
  /** Build and save manifest.json and metadata.json */
  static saveManifestAndMetadata(
    outputDir: string,
    seed: number,
    generatorVersion: string,
    entries: SyntheticManifestEntry[]
  ): { manifestPath: string; metadataPath: string; manifestHash: string } {
    const categoryCounts: Record<string, number> = {};
    const qualityCounts: Record<string, number> = {};
    const templateCounts: Record<string, number> = {};

    entries.forEach((e) => {
      categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
      qualityCounts[e.qualityProfile] = (qualityCounts[e.qualityProfile] || 0) + 1;
      templateCounts[e.templateId] = (templateCounts[e.templateId] || 0) + 1;
    });

    const manifest: SyntheticManifest = {
      manifestVersion: '1.0.0',
      generatorVersion,
      generationSeed: seed,
      generatedTimestamp: new Date().toISOString(),
      totalDocuments: entries.length,
      categoryCounts,
      qualityCounts,
      templateCounts,
      documents: entries,
    };

    // Deterministic hash based on seed, count, documentId, category, qualityProfile, and template (independent of wall-clock PDF timestamp/checksum/pngPath)
    const strippedEntries = entries.map(({ generatedTimestamp, checksumSha256, pngPath, ...rest }) => rest);
    const deterministicPayload = JSON.stringify({ seed, totalDocuments: entries.length, documents: strippedEntries });
    const manifestHash = 'SHA256_' + crypto.createHash('sha256').update(deterministicPayload).digest('hex').substring(0, 16);

    const manifestPath = path.join(outputDir, 'manifest.json');
    const metadataPath = path.join(outputDir, 'metadata.json');

    const manifestJson = JSON.stringify(manifest, null, 2);
    fs.writeFileSync(manifestPath, manifestJson, 'utf-8');

    const metadata = {
      datasetName: 'Academic Universe Synthetic Benchmark Dataset',
      datasetVersion: '1.0.0',
      seed,
      generatorVersion,
      manifestHash,
      createdAt: manifest.generatedTimestamp,
      totalDocuments: entries.length,
      syntheticDisclaimer: 'FOR RESEARCH BENCHMARKING ONLY. CONTAINS FICTIONAL INSTITUTIONS AND CONTENT.',
    };

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

    return { manifestPath, metadataPath, manifestHash };
  }

  /** Write human-readable Markdown generation-report.md */
  static saveReport(outputDir: string, report: GenerationReport): string {
    const lines = [
      `# Synthetic Dataset Generation Report`,
      ``,
      `**Generator Version:** ${report.generatorVersion}  `,
      `**Experiment Seed:** \`${report.experimentSeed}\`  `,
      `**Generated Timestamp:** ${report.generatedTimestamp}  `,
      `**Total Documents:** ${report.totalDocuments}  `,
      `**Generation Duration:** ${(report.generationDurationMs / 1000).toFixed(2)} seconds  `,
      `**Validation Status:** **${report.validationStatus}**  `,
      `**Manifest Hash:** \`${report.manifestHash}\`  `,
      ``,
      `---`,
      ``,
      `## Category Distribution`,
      `| Category | Document Count | Percentage |`,
      `| :--- | :---: | :---: |`,
      ...Object.entries(report.categoryBreakdown).map(
        ([cat, count]) =>
          `| ${cat} | ${count} | ${((count / report.totalDocuments) * 100).toFixed(1)}% |`
      ),
      ``,
      `## Quality Profile Distribution`,
      `| Quality Profile | Document Count | Percentage |`,
      `| :--- | :---: | :---: |`,
      ...Object.entries(report.qualityProfileBreakdown).map(
        ([q, count]) =>
          `| ${q} | ${count} | ${((count / report.totalDocuments) * 100).toFixed(1)}% |`
      ),
      ``,
      `## University Template Distribution`,
      `| Template ID | Document Count | Percentage |`,
      `| :--- | :---: | :---: |`,
      ...Object.entries(report.templateBreakdown).map(
        ([t, count]) =>
          `| ${t} | ${count} | ${((count / report.totalDocuments) * 100).toFixed(1)}% |`
      ),
      ``,
      `---`,
      `*Report generated automatically by Academic Universe Research Platform.*`,
    ];

    const reportPath = path.join(outputDir, 'generation-report.md');
    fs.writeFileSync(reportPath, lines.join('\n'), 'utf-8');
    return reportPath;
  }
}
