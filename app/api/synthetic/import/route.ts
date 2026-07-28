/**
 * Academic Universe — Synthetic Import API Route
 * POST /api/synthetic/import
 * Explicitly copies generated synthetic documents to benchmarks/dataset/RAW/ and triggers Dataset Manager.
 */

import { NextResponse } from 'next/server';
import path from 'path';
import { SyntheticPipeline } from '@/benchmarks/synthetic-generator/pipeline/syntheticPipeline';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const benchmarkRoot = path.resolve(process.cwd(), 'benchmarks');
    const outputDir = body.outputDir || path.join(benchmarkRoot, 'synthetic-dataset');

    const pipeline = new SyntheticPipeline(benchmarkRoot);
    const result = pipeline.importToDatasetManager(outputDir);

    return NextResponse.json({
      success: true,
      importedCount: result.importedCount,
      message: `Successfully imported ${result.importedCount} synthetic documents into Dataset Manager.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Import to Dataset Manager failed' },
      { status: 500 }
    );
  }
}
