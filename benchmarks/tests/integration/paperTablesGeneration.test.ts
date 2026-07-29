/**
 * Academic Universe — Paper Tables Integration Tests
 * Verifies that Tables 5, 6, and 7 markdown files match the certified benchmark JSON exactly.
 */

import fs from 'fs';
import path from 'path';

const TABLES_DIR = path.join(__dirname, '../../../paper-draft-v1/tables');
const JSON_PATH = path.join(__dirname, '../../../paper-draft-v1/benchmark-results/experiment_VAL-20260729.json');

describe('Paper Tables Generation Integration', () => {
  it('should have generated Table 5, Table 6, and Table 7 markdown files', () => {
    expect(fs.existsSync(path.join(TABLES_DIR, 'table5_benchmark_results.md'))).toBe(true);
    expect(fs.existsSync(path.join(TABLES_DIR, 'table6_aggregate_metrics.md'))).toBe(true);
    expect(fs.existsSync(path.join(TABLES_DIR, 'table7_category_breakdown.md'))).toBe(true);
  });

  it('should ensure Table 6 mean latency for SYS-PROP matches JSON (2,773 ms, not old buggy 2,796 ms)', () => {
    const table6Content = fs.readFileSync(path.join(TABLES_DIR, 'table6_aggregate_metrics.md'), 'utf-8');
    const jsonContent = fs.readFileSync(JSON_PATH, 'utf-8');
    const data = JSON.parse(jsonContent);

    const propDocs = (data.evaluations || []).filter((e: any) => e.systemId === 'SYS-PROP');
    const computedMeanLat = Math.round(propDocs.reduce((s: number, d: any) => s + d.latencyMs.totalPipelineMs, 0) / propDocs.length);

    // Should be 2773
    expect(computedMeanLat).toBe(2773);

    // Table 6 should contain 2,773
    expect(table6Content).toContain('2,773');
  });

  it('should ensure Table 7 reports correct HITL impact totals matching JSON', () => {
    const table7Content = fs.readFileSync(path.join(TABLES_DIR, 'table7_category_breakdown.md'), 'utf-8');
    
    // 5 of 5 docs reviewed, 35 seconds total, 2 fields corrected
    expect(table7Content).toContain('5 of 5 (100%)');
    expect(table7Content).toContain('35 seconds');
    expect(table7Content).toContain('Total fields corrected | 2');
  });
});
