import { aiProvider } from '../../core/ai';
import { KnowledgeRecordModel } from '../../models/KnowledgeRecord';
import { Logger } from '../../shared/utils';
import { SUPPORTED_CATEGORIES, SupportedCategory } from './uaipConfig';

const logger = new Logger('UaipDocumentAiService');

export interface DocumentAiResult {
  documentCategory: SupportedCategory;
  confidenceScore: number; // 0.0 - 1.0
  summary: string;
  extractedEntities: Record<string, any>;
  suggestedModule: string; // e.g. 'AcademicRecord', 'CertificateRecord', etc.
  candidateFields: Record<string, any>;
}

export class UaipDocumentAiService {
  /**
   * Run Gemini AI analysis (Stage 2) using content parsed during Stage 1.
   */
  async processDocument(params: {
    processingId: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }): Promise<DocumentAiResult> {
    const { processingId, fileName, mimeType, fileSize } = params;

    // 1️⃣ Fetch the KnowledgeRecord for rawContent
    const record = await KnowledgeRecordModel.findOne({ processingId });
    if (!record) {
      throw new Error(`KnowledgeRecord not found for processingId: ${processingId}`);
    }

    const contentToAnalyze = record.rawContent || '';
    if (!contentToAnalyze.trim()) {
      logger.warn('UaipDocumentAiService: rawContent is empty. Processing with file metadata only.', { processingId });
    }

    // 2️⃣ Build prompt and call Gemini AI
    const systemInstruction = `You are a document intelligence engine for a student growth tracking SaaS.
Your task is to analyze the document content (or metadata if content is empty) and return a valid JSON object.
Do not wrap your response in markdown code blocks or add extra explanation. Return ONLY the JSON object.

The output JSON must strictly follow this schema:
{
  "documentCategory": string (must be one of the ALLOWED_CATEGORIES listed below),
  "confidenceScore": number (a float between 0.0 and 1.0 representing classification confidence),
  "summary": string (a short, human-readable summary of the document contents),
  "extractedEntities": object (key-value dictionary of raw key details found in the document, like dates, names, scores),
  "suggestedModule": string (the canonical module name to store this record, e.g. "AcademicRecord" for marksheets/transcripts, "CertificateRecord" for certificates, "ExperienceRecord" for internship/offer letters, or "None" for timetables/other),
  "candidateFields": object (structured candidate data ready for review matching the suggested module e.g. for Marksheet: { "subjects": [{ "code": string, "name": string, "grade": string, "credits": number }] }, for Certificate: { "title": string, "issuer": string, "date": string })
}

ALLOWED_CATEGORIES:
${SUPPORTED_CATEGORIES.map(c => `- ${c}`).join('\n')}
`;

    const prompt = `Please analyze the following document:
Filename: ${fileName}
MIME Type: ${mimeType}
File Size: ${fileSize} bytes

Document Content:
${contentToAnalyze.slice(0, 50000)} // safety limit for token size
`;

    try {
      logger.info('UaipDocumentAiService: Calling Gemini for document analysis', { processingId });
      const aiResponse = await aiProvider.generateJSON<any>(prompt, {
        systemInstruction,
        temperature: 0.2, // low temperature for high precision/classification
      });

      // 3️⃣ Validate response format
      const validatedResult = this.validateAiResponse(aiResponse);

      // 4️⃣ Update the KnowledgeRecord with AI analysis results
      await KnowledgeRecordModel.updateOne(
        { processingId },
        {
          $set: {
            documentCategory: validatedResult.documentCategory,
            confidenceScore: validatedResult.confidenceScore,
            summary: validatedResult.summary,
            suggestedModule: validatedResult.suggestedModule,
            extractedEntities: validatedResult.extractedEntities,
            candidateFields: validatedResult.candidateFields,
            rawAiOutput: JSON.stringify(aiResponse),
            reviewStatus: 'PENDING_REVIEW',
          },
        }
      );

      logger.info('UaipDocumentAiService: Document processing completed successfully', {
        processingId,
        category: validatedResult.documentCategory,
        confidence: validatedResult.confidenceScore,
      });

      return validatedResult;
    } catch (error: any) {
      logger.error('UaipDocumentAiService: AI document analysis failed', { processingId, error: error.message });
      
      // Fallback state on total failure: category remains UNKNOWN, status PENDING_REVIEW
      await KnowledgeRecordModel.updateOne(
        { processingId },
        {
          $set: {
            rawAiOutput: JSON.stringify({ error: error.message }),
            reviewStatus: 'PENDING_REVIEW',
          },
        }
      );

      throw error;
    }
  }

  /**
   * Validate schema structure and categories.
   */
  private validateAiResponse(response: any): DocumentAiResult {
    if (!response || typeof response !== 'object') {
      throw new Error('AI response is not an object');
    }

    const { documentCategory, confidenceScore, summary, extractedEntities, suggestedModule, candidateFields } = response;

    // Check if category is valid/supported
    if (!documentCategory || !SUPPORTED_CATEGORIES.includes(documentCategory)) {
      throw new Error(`AI returned invalid or missing documentCategory: ${documentCategory}`);
    }

    // Check confidence score
    const confidence = Number(confidenceScore);
    if (Number.isNaN(confidence) || confidence < 0.0 || confidence > 1.0) {
      throw new Error(`AI returned invalid confidenceScore: ${confidenceScore}`);
    }

    return {
      documentCategory: documentCategory as SupportedCategory,
      confidenceScore: confidence,
      summary: typeof summary === 'string' ? summary : '',
      extractedEntities: extractedEntities && typeof extractedEntities === 'object' ? extractedEntities : {},
      suggestedModule: typeof suggestedModule === 'string' ? suggestedModule : 'None',
      candidateFields: candidateFields && typeof candidateFields === 'object' ? candidateFields : {},
    };
  }
}
