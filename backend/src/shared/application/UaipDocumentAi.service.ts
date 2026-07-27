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
    logger.info(`UaipDocumentAiService: rawContent length: ${contentToAnalyze.length}`, { processingId });
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

EXTRACTION RULES (CRITICAL):
- Extract EXACT values as they appear in the document. Do not infer, guess, correct, or normalize values.
- If a value is unclear or missing, use null or empty string. Never hallucinate or substitute a similar-looking value.
- For numeric fields (credits, gradePoints, totalCredits, gpa, cgpa, percentage, etc.), preserve the exact number from the document.
- Distinguish carefully between document-level totals and per-subject values:
  * "totalCredits" = sum of all subject credits at the DOCUMENT level.
  * "subjects[].credits" = credits for THAT SPECIFIC SUBJECT ONLY.
  * Do NOT copy the document-level totalCredits into a subject's credits field.
  * Do NOT copy a subject's credits into totalCredits.
- CRITICAL: For MARKSHEET/TRANSCRIPT documents, distinguish between three DIFFERENT concepts:
  * "academicYear" = the calendar year of the academic session (e.g. 2023, 2024)
  * "term" = the term/session WITHIN that year (e.g. "Term 1", "Term 2")
  * "semester" = the OVERALL degree semester number (e.g. 1, 2, 3, 4) ONLY if explicitly stated in the document
  * DO NOT map "Term 1" or "Term 2" into the "semester" field. These are TERMS, not semesters.
  * DO NOT calculate or invent a semester number. Only extract it if the document explicitly states it.
  * If the document does not explicitly state the overall semester number, leave "semester" empty/null.

