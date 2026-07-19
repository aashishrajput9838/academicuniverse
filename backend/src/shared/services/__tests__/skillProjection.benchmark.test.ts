/**
 * Sprint-002C Projection Scaling Benchmark
 *
 * Run with: npx jest --runInBand --verbose src/shared/services/__tests__/skillProjection.benchmark.test.ts
 *
 * Measures rebuildAllSkillRecords performance at different scales:
 * - 10 skills
 * - 100 skills
 * - 1,000 skills
 * - 10,000 skills
 *
 * Metrics:
 * - Projection rebuild time (total)
 * - Memory usage (before and after)
 * - Query count (repository method calls)
 */

import { SkillProjectionService } from '../skillProjection.service';
import { SkillRecordRepository } from '../../repositories/skillRecord.repository';
import { SkillEvidenceRepository } from '../../repositories/skillEvidence.repository';
import { AuditEntry } from '../../../models/AuditEntry';

jest.mock('../../repositories/skillRecord.repository');
jest.mock('../../repositories/skillEvidence.repository');
jest.mock('../../../models/AuditEntry');

const mockedSkillRecordRepo = SkillRecordRepository as jest.MockedClass<typeof SkillRecordRepository>;
const mockedEvidenceRepo = SkillEvidenceRepository as jest.MockedClass<typeof SkillEvidenceRepository>;
const mockedAuditEntry = AuditEntry as jest.MockedClass<typeof AuditEntry>;

const VALID_ORG_ID = '507f1f77bcf86cd799439011';
const VALID_PERSON_ID = '507f1f77bcf86cd799439012';

