/**
 * groundTruthAdapter.test.ts
 *
 * Unit tests for AdbgGroundTruthAdapter.
 */

import * as fs from 'fs';
import * as path from 'path';
import { AdbgGroundTruthAdapter } from '../adapters/AdbgGroundTruthAdapter';

describe('AdbgGroundTruthAdapter', () => {
  const adapter = new AdbgGroundTruthAdapter();
  const tmpDir = path.resolve(__dirname, 'tmp_gt_test');

  beforeAll(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
    const dummyGt = {
      document_id: 'DOC-12345678_clean',
      document_type: 'certificate',
      quality_profile: 'clean',
      fields: {
        candidate_name: 'John Doe',
        issuer: 'Sharda University',
        issue_date: '2024-05-15',
      },
    };
    fs.writeFileSync(
      path.join(tmpDir, 'sample_gt.json'),
      JSON.stringify(dummyGt, null, 2),
      'utf-8'
    );
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('should parse ground truth JSON correctly into domain model', () => {
    const gt = adapter.loadGroundTruth('sample_gt.json', tmpDir);
    expect(gt.sampleId).toBe('DOC-12345678_clean');
    expect(gt.documentType).toBe('certificate');
    expect(gt.qualityProfile).toBe('clean');
    expect(gt.extractedFields.candidate_name).toBe('John Doe');
    expect(gt.extractedFields.issuer).toBe('Sharda University');
  });

  test('should throw error when file does not exist', () => {
    expect(() => {
      adapter.loadGroundTruth('non_existent.json', tmpDir);
    }).toThrow('Ground truth file not found');
  });
});
