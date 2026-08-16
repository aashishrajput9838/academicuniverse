/**
 * AuDicPredictionAdapter.ts
 *
 * Read-Only Prediction Adapter for AU DIC Benchmark Evaluation Framework.
 *
 * Calls AU DIC document vision analysis headlessly and returns structured predictions
 * WITHOUT touching MongoDB database collections or production upload tables.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { BenchmarkPrediction, BenchmarkGroundTruth } from '../types/benchmark.types';

export interface AuDicPredictionOptions {
  useAiProvider?: boolean; // Set to true to make live Gemini AI calls
  dryRunMockResponse?: boolean; // Set to true ONLY for fast unit testing
  allowMockFallback?: boolean; // Default FALSE. When false, missing API keys or errors throw fatal exceptions.
}

export class AuDicPredictionAdapter {
  constructor(private readonly options: AuDicPredictionOptions = {}) {}

  /**
   * Predict structured document intelligence output for a given benchmark ground truth sample.
   * Decoupled from database persistence.
   */
  public async predict(
    sample: BenchmarkGroundTruth,
    baseDatasetDir: string = '.'
  ): Promise<BenchmarkPrediction> {
    const startTime = Date.now();

    // Dry-run mode explicitly requested for unit tests ONLY
    if (this.options.dryRunMockResponse) {
      if (this.options.allowMockFallback === false) {
        throw new Error(
          `[FATAL RESEARCH BENCHMARK ERROR] Sample ${sample.sampleId}: Mock prediction requested but allowMockFallback is false.`
        );
      }
      return this.generateMockPrediction(sample, Date.now() - startTime);
    }

    // Pacing: 8000ms per sample to stay reliably under Groq / Gemini free-tier limits
    const pacingMs = process.env.GROQ_API_KEY ? 8000 : 2000;
    await new Promise((resolve) => setTimeout(resolve, pacingMs));

    // Live Multimodal Vision AI execution path using Gemini API system prompt
    try {
      const { GeminiAIProvider } = require('../../core/ai/gemini.provider');
      const geminiProvider = new GeminiAIProvider();
      let activeModelName = 'gemini-2.5-flash';

      // Load document PNG image directly from disk — ZERO Ground Truth text leakage!
      const fullPngPath = path.resolve(baseDatasetDir, sample.pngPath);
      let imageBase64: string | null = null;
      if (fs.existsSync(fullPngPath)) {
        imageBase64 = fs.readFileSync(fullPngPath).toString('base64');
      } else {
        throw new Error(`[FATAL VISION BENCHMARK ERROR] Document image not found at: ${fullPngPath}`);
      }

      const systemInstruction = `You are an expert document intelligence engine for Academic Universe.
Analyze the provided document image and return a valid JSON object with ALL extracted key-value fields.
ALLOWED_CATEGORIES: CERTIFICATE, MARKSHEET, STUDENT_ID
Schema:
{
  "documentCategory": "CERTIFICATE" | "MARKSHEET" | "STUDENT_ID",
  "confidenceScore": number (float between 0.0 and 1.0),
  "summary": string,
  "extractedEntities": {
    "student_name": string,
    "roll_number": string,
    "enrollment_number": string,
    "degree_name": string,
    "branch_name": string,
    "batch_years": string,
    "father_name": string,
    "mother_name": string,
    "date_of_birth": string,
    "email": string,
    "phone": string,
    "blood_group": string,
    "university_name": string,
    "university_code": string,
    "university_tagline": string,
    "cgpa": string,
    "issue_date": string,
    "subjects": [
      {
        "code": string,
        "name": string,
        "credits": number,
        "grade": string
      }
    ]
  }
}
Instructions:
- Perform optical character recognition and field parsing directly from the document image.
- Do NOT output nested objects inside extractedEntities; all entity values MUST be plain strings.
- Leave missing fields as empty string "".
`;

      const prompt = `Analyze this document image (${sample.qualityProfile} profile) and extract all student and academic entities according to schema.`;
      let aiResponse: any;
      let lastErr: any;

      // Load dynamic configuration file if present
      let configData: any = {};
      try {
        const configPath = path.resolve(__dirname, '../../../benchmark_config.json');
        if (fs.existsSync(configPath)) {
          configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }
      } catch (e) {
        // ignore config load errors
      }

      const providerOrder: string[] = configData.provider_order || ['ollama', 'gemini', 'openrouter', 'groq'];

      for (const providerKey of providerOrder) {
        if (aiResponse) break;

        if (providerKey === 'ollama' && imageBase64) {
          try {
            const { OllamaAIProvider } = require('../../core/ai/ollama.provider');
            const ollamaProvider = new OllamaAIProvider();
            activeModelName = configData.local?.preferred_model || process.env.OLLAMA_VISION_MODEL || 'minicpm-v';
            aiResponse = await ollamaProvider.generateVisionJSON(prompt, imageBase64, 'image/png', {
              systemInstruction,
              model: activeModelName,
              temperature: 0.1,
            });
          } catch (ollamaErr: any) {
            lastErr = ollamaErr;
          }
        } else if (providerKey === 'gemini' && geminiProvider.isAvailable() && imageBase64) {
          activeModelName = configData.cloud?.gemini_model || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
          try {
            aiResponse = await geminiProvider.generateVisionJSON(prompt, imageBase64, 'image/png', {
              systemInstruction,
              model: activeModelName,
              temperature: 0.1,
              maxTokens: 4000,
            });
          } catch (geminiErr: any) {
            lastErr = geminiErr;
          }
        } else if (providerKey === 'openrouter' && process.env.OPENROUTER_API_KEY && imageBase64) {
          const { OpenRouterAIProvider } = require('../../core/ai/openrouter.provider');
          const openrouterProvider = new OpenRouterAIProvider();
          activeModelName = configData.cloud?.openrouter_model || process.env.OPENROUTER_MODEL || 'gpt-4o-mini';
          try {
            aiResponse = await openrouterProvider.generateVisionJSON(prompt, imageBase64, 'image/png', {
              systemInstruction,
              model: activeModelName,
              temperature: 0.1,
              maxTokens: 4000,
            });
          } catch (openrouterErr: any) {
            lastErr = openrouterErr;
          }
        } else if (providerKey === 'groq' && process.env.GROQ_API_KEY && imageBase64) {
          const { GroqAIProvider } = require('../../core/ai/groq.provider');
          const groqProvider = new GroqAIProvider();
          activeModelName = configData.cloud?.groq_model || process.env.GROQ_VISION_MODEL || 'llama-3.2-11b-vision-preview';
          try {
            aiResponse = await groqProvider.generateVisionJSON(prompt, imageBase64, 'image/png', {
              systemInstruction,
              model: activeModelName,
              temperature: 0.1,
              maxTokens: 4000,
            });
          } catch (groqErr: any) {
            lastErr = groqErr;
          }
        }
      }

      if (!aiResponse) {
        if (this.options.allowMockFallback !== true) {
          throw new Error(
            `[FATAL RESEARCH BENCHMARK ERROR] Sample ${sample.sampleId}: Live Vision inference error: ${lastErr?.message || lastErr || 'Provider error'}. Silent mock fallback disabled.`
          );
        }
        return this.generateMockPrediction(sample, Date.now() - startTime);
      }

      const executionTimeMs = Date.now() - startTime;

      if (!aiResponse.documentCategory || aiResponse.documentCategory === 'UNKNOWN') {
        if (this.options.allowMockFallback !== true) {
          throw new Error(
            `[FATAL RESEARCH BENCHMARK ERROR] Sample ${sample.sampleId}: Live AI returned invalid/UNKNOWN response. Silent mock fallback disabled.`
          );
        }
        return this.generateMockPrediction(sample, executionTimeMs);
      }

      const activeProvider = activeModelName.includes('minicpm') || activeModelName.includes('qwen') || activeModelName.includes('llava') ? 'ollama' : (activeModelName.includes('gpt') ? 'openrouter' : 'gemini');
      const executionMode = activeProvider === 'ollama' ? 'local' : 'cloud';

      return {
        sampleId: sample.sampleId,
        documentCategory: aiResponse.documentCategory,
        confidenceScore: typeof aiResponse.confidenceScore === 'number' ? aiResponse.confidenceScore : 0.85,
        summary: aiResponse.summary || '',
        primaryTargetModule: aiResponse.primaryTargetModule || null,
        secondaryTargetModules: aiResponse.secondaryTargetModules || [],
        extractedEntities: aiResponse.extractedEntities || {},
        candidateFields: aiResponse.candidateFields || {},
        rawResponse: aiResponse,
        executionTimeMs,
        isMock: false,
        modelName: activeModelName,
        modelVersion: '1.0.0-live',
        provider: activeProvider,
        executionMode,
        inferenceLatencyMs: executionTimeMs,
        inferenceTimestamp: new Date().toISOString(),
        requestId: `req_${sample.sampleId}_${Date.now()}`,
      };
    } catch (err: any) {
      if (this.options.allowMockFallback !== true) {
        throw new Error(
          `[FATAL RESEARCH BENCHMARK ERROR] Sample ${sample.sampleId}: Live inference error: ${err.message || err}. Silent mock fallback disabled.`
        );
      }
      return this.generateMockPrediction(sample, Date.now() - startTime);
    }
  }

  /**
   * Generates a deterministic prediction model from sample ground truth for dry-runs and unit testing ONLY.
   */
  private generateMockPrediction(
    sample: BenchmarkGroundTruth,
    executionTimeMs: number
  ): BenchmarkPrediction {
    const categoryMap: Record<string, string> = {
      certificate: 'CERTIFICATE',
      marksheet: 'MARKSHEET',
      student_id: 'IDENTITY_CARD',
    };

    const targetModuleMap: Record<string, string> = {
      certificate: 'certificates',
      marksheet: 'academic-records',
      student_id: 'growth-hub',
    };

    return {
      sampleId: sample.sampleId,
      documentCategory: categoryMap[sample.documentType] || 'UNKNOWN',
      confidenceScore: 0.95,
      summary: `Automated prediction for ${sample.sampleId}`,
      primaryTargetModule: {
        id: targetModuleMap[sample.documentType] || 'growth-hub',
        name: 'Target Module',
        confidence: 0.95,
        reason: 'Rule-based evaluation fallback match',
      },
      secondaryTargetModules: [],
      extractedEntities: { ...sample.extractedFields },
      candidateFields: {
        ...sample.extractedFields,
        subjects: sample.subjects.length > 0 ? sample.subjects : undefined,
      },
      executionTimeMs,
      isMock: true,
      modelName: 'mock-dryrun-engine',
      modelVersion: '1.0.0-unit-test',
      inferenceTimestamp: new Date().toISOString(),
      requestId: `mock_${sample.sampleId}`,
    };
  }
}
