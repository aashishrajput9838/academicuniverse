import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

/**
 * Helper to resolve the benchmarks root directory robustly
 * regardless of whether backend is started from root or backend/ subfolder.
 */
function getBenchmarkRoot(): string {
  const rootDir = process.cwd();
  if (fs.existsSync(path.join(rootDir, 'benchmarks'))) {
    return path.join(rootDir, 'benchmarks');
  }
  if (fs.existsSync(path.join(rootDir, '..', 'benchmarks'))) {
    return path.resolve(rootDir, '..', 'benchmarks');
  }
  return path.join(rootDir, 'benchmarks');
}

/**
 * POST /api/synthetic/generate
 * Generates synthetic academic document dataset lazily upon incoming POST request.
 */
export const generateSyntheticDataset = async (req: Request, res: Response) => {
  try {
    const { count = 25, seed = 42, categories = [], templateIds = [] } = req.body || {};

    const benchmarkRoot = getBenchmarkRoot();
    // Lazy evaluation: SyntheticPipeline is dynamically required only when this request handler runs
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { SyntheticPipeline } = require('../../../benchmarks/synthetic-generator/pipeline/syntheticPipeline');
    const pipeline = new SyntheticPipeline(benchmarkRoot);

    const result = await pipeline.generateDataset({
      count: Number(count),
      seed: Number(seed),
      categories,
      templateIds,
    });

    return res.status(200).json({
      success: true,
      totalDocuments: result.totalDocuments,
      outputDir: result.outputDir,
      report: result.report,
    });
  } catch (error: any) {
    console.error('Synthetic generation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Synthetic generation failed',
    });
  }
};

/**
 * POST /api/synthetic/import
 * Imports generated synthetic documents into Dataset Manager lazily upon incoming POST request.
 */
export const importSyntheticDataset = async (req: Request, res: Response) => {
  try {
    const benchmarkRoot = getBenchmarkRoot();
    const outputDir = req.body?.outputDir || path.join(benchmarkRoot, 'synthetic-dataset');

    // Lazy evaluation: SyntheticPipeline is dynamically required only when this request handler runs
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { SyntheticPipeline } = require('../../../benchmarks/synthetic-generator/pipeline/syntheticPipeline');
    const pipeline = new SyntheticPipeline(benchmarkRoot);
    const result = pipeline.importToDatasetManager(outputDir);

    return res.status(200).json({
      success: true,
      importedCount: result.importedCount,
      message: `Successfully imported ${result.importedCount} synthetic documents into Dataset Manager.`,
    });
  } catch (error: any) {
    console.error('Synthetic import error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Import to Dataset Manager failed',
    });
  }
};
