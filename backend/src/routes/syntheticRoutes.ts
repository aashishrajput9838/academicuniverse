/**
 * Academic Universe Backend — Synthetic Generator & Dataset Manager Routes
 * Express endpoints for synthetic dataset generation and import.
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { SyntheticPipeline } from '../../../benchmarks/synthetic-generator/pipeline/syntheticPipeline';

const router = express.Router();

/**
 * POST /api/synthetic/generate
 * Triggers seed-deterministic synthetic dataset generation
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { count = 25, seed = 42, categories = [], templateIds = [] } = req.body;
    const benchmarkRoot = path.resolve(process.cwd(), 'benchmarks');
    const pipeline = new SyntheticPipeline(benchmarkRoot);

    const result = await pipeline.generateDataset({
      count: Number(count),
      seed: Number(seed),
      categories,
      templateIds,
    });

    return res.json({
      success: true,
      totalDocuments: result.totalDocuments,
      outputDir: result.outputDir,
      report: result.report,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Synthetic generation failed',
    });
  }
});

/**
 * POST /api/synthetic/import
 * Copies synthetic documents to benchmarks/dataset/RAW/ and triggers Dataset Manager
 */
router.post('/import', async (req: Request, res: Response) => {
  try {
    const { outputDir } = req.body;
    const benchmarkRoot = path.resolve(process.cwd(), 'benchmarks');
    const targetDir = outputDir || path.join(benchmarkRoot, 'synthetic-dataset');

    const pipeline = new SyntheticPipeline(benchmarkRoot);
    const result = pipeline.importToDatasetManager(targetDir);

    return res.json({
      success: true,
      importedCount: result.importedCount,
      message: `Successfully imported ${result.importedCount} synthetic documents into Dataset Manager.`,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Import to Dataset Manager failed',
    });
  }
});

export default router;
