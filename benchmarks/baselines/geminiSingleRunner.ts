/**
 * Baseline 2 — Single Gemini Runner (SYS-BASE-2)
 * Direct Google Gemini 1.5 Pro extraction — no fallback, no staging.
 */

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

export class GeminiSingleRunner implements IBaselineRunner {
  readonly systemId = 'SYS-BASE-2' as const;
  readonly displayName = 'Gemini 3.6 Flash (Single, No Fallback)';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
  }

  async initialize(): Promise<void> {
    // Initialization complete — missing API key handled gracefully in extract()
  }

  async extract(input: RunnerInput): Promise<RunnerOutput> {
    const start = Date.now();
    const uploadMs = 0;

    try {
      const aiStart = Date.now();
      const base64Data = input.fileBuffer.toString('base64');

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${this.apiKey}`,
        {
          contents: [{
            parts: [
              { text: EXTRACTION_PROMPT },
              { inline_data: { mime_type: input.mimeType, data: base64Data } },
            ],
          }],
          generationConfig: { temperature: 0.0, maxOutputTokens: 2048 },
        },
        { timeout: 30000 }
      );

      const aiInferenceMs = Date.now() - aiStart;
      const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const prediction = this.parseJsonSafely(rawText);

      return {
        systemId: this.systemId,
        prediction,
        primaryProvider: 'gemini-3.6-flash',
        fallbackTriggered: false,
        fallbackProvider: null,
        latencyMs: { uploadMs, aiInferenceMs, dbStagingMs: 0, totalPipelineMs: Date.now() - start },
        rawResponse: rawText,
      };
    } catch (error: any) {
      return {
        systemId: this.systemId,
        prediction: {},
        primaryProvider: 'gemini-3.6-flash',
        fallbackTriggered: false,
        fallbackProvider: null,
        latencyMs: { uploadMs, aiInferenceMs: 0, dbStagingMs: 0, totalPipelineMs: Date.now() - start },
        errorMessage: error.message,
      };
    }
  }

  async shutdown(): Promise<void> {}

  private parseJsonSafely(raw: string): ExtractionPrediction {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch {}
    return { rawText: raw };
  }
}