describe('Sprint-002C Projection Scaling Benchmark', () => {
  function generateEvidence(skillCount: number): any[] {
    const evidence: any[] = [];
    const now = Date.now();

    for (let i = 0; i < skillCount; i++) {
      const skillId = `SKILL-${i}`;
      const canonicalId = `canonical-${i % 10}`;

      evidence.push({
        _id: `ev-${i}`,
        organizationId: VALID_ORG_ID,
        personId: VALID_PERSON_ID,
        skillId,
        skillName: `Skill ${i}`,
        aliases: [],
        primarySource: 'ACADEMIC',
        sourceType: 'TRANSCRIPT',
        payload: {
          canonicalId: i < skillCount / 2 ? canonicalId : undefined,
          canonicalName: i < skillCount / 2 ? `Canonical ${i % 10}` : undefined,
        },
        confidence: 0.8 + Math.random() * 0.2,
        extractedBy: 'AI',
        effectiveFrom: new Date(now - Math.random() * 365 * 24 * 60 * 60 * 1000),
        effectiveTo: undefined,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return evidence;
  }

  async function runBenchmark(skillCount: number, useOntology: boolean) {
    const evidence = generateEvidence(skillCount);
    const queryCount = { findByPerson: 0, findActiveByPersonAndSkill: 0, findActiveByPersonAndCanonical: 0 };

    mockedEvidenceRepo.prototype.findByPerson.mockImplementation(() => {
      queryCount.findByPerson++;
      return Promise.resolve(evidence as any);
    });

    mockedEvidenceRepo.prototype.findActiveByPersonAndSkill.mockImplementation(() => {
      queryCount.findActiveByPersonAndSkill++;
      return Promise.resolve([] as any);
    });

    mockedEvidenceRepo.prototype.findActiveByPersonAndCanonical.mockImplementation(() => {
      queryCount.findActiveByPersonAndCanonical++;
      return Promise.resolve([] as any);
    });

    mockedSkillRecordRepo.prototype.findBySkill.mockResolvedValue(null as any);
    mockedSkillRecordRepo.prototype.rebuildProjection.mockResolvedValue({ _id: 'skill-1' } as any);
    (mockedAuditEntry.create as jest.MockedFunction<any>).mockResolvedValue({} as any);

    const service = new SkillProjectionService();
    process.env.USE_ONTOLOGY_RESOLUTION = useOntology ? 'true' : 'false';

    const memBefore = process.memoryUsage();
    const startTime = performance.now();

    await service.rebuildAllSkillRecords(VALID_ORG_ID, VALID_PERSON_ID);

    const endTime = performance.now();
    const memAfter = process.memoryUsage();

    return {
      skillCount,
      useOntology,
      duration: endTime - startTime,
      memUsed: memAfter.heapUsed - memBefore.heapUsed,
      queryCount,
      rebuildCalls: mockedSkillRecordRepo.prototype.rebuildProjection.mock.calls.length,
    };
  }

  it('benchmark: raw vs canonical projection at different scales', async () => {
    const scales = [10, 100, 1000, 10000];
    const results: any[] = [];

    for (const scale of scales) {
      const rawResult = await runBenchmark(scale, false);
      results.push(rawResult);

      const canonicalResult = await runBenchmark(scale, true);
      results.push(canonicalResult);
    }

    const fs = require('fs');
    const path = require('path');

    const lines: string[] = [];
    lines.push('=== Sprint-002C Projection Scaling Benchmark ===');
    lines.push('');
    lines.push('Scale | Mode      | Duration(ms) | Memory(MB) | Queries | Rebuilds');
    lines.push('-'.repeat(75));

    for (const r of results) {
      const totalQueries = r.queryCount.findByPerson + r.queryCount.findActiveByPersonAndSkill + r.queryCount.findActiveByPersonAndCanonical;
      lines.push(
        `${r.skillCount.toString().padStart(6)} | ${r.useOntology ? 'Canonical ' : 'Raw      '} | ${r.duration.toFixed(2).padStart(12)} | ${(r.memUsed / 1024 / 1024).toFixed(2).padStart(10)} | ${totalQueries.toString().padStart(7)} | ${r.rebuildCalls.toString().padStart(8)}`
      );
    }

    lines.push('');
    lines.push('=== Scaling Analysis ===');
    lines.push('');

    const raw10 = results.find(r => r.skillCount === 10 && !r.useOntology)!;
    const raw100 = results.find(r => r.skillCount === 100 && !r.useOntology)!;
    const raw1k = results.find(r => r.skillCount === 1000 && !r.useOntology)!;
    const raw10k = results.find(r => r.skillCount === 10000 && !r.useOntology)!;

    const canon10 = results.find(r => r.skillCount === 10 && r.useOntology)!;
    const canon100 = results.find(r => r.skillCount === 100 && r.useOntology)!;
    const canon1k = results.find(r => r.skillCount === 1000 && r.useOntology)!;
    const canon10k = results.find(r => r.skillCount === 10000 && r.useOntology)!;

    lines.push('Raw Mode Scaling:');
    lines.push(`  10 -> 100:  ${((raw100.duration / raw10.duration - 1) * 100).toFixed(1)}% time increase`);
    lines.push(`  100 -> 1K:  ${((raw1k.duration / raw100.duration - 1) * 100).toFixed(1)}% time increase`);
    lines.push(`  1K -> 10K:  ${((raw10k.duration / raw1k.duration - 1) * 100).toFixed(1)}% time increase`);

    lines.push('');
    lines.push('Canonical Mode Scaling:');
    lines.push(`  10 -> 100:  ${((canon100.duration / canon10.duration - 1) * 100).toFixed(1)}% time increase`);
    lines.push(`  100 -> 1K:  ${((canon1k.duration / canon100.duration - 1) * 100).toFixed(1)}% time increase`);
    lines.push(`  1K -> 10K:  ${((canon10k.duration / canon1k.duration - 1) * 100).toFixed(1)}% time increase`);

    lines.push('');
    lines.push('Canonical vs Raw Overhead:');
    lines.push(`  10 skills:   ${((canon10.duration / raw10.duration - 1) * 100).toFixed(1)}%`);
    lines.push(`  100 skills:  ${((canon100.duration / raw100.duration - 1) * 100).toFixed(1)}%`);
    lines.push(`  1K skills:   ${((canon1k.duration / raw1k.duration - 1) * 100).toFixed(1)}%`);
    lines.push(`  10K skills:  ${((canon10k.duration / raw10k.duration - 1) * 100).toFixed(1)}%`);

    lines.push('');
    lines.push('Note: Query counts reflect mocked repository calls in test environment.');
    lines.push('Actual production query counts may differ based on DB indexes and network latency.');

    const outputPath = path.join(__dirname, 'SPRINT-002C-BENCHMARK-RESULTS.txt');
    fs.writeFileSync(outputPath, lines.join('\n'));

    console.log('\n' + lines.join('\n') + '\n');

    expect(results.length).toBe(8);
  });
});
