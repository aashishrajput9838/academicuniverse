import axios from 'axios';
import { IBaselineRunner, RunnerInput, RunnerOutput } from './baselineRunner.interface';
import { ExtractionPrediction } from '../types/benchmark.types';

const EXTRACTION_PROMPT = `You are an academic document parser. Extract the following fields from the document. Return ONLY valid JSON with this exact schema:
{
  "studentName": string | null,
  "rollNumber": string | null,
  "semester": string | null,
  "sgpa": number | null,
  "cgpa": number | null,
  "issueDate": string | null,
  "courseMarks": [{ "courseCode": string, "courseName": string, "marksObtained": number, "maxMarks": number }]
}
No explanation, no markdown, raw JSON only.`;

async function convertPdfToPng(buffer: Buffer): Promise<Buffer> {
  try {
    const { pdf } = await import('pdf-to-img');
    const documentPages = await pdf(buffer, { scale: 2 });
    return await documentPages.getPage(1);
  } catch {
    throw new Error('pdf-to-img conversion failed: poppler may not be installed');
  }
}

export class OpenRouterSingleRunner implements IBaselineRunner {
  readonly systemId = 'SYS-BASE-3' as const;
  readonly displayName = 'OpenRouter gpt-4o-mini (Single, No Fallback)';
  private apiKey: string;
  private model: string;

  constructor(model: string = 'openai/gpt-4o-mini') {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.model = model;
  }

  async initialize(): Promise<void> {}

  async extract(input: RunnerInput): Promise<RunnerOutput> {
    const start = Date.now();

    try {
      const aiStart = Date.now();

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
        throw new Error(`File type ${input.mimeType} is not supported by OpenRouter vision API.`);
      }

      const base64Data = imageBuffer.toString('base64');
      const dataUrl = `data:${imageMimeType};base64,${base64Data}`;

      const messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: EXTRACTION_PROMPT },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ];

      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: this.model,
          messages,
          temperature: 0.0,
          max_tokens: 2048,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://academicuniverse.com',
          },
          timeout: 30000,
        }
      );

      const aiInferenceMs = Date.now() - aiStart;
      const rawText = response.data?.choices?.[0]?.message?.content || '';
      const prediction = this.parseJsonSafely(rawText);

      return {
        systemId: this.systemId,
        prediction,
        primaryProvider: this.model,
        fallbackTriggered: false,
        fallbackProvider: null,
        latencyMs: { uploadMs: 0, aiInferenceMs, dbStagingMs: 0, totalPipelineMs: Date.now() - start },
        rawResponse: rawText,
      };
    } catch (error: any) {
      return {
        systemId: this.systemId,
        prediction: {},
        primaryProvider: this.model,
        fallbackTriggered: false,
        fallbackProvider: null,
        latencyMs: { uploadMs: 0, aiInferenceMs: 0, dbStagingMs: 0, totalPipelineMs: Date.now() - start },
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
