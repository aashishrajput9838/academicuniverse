import axios from 'axios';
import { IBaselineRunner, RunnerInput, RunnerOutput } from './baselineRunner.interface';
import { ExtractionPrediction } from '../types/benchmark.types';

const EXTRACTION_PROMPT = `You are an academic document parser. Extract the following fields from the document image or text. Return ONLY valid JSON matching this schema exactly:
{
  "studentName": string | null,
  "rollNumber": string | null,
  "semester": string | null,
  "sgpa": number | null,
  "cgpa": number | null,
  "issueDate": string | null,
  "courseMarks": [{ "courseCode": string, "courseName": string, "marksObtained": number, "maxMarks": number }]
}
Do not include any explanation or markdown. Return raw JSON only.`;

async function convertPdfToPng(buffer: Buffer): Promise<Buffer> {
  try {
    const { pdfToImg } = require('pdf-to-img');
    return await pdfToImg(buffer, { format: 'png', density: 200 });
  } catch {
    throw new Error('pdf-to-img conversion failed: poppler may not be installed');
  }
}

export interface AUDICRunnerConfig {
  geminiApiKey: string;
  openRouterApiKey: string;
  geminiModel: string;
  openRouterModel: string;
  timeoutMs: number;
  /** Simulate human review overhead (ms) instead of actually opening a UI */
  simulatedReviewMs: number;
}

export class AcademicUniverseDICRunner implements IBaselineRunner {
  readonly systemId = 'SYS-PROP' as const;
  readonly displayName = 'Academic Universe DIC Hybrid (Dual-Provider + HITL Staging)';
  private config: AUDICRunnerConfig;

  constructor(config?: Partial<AUDICRunnerConfig>) {
    this.config = {
      geminiApiKey: process.env.GEMINI_API_KEY || '',
      openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
      geminiModel: 'gemini-3.1-flash-lite',
      openRouterModel: 'openai/gpt-4o-mini',
      timeoutMs: 30000,
      simulatedReviewMs: 0, // 0 = skip HITL timing simulation during automated runs
      ...config,
    };
  }

  async initialize(): Promise<void> {}

  async extract(input: RunnerInput): Promise<RunnerOutput> {
    const pipelineStart = Date.now();
    const uploadMs = 0; // Buffer already in memory for benchmark
    let fallbackTriggered = false;
    let fallbackProvider: string | null = null;
    let rawResponse = '';
    let prediction: ExtractionPrediction = {};
    let primaryProvider = this.config.geminiModel;

    const aiStart = Date.now();

    // Step 1: Try Gemini primary
    try {
      rawResponse = await this.callGemini(input);
      prediction = this.parseJsonSafely(rawResponse);
    } catch (primaryError: any) {
      // Step 2: Primary failed → trigger OpenRouter fallback
      fallbackTriggered = true;
      fallbackProvider = this.config.openRouterModel;
      try {
        rawResponse = await this.callOpenRouter(input);
        prediction = this.parseJsonSafely(rawResponse);
      } catch (fallbackError: any) {
        const aiInferenceMs = Date.now() - aiStart;
        return {
          systemId: this.systemId,
          prediction: {},
          primaryProvider,
          fallbackTriggered,
          fallbackProvider,
          latencyMs: { uploadMs, aiInferenceMs, dbStagingMs: 0, totalPipelineMs: Date.now() - pipelineStart },
          rawResponse: '',
          errorMessage: `Primary: ${primaryError.message} | Fallback: ${fallbackError.message}`,
        };
      }
    }

    const aiInferenceMs = Date.now() - aiStart;

    // Step 3: Simulate candidate staging (PENDING_REVIEW write)
    const stagingStart = Date.now();
    await this.simulateCandidateStaging(prediction);
    const dbStagingMs = Date.now() - stagingStart;

    // Step 4: Simulate HITL review if configured
    if (this.config.simulatedReviewMs > 0) {
      await this.sleep(this.config.simulatedReviewMs);
    }

    return {
      systemId: this.systemId,
      prediction,
      primaryProvider,
      fallbackTriggered,
      fallbackProvider,
      latencyMs: {
        uploadMs,
        aiInferenceMs,
        dbStagingMs,
        totalPipelineMs: Date.now() - pipelineStart,
      },
      rawResponse,
    };
  }

  async shutdown(): Promise<void> {}

  // --- Private Methods ---

  private async callGemini(input: RunnerInput): Promise<string> {
    const base64Data = input.fileBuffer.toString('base64');
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.config.geminiModel}:generateContent?key=${this.config.geminiApiKey}`,
      {
        contents: [{
          parts: [
            { text: EXTRACTION_PROMPT },
            { inline_data: { mime_type: input.mimeType, data: base64Data } },
          ],
        }],
        generationConfig: { temperature: 0.0, maxOutputTokens: 2048 },
      },
      { timeout: this.config.timeoutMs }
    );
    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  private async callOpenRouter(input: RunnerInput): Promise<string> {
    const isRealImage = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(input.mimeType);
    const isPdf = input.mimeType === 'application/pdf';
    let imageBuffer: Buffer;
    let imageMimeType: string;

    if (isRealImage) {
      imageBuffer = input.fileBuffer;
      imageMimeType = input.mimeType;
    } else if (isPdf) {
      imageBuffer = await convertPdfToPng(input.fileBuffer);
      imageMimeType = 'image/png';
    } else {
      throw new Error(`OpenRouter fallback: file type ${input.mimeType} is not supported by vision API.`);
    }

    const base64Data = imageBuffer.toString('base64');
    const dataUrl = `data:${imageMimeType};base64,${base64Data}`;
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: this.config.openRouterModel,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: EXTRACTION_PROMPT },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        }],
        temperature: 0.0,
        max_tokens: 2048,
      },
      {
        headers: {
          Authorization: `Bearer ${this.config.openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://academicuniverse.com',
        },
        timeout: this.config.timeoutMs,
      }
    );
    return response.data?.choices?.[0]?.message?.content || '';
  }

  /** Simulate in-memory staging write (no real DB in benchmark mode) */
  private async simulateCandidateStaging(_prediction: ExtractionPrediction): Promise<void> {
    // In real DIC: UaipUpload.create({ ...prediction, status: 'PENDING_REVIEW' })
    // For benchmark isolation, we skip real DB writes to prevent contamination.
    await this.sleep(5); // ~5ms simulated write latency
  }

  private parseJsonSafely(raw: string): ExtractionPrediction {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch {}
    return { rawText: raw };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
