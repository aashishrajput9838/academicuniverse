import { aiProvider } from '../../core/ai';
import { KnowledgeRecordModel, TargetModuleRecommendation } from '../../models/KnowledgeRecord';
import { Logger } from '../../shared/utils';
import {
  SUPPORTED_CATEGORIES,
  SupportedCategory,
} from './uaipConfig';
import { ModuleRegistry } from './moduleRegistry';

const logger = new Logger('UaipDocumentAiService');

export interface DocumentAiResult {
  documentCategory: SupportedCategory;
  confidenceScore: number; // 0.0 - 1.0
  summary: string;
  extractedEntities: Record<string, any>;
  suggestedModule: string; // legacy label for backward compat
  primaryTargetModule: TargetModuleRecommendation | null;
  secondaryTargetModules: TargetModuleRecommendation[];
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

    // 2️⃣ Build module list for the prompt from dynamic registry
    const moduleList = ModuleRegistry.getInstance().getAll()
      .map(m => `- id: "${m.moduleId}", name: "${m.moduleName}"`)
      .join('\n');

    // 3️⃣ Build prompt and call Gemini AI
    const systemInstruction = `You are a document intelligence engine for a student growth tracking SaaS called Academic Universe.
Your task is to analyze the document content (or metadata if content is empty) and return a valid JSON object.
Do not wrap your response in markdown code blocks or add extra explanation. Return ONLY the JSON object.

The output JSON must strictly follow this schema:
{
  "documentCategory": string (must be one of the ALLOWED_CATEGORIES listed below),
  "confidenceScore": number (a float between 0.0 and 1.0 representing classification confidence),
  "summary": string (a short, human-readable summary of the document contents),
  "extractedEntities": object (key-value dictionary of raw key details found in the document, e.g. dates, names, scores, courses, instructors, timeSlots, rooms, etc. For MARKSHEET/TRANSCRIPT also include: semester, term, academicYear, gpa, cgpa, totalCredits, studentName, rollNumber, branch, batch, institution, and academicStatistics here so the Review UI can display them.),
  "suggestedModule": string (legacy field - the canonical data model name like "AcademicRecord", "CertificateRecord", "ExperienceRecord", or "None"),
  "primaryTargetModule": {
    "id": string (must be one of the ALLOWED_MODULE_IDS listed below),
    "name": string (human-readable module name),
    "confidence": number (float 0.0 - 1.0),
    "reason": string (one sentence explaining why this module is the best destination for this document)
  },
  "secondaryTargetModules": [
    {
      "id": string (must be one of the ALLOWED_MODULE_IDS listed below),
      "name": string,
      "confidence": number
    }
  ],
  "candidateFields": object (structured candidate data matching the document category. For ACADEMIC_TIMETABLE: { "schedule": [{ "date": string, "events": [{ "timeSlot": string, "courseCode": string, "courseName": string, "room": string, "instructor": string }] }] }. For MARKSHEET/TRANSCRIPT: { "subjects": [{ "code": string, "name": string, "credits": number, "gradingStatus": string, "grade": string, "gradePoints": number, "semester": string, "term": string, "year": number }], "gpa": number, "totalCredits": number, "academicStatistics": { "subjectsAppeared": number, "subjectsPassed": number, "subjectsFailed": number, "totalMarksObtained": number, "maximumMarks": number, "percentage": number } }. For CERTIFICATE: { "title": string, "issuer": string, "date": string }. For RESUME: { "skills": string[], "education": object[], "experience": object[], "projects": object[] }. For INTERNSHIP/OFFER_LETTER: { "company": string, "role": string, "startDate": string, "endDate": string, "stipend": string }. For other types: use best judgment to structure the data meaningfully.)
}

IMPORTANT RULES:
- "primaryTargetModule" is mandatory. Always pick the best matching module from ALLOWED_MODULE_IDS.
- "secondaryTargetModules" is optional (max 2). Only include if there is a strong secondary use case.
- These recommendations are AI suggestions only. No actual module data will be written. A human must approve.
- Extract as much structured data as possible into "candidateFields". Do not leave it empty.

ALLOWED_CATEGORIES:
${SUPPORTED_CATEGORIES.map(c => `- ${c}`).join('\n')}

ALLOWED_MODULE_IDS (pick from these only):
${moduleList}
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
        maxTokens: 8192,
      });

      // 4️⃣ Validate response format
      const validatedResult = this.validateAiResponse(aiResponse);

      // Determine routing decision
      const { ModuleRoutingEngine } = require('./routingEngine');
      const routingDecision = await ModuleRoutingEngine.determineRouting({
        processingId,
        rawContent: contentToAnalyze,
        extractedEntities: validatedResult.extractedEntities,
        candidateFields: validatedResult.candidateFields,
      });

      const routingStatus = (routingDecision.primaryModule && routingDecision.routingConfidence > 0) ? 'ROUTED' : 'UNKNOWN';

      // 5️⃣ Update the KnowledgeRecord with AI analysis results
      await KnowledgeRecordModel.updateOne(
        { processingId },
        {
          $set: {
            documentCategory: validatedResult.documentCategory,
            confidenceScore: validatedResult.confidenceScore,
            summary: validatedResult.summary,
            suggestedModule: validatedResult.suggestedModule,
            primaryTargetModule: validatedResult.primaryTargetModule,
            secondaryTargetModules: validatedResult.secondaryTargetModules,
            extractedEntities: validatedResult.extractedEntities,
            candidateFields: validatedResult.candidateFields,
            rawAiOutput: JSON.stringify(aiResponse),
            routingDecision,
            routingStatus,
            reviewStatus: 'PENDING_REVIEW',
          },
        }
      );

      logger.info('UaipDocumentAiService: Document processing completed successfully', {
        processingId,
        category: validatedResult.documentCategory,
        confidence: validatedResult.confidenceScore,
        primaryTargetModule: validatedResult.primaryTargetModule?.id,
      });

      return validatedResult;
    } catch (error: any) {
      logger.error('UaipDocumentAiService: AI document analysis failed', { processingId, error: error.message });

      // Fallback state on total failure
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
   * Validate schema structure, categories, and module recommendations.
   */
  private validateAiResponse(response: any): DocumentAiResult {
    if (!response || typeof response !== 'object') {
      throw new Error('AI response is not an object');
    }

    const {
      documentCategory,
      confidenceScore,
      summary,
      extractedEntities,
      suggestedModule,
      primaryTargetModule,
      secondaryTargetModules,
      candidateFields,
    } = response;

    // Check if category is valid/supported
    if (!documentCategory || !SUPPORTED_CATEGORIES.includes(documentCategory)) {
      throw new Error(`AI returned invalid or missing documentCategory: ${documentCategory}`);
    }

    // Check confidence score
    const confidence = Number(confidenceScore);
    if (Number.isNaN(confidence) || confidence < 0.0 || confidence > 1.0) {
      throw new Error(`AI returned invalid confidenceScore: ${confidenceScore}`);
    }

    // Validate primaryTargetModule
    const allowedIds = ModuleRegistry.getInstance().getAll().map(m => m.moduleId);
    let validatedPrimary: TargetModuleRecommendation | null = null;
    if (primaryTargetModule && typeof primaryTargetModule === 'object' && primaryTargetModule.id) {
      if (allowedIds.includes(primaryTargetModule.id)) {
        validatedPrimary = {
          id: primaryTargetModule.id,
          name: typeof primaryTargetModule.name === 'string' ? primaryTargetModule.name : primaryTargetModule.id,
          confidence: typeof primaryTargetModule.confidence === 'number' ? primaryTargetModule.confidence : confidence,
          reason: typeof primaryTargetModule.reason === 'string' ? primaryTargetModule.reason : undefined,
        };
      }
    }

    // Validate secondaryTargetModules
    const validatedSecondary: TargetModuleRecommendation[] = [];
    if (Array.isArray(secondaryTargetModules)) {
      for (const sec of secondaryTargetModules) {
        if (sec && typeof sec === 'object' && sec.id && allowedIds.includes(sec.id)) {
          validatedSecondary.push({
            id: sec.id,
            name: typeof sec.name === 'string' ? sec.name : sec.id,
            confidence: typeof sec.confidence === 'number' ? sec.confidence : 0,
          });
        }
      }
    }

    // Validate MARKSHEET/TRANSCRIPT extraction completeness
    if ((documentCategory === 'MARKSHEET' || documentCategory === 'TRANSCRIPT')) {
      const subjects = candidateFields?.subjects;
      if (!Array.isArray(subjects) || subjects.length === 0) {
        throw new Error(`AI extraction failure for ${documentCategory}: subjects array is empty or missing. Document requires at least one subject row.`);
      }
    }

    return {
      documentCategory: documentCategory as SupportedCategory,
      confidenceScore: confidence,
      summary: typeof summary === 'string' ? summary : '',
      extractedEntities: extractedEntities && typeof extractedEntities === 'object' ? extractedEntities : {},
      suggestedModule: typeof suggestedModule === 'string' ? suggestedModule : 'None',
      primaryTargetModule: validatedPrimary,
      secondaryTargetModules: validatedSecondary,
      candidateFields: candidateFields && typeof candidateFields === 'object' ? candidateFields : {},
    };
  }
}
