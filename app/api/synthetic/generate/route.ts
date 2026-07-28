/**
 * Academic Universe — Synthetic Generation API Route
 * POST /api/synthetic/generate
 */

import { NextResponse } from 'next/server';
import path from 'path';
import { SyntheticPipeline } from '@/benchmarks/synthetic-generator/pipeline/syntheticPipeline';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const count = body.count || 25;
    const seed = body.seed || 42;
    const categories = body.categories || [];
    const templateIds = body.templateIds || [];

    const benchmarkRoot = path.resolve(process.cwd(), 'benchmarks');
    const pipeline = new SyntheticPipeline(benchmarkRoot);

    const result = await pipeline.generateDataset({
      count: Number(count),
      seed: Number(seed),
      categories,
      templateIds,
    });

    return NextResponse.json({
      success: true,
      totalDocuments: result.totalDocuments,
      outputDir: result.outputDir,
      report: result.report,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Synthetic generation failed' },
      { status: 500 }
    );
  }
}