The output JSON must strictly follow this schema:
{
  "documentCategory": string (must be one of the ALLOWED_CATEGORIES listed below),
  "confidenceScore": number (a float between 0.0 and 1.0 representing classification confidence),
  "summary": string (a short, human-readable summary of the document contents),
  "extractedEntities": object (key-value dictionary of raw key details found in the document, e.g. dates, names, scores, courses, instructors, timeSlots, rooms, etc. For MARKSHEET/TRANSCRIPT also include: term, academicYear, gpa, cgpa, totalCredits, studentName, rollNumber, branch, batch, institution, and academicStatistics here so the Review UI can display them.),
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
  "candidateFields": object (structured candidate data matching the document category. For ACADEMIC_TIMETABLE: { "schedule": [{ "date": string, "events": [{ "timeSlot": string, "courseCode": string, "courseName": string, "room": string, "instructor": string }] }] }. For MARKSHEET/TRANSCRIPT: { "subjects": [{ "code": string, "name": string, "credits": number, "gradingStatus": string, "grade": string, "gradePoints": number, "term": string, "academicYear": number }], "gpa": number, "totalCredits": number }. NOTE: semesterNumber is a BUSINESS-DERIVED value, not an extracted value. Do NOT include semesterNumber in candidateFields. It will be computed during canonical write from the student's admission year + academicYear + term. For CERTIFICATE: { "certificateTitle": string, "title": string, "candidateName": string, "issuer": string, "issuingOrganization": string, "workshopName": string, "courseName": string, "description": string, "issueDate": string, "expiryDate": string, "credentialId": string, "instructor": string, "signatories": string[] }. For RESUME: { "skills": string[], "education": object[], "experience": object[], "projects": object[] }. For INTERNSHIP/OFFER_LETTER: { "company": string, "role": string, "startDate": string, "endDate": string, "stipend": string }. For other types: use best judgment to structure the data meaningfully.)
}

GRADE VALIDATION RULES (CRITICAL - APPLY TO MARKSHEET/TRANSCRIPT ONLY):
- Allowed grades: O, A+, A, B+, B, C, P, F, Qualified, Audit
- Never guess a grade. If the OCR text is ambiguous between two grades (especially O vs C), use the following disambiguation strategy:
  1. Check gradePoints: O typically maps to 10, C typically maps to 5 or lower. If gradePoints is 10 or接近 10, the grade is O. If gradePoints is 5 or lower, the grade is C.
  2. Check credits and adjacent subject rows: look at the pattern of grades in nearby rows. If most grades are high (A+, A, O), an ambiguous grade is more likely O. If most grades are low (C, P, F), it is more likely C.
  3. Check university grading pattern: Sharda University and most Indian universities use O=Outstanding (10), A+=9, A=8, B+=7, B=6, C=5, P=Pass, F=Fail. If the gradePoints field clearly shows 15.000 for 1.5 credits, that is O (15/1.5 = 10 points per credit). If gradePoints is around 7.5 for 1.5 credits, that is C (5 points per credit).
  4. When in doubt, prefer the grade that makes gradePoints consistent with the standard formula: gradePoints = credits × gradePointPerCredit.
- gradingStatus must be one of: "Graded", "Audit", "Pass", "Fail", "In Progress", "Qualified"
- gradePoints must be a number consistent with credits and grade (gradePoints = credits × gradePointValue).

IMPORTANT RULES:
- "primaryTargetModule" is mandatory. Always pick the best matching module from ALLOWED_MODULE_IDS.
- "secondaryTargetModules" is optional (max 2). Only include if there is a strong secondary use case.
- These recommendations are AI suggestions only. No actual module data will be written. A human must approve.
- Extract as much structured data as possible into "candidateFields". Do not leave it empty.
- For MARKSHEET/TRANSCRIPT, include ALL subjects visible in the document. Do not truncate the subjects array.
- academicStatistics must be populated when visible in the document. If not visible, omit it.

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

      // TEMP: Instrument raw AI response subject count
      const rawSubjects = Array.isArray((aiResponse as any)?.candidateFields?.subjects)
        ? (aiResponse as any).candidateFields.subjects.length
        : -1;
      logger.info('UaipDocumentAiService: raw AI response subject count', {
        processingId,
        rawSubjects,
        rawCandidateFieldsKeys: aiResponse?.candidateFields ? Object.keys(aiResponse.candidateFields) : [],
      });

      // 4️⃣ Validate response format
      const validatedResult = this.validateAiResponse(aiResponse);

      // TEMP: Instrument validated result subject count
      const validatedSubjects = Array.isArray(validatedResult?.candidateFields?.subjects)
        ? validatedResult.candidateFields.subjects.length
        : -1;
      logger.info('UaipDocumentAiService: validated result subject count', {
        processingId,
        validatedSubjects,
      });

      // Determine routing decision
      const { ModuleRoutingEngine } = require('./routingEngine');
      const routingDecision = await ModuleRoutingEngine.determineRouting({
        processingId,
        rawContent: contentToAnalyze,
        extractedEntities: validatedResult.extractedEntities,
        candidateFields: validatedResult.candidateFields,
      });

      const routingStatus = (routingDecision.primaryModule && routingDecision.routingConfidence > 0) ? 'ROUTED' : 'UNKNOWN';

      // TEMP: Instrument subject count before persistence
      const persistSubjects = Array.isArray(validatedResult?.candidateFields?.subjects)
        ? validatedResult.candidateFields.subjects.length
        : -1;
      logger.info('UaipDocumentAiService: subject count before persistence', {
        processingId,
        persistSubjects,
      });

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

    // Validate MARKSHEET/TRANSCRIPT extraction completeness and grade values
    if ((documentCategory === 'MARKSHEET' || documentCategory === 'TRANSCRIPT')) {
      const subjects = candidateFields?.subjects;
      if (!Array.isArray(subjects) || subjects.length === 0) {
        throw new Error(`AI extraction failure for ${documentCategory}: subjects array is empty or missing. Document requires at least one subject row.`);
      }

      const ALLOWED_GRADES = new Set(['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'F', 'Qualified', 'Audit']);
      const ALLOWED_GRADING_STATUS = new Set(['Graded', 'Audit', 'Pass', 'Fail', 'In Progress', 'Qualified']);

      for (const sub of subjects) {
        if (sub && typeof sub === 'object') {
          const grade = String(sub.grade || '').trim();
          if (grade && !ALLOWED_GRADES.has(grade)) {
            logger.warn(`UaipDocumentAiService: Invalid grade "${grade}" for subject "${sub.name}". Allowed: ${[...ALLOWED_GRADES].join(', ')}`);
          }
          const gradingStatus = String(sub.gradingStatus || '').trim();
          if (gradingStatus && !ALLOWED_GRADING_STATUS.has(gradingStatus)) {
            logger.warn(`UaipDocumentAiService: Invalid gradingStatus "${gradingStatus}" for subject "${sub.name}". Allowed: ${[...ALLOWED_GRADING_STATUS].join(', ')}`);
          }
        }
      }
    }

    // Validate & Guarantee CERTIFICATE extraction completeness
    let finalCandidateFields = candidateFields && typeof candidateFields === 'object' ? { ...candidateFields } : {};
    let finalExtractedEntities = extractedEntities && typeof extractedEntities === 'object' ? { ...extractedEntities } : {};

    if (documentCategory === 'CERTIFICATE') {
      const title = finalCandidateFields.certificateTitle || finalCandidateFields.title || finalCandidateFields.courseName || finalCandidateFields.workshopName || finalExtractedEntities.certificateTitle || finalExtractedEntities.title || finalExtractedEntities.courseName || finalExtractedEntities.workshopName || 'Professional Course Certificate';
      const candidateName = finalCandidateFields.candidateName || finalCandidateFields.studentName || finalCandidateFields.name || finalExtractedEntities.candidateName || finalExtractedEntities.studentName || finalExtractedEntities.name || '';
      const issuer = finalCandidateFields.issuer || finalCandidateFields.issuingOrganization || finalCandidateFields.organization || finalExtractedEntities.issuer || finalExtractedEntities.issuingOrganization || finalExtractedEntities.organization || 'Issuing Authority';
      const issuingOrganization = finalCandidateFields.issuingOrganization || finalCandidateFields.issuer || finalExtractedEntities.issuingOrganization || finalExtractedEntities.issuer || issuer;

      finalCandidateFields.certificateTitle = title;
      finalCandidateFields.title = title;
      finalCandidateFields.candidateName = candidateName;
      finalCandidateFields.issuer = issuer;
      finalCandidateFields.issuingOrganization = issuingOrganization;

      if (finalCandidateFields.workshopName || finalExtractedEntities.workshopName) finalCandidateFields.workshopName = finalCandidateFields.workshopName || finalExtractedEntities.workshopName;
      if (finalCandidateFields.courseName || finalExtractedEntities.courseName) finalCandidateFields.courseName = finalCandidateFields.courseName || finalExtractedEntities.courseName || title;
      if (finalCandidateFields.description || finalExtractedEntities.description || summary) finalCandidateFields.description = finalCandidateFields.description || finalExtractedEntities.description || summary || '';
      if (finalCandidateFields.issueDate || finalCandidateFields.date || finalCandidateFields.issuedDate || finalExtractedEntities.issueDate) finalCandidateFields.issueDate = finalCandidateFields.issueDate || finalCandidateFields.date || finalCandidateFields.issuedDate || finalExtractedEntities.issueDate || '';
      if (finalCandidateFields.expiryDate || finalExtractedEntities.expiryDate) finalCandidateFields.expiryDate = finalCandidateFields.expiryDate || finalExtractedEntities.expiryDate || '';
      if (finalCandidateFields.credentialId || finalCandidateFields.certificateId || finalExtractedEntities.credentialId) finalCandidateFields.credentialId = finalCandidateFields.credentialId || finalCandidateFields.certificateId || finalExtractedEntities.credentialId || '';
      if (finalCandidateFields.instructor || finalExtractedEntities.instructor) finalCandidateFields.instructor = finalCandidateFields.instructor || finalExtractedEntities.instructor || '';
      if (finalCandidateFields.signatories || finalExtractedEntities.signatories) finalCandidateFields.signatories = finalCandidateFields.signatories || finalExtractedEntities.signatories || '';

      // Sync into extractedEntities so Entities tab is also fully populated
      finalExtractedEntities.certificateTitle = title;
      finalExtractedEntities.candidateName = candidateName;
      finalExtractedEntities.issuer = issuer;
      if (finalCandidateFields.issueDate) finalExtractedEntities.issueDate = finalCandidateFields.issueDate;
      if (finalCandidateFields.credentialId) finalExtractedEntities.credentialId = finalCandidateFields.credentialId;
    }

    return {
      documentCategory: documentCategory as SupportedCategory,
      confidenceScore: confidence,
      summary: typeof summary === 'string' ? summary : '',
      extractedEntities: finalExtractedEntities,
      suggestedModule: typeof suggestedModule === 'string' ? suggestedModule : 'None',
      primaryTargetModule: validatedPrimary,
      secondaryTargetModules: validatedSecondary,
      candidateFields: finalCandidateFields,
    };
  }
}
