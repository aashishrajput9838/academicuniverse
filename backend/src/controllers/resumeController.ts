import { Request, Response } from 'express';
import { sendResponse, sendError } from '../utils/response';
import storageService from '../services/storageService';
import resumeService from '../services/resumeService';
import { TemplateProcessingOrchestrator } from '../services/templateProcessingOrchestrator.service';
import { ResumeGenerationOrchestrator } from '../services/resumeGenerationOrchestrator.service';
import { PlaceholderValidator } from '../services/placeholderValidator.service';
import { DEPRECATED_PLACEHOLDERS, RESUME_PLACEHOLDERS } from '../config/resumePlaceholders';
import axios from 'axios';
import ResumeTemplate from '../models/ResumeTemplate';
import StudentResume from '../models/StudentResume';
import { Logger } from '../utils/logger';

const DEPARTMENT_ALIASES: Record<string, string[]> = {
  'Computer Science and Engineering': ['CSE', 'CS', 'Computer Science'],
  'Information Technology': ['IT', 'Information Tech'],
  'Electronics and Communication Engineering': ['ECE', 'Electronics'],
  'Mechanical Engineering': ['ME', 'Mechanical'],
  'Civil Engineering': ['CE', 'Civil'],
  'Electrical and Electronics Engineering': ['EEE', 'Electrical'],
  'VLSI Design and Technology': ['VLSI'],
  'Artificial Intelligence and Machine Learning': ['AIML', 'AI ML'],
  'Computer Science': ['CSE', 'CS'],
};

const logger = new Logger('resumeController');

/**
 * Upload a new resume template (.docx)
 */
export const uploadTemplateController = async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    // Role check - Only let faculty or admins upload templates
    const { default: Role } = await import('../models/Role');
    const role = await Role.findById(req.user.roleId);
    const roleName = role?.name || '';

    const allowedRoles = ['FACULTY', 'ADMIN', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(roleName) && !req.user.isSuperAdmin) {
      return sendError(res, 403, 'You do not have permission to upload resume templates.');
    }

    const file = req.file;
    if (!file) {
      return sendError(res, 400, 'No template file provided.');
    }

    const { templateName, type, target, mappings } = req.body;
    if (!templateName || !type) {
      return sendError(res, 400, 'Template name and type are required.');
    }

    if (type !== 'global' && !target) {
      return sendError(res, 400, 'Target is required for department and section types.');
    }

    const organizationId = req.user.organizationId;
    const uploadedBy = req.user.userId;

    const validator = new PlaceholderValidator();
    let validationReport;
    try {
      validationReport = await validator.validate(file.buffer);
    } catch (validationError: any) {
      logger.error('Placeholder validation failed:', validationError);
      return sendError(res, 500, 'Failed to validate template');
    }

    const hasDeprecated = validationReport.summary.deprecated.length > 0;

    if (!validationReport.valid && !hasDeprecated) {
      return sendResponse(res, 400, {
        success: false,
        data: validationReport,
      }, 'Template validation failed');
    }

    let finalBuffer = file.buffer;

    /* DISABLED FOR MVP
    // Apply interactive mappings if provided (from Interactive Editor)
    if (mappings) {
      try {
        const parsedMappings = JSON.parse(mappings);
        if (parsedMappings.length > 0) {
          logger.info(`Applying ${parsedMappings.length} interactive mappings to DOCX XML`);
          const PizZip = (await import('pizzip')).default;
          const zip = new PizZip(finalBuffer);
          let docXml = zip.file('word/document.xml')?.asText() || '';
          
          for (const m of parsedMappings) {
             const escapedFind = m.originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
             docXml = docXml.replace(new RegExp(escapedFind, 'g'), `{{${m.tag}}}`);
          }
          zip.file('word/document.xml', docXml);
          finalBuffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
        }
      } catch (err) {
        logger.error('Error rewriting XML with mappings:', err);
      }
    }
    */

    // Upload file to Firebase Storage
    const fileUrl = await storageService.uploadResumeTemplate(
      finalBuffer,
      file.originalname,
      organizationId
    );

    // Extract tags from DOCX and generate AI questions
    let questions: any[] = [];
    
    /* DISABLED FOR MVP
    try {
      const PizZip = (await import('pizzip')).default;
      const zip = new PizZip(finalBuffer);
      const docXml = zip.file('word/document.xml')?.asText() || '';
      
      // Strip XML formatting tags to reconstruct raw text. 
      const cleanText = docXml.replace(/<[^>]+>/g, '');
      const matches = cleanText.match(/\{\{([^}]+)\}\}/g);
      
      if (matches) {
        const rawTags = matches.map((m: string) => m.replace(/\{\{|\}\}/g, '').trim());
        const uniqueTags = [...new Set(rawTags)];
        
        if (uniqueTags.length > 0) {
           logger.info(`Found ${uniqueTags.length} unique tags in uploaded template: ${uniqueTags.join(', ')}`);
           const { default: aiService } = await import('../services/aiService');
           questions = await aiService.generateTemplateQuestions(uniqueTags);
        }
      } else {
        logger.warn('No {{tags}} found in the uploaded document.');
      }
    } catch (tagError: any) {
      logger.error('Failed to extract tags or generate AI questions:', tagError);
    }
    */

    // Save metadata to DB
    const template = new ResumeTemplate({
      templateName,
      type,
      target: target || '',
      fileUrl,
      organizationId,
      uploadedBy,
      questions,
      processingMode: 'placeholder-first',
      validationStatus: hasDeprecated ? 'warning' : 'valid',
      validationReport: validationReport,
    });

    await template.save();

    const responseData = {
      templateName,
      type,
      target: target || '',
      fileUrl,
      organizationId,
      uploadedBy,
      questions,
      processingMode: 'placeholder-first',
      validationStatus: 'valid',
      validationReport,
    };

    return sendResponse(res, 201, responseData, 'Resume template uploaded successfully');
  } catch (error: any) {
    logger.error('Error uploading template:', error);
    return sendError(res, 500, error.message || 'Failed to upload template');
  }
};

/**
 * Get available templates for a student based on their org/section/dept
 */
export const getAvailableTemplatesController = async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    const organizationId = req.user.organizationId;
    
    const { default: Role } = await import('../models/Role');
    const role = await Role.findById(req.user.roleId);
    const roleName = role?.name || '';

    logger.info("Resume Template Debug");
    logger.info(
      JSON.stringify({
        userId: req.user.userId,
        organizationId,
        roleName
      })
    );
    
    // Admin/Faculty can see all templates for the org
    const isAdminOrFaculty = ['FACULTY', 'ADMIN', 'SUPER_ADMIN'].includes(roleName) || req.user.isSuperAdmin;
    
    let query: any = { organizationId };

    if (!isAdminOrFaculty) {
      const targets: string[] = [];
      if (req.query.target && typeof req.query.target === 'string') {
        targets.push(req.query.target.trim());
      }

      if (targets.length === 0) {
        try {
          const { EzoneAcademicProfile } = await import('../models/EzoneAcademicProfile');
          const profile = await EzoneAcademicProfile.findOne({
            userId: req.user.userId,
            organizationId,
          });

          logger.info("Resolved profile:", profile);
          logger.info("Resolved department:", profile?.department);

          if (profile?.department) {
            const dept = profile.department.trim();
            const aliases = DEPARTMENT_ALIASES[dept] || [];
            targets.push(dept, ...aliases);
          } else {
            logger.warn(`No department found in EzoneAcademicProfile for user ${req.user.userId}; falling back to global templates only`);
          }
        } catch (profileError) {
          logger.warn(`Failed to load EzoneAcademicProfile for user ${req.user.userId}:`, profileError);
        }

        logger.info("Targets: " + JSON.stringify(targets));
      }

      const targetPatterns = targets.map(t => {
        const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`^${escaped}$`, 'i');
      });

      query = {
        organizationId,
        $or: [
          { type: 'global' },
          { target: { $in: targetPatterns } }
        ]
      };
    }

    logger.info("Final Mongo query:", JSON.stringify(query, null, 2));

    const departmentTemplatesInDb = await ResumeTemplate.find({
      organizationId,
      type: "department"
    }).select("templateName target");
    logger.info("Department templates in DB:", departmentTemplatesInDb);

    const templates = await ResumeTemplate.find(query).sort({ createdAt: -1 }).populate('uploadedBy', 'name email');
    return sendResponse(res, 200, templates, 'Templates retrieved successfully');
  } catch (error: any) {
    logger.error('Error fetching templates:', error);
    return sendError(res, 500, 'Failed to fetch templates');
  }
};

/**
 * Process a resume template with student data
 */
export const processResumeController = async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    const { templateId, data, tone } = req.body;
    
    if (!templateId || !data) {
      return sendError(res, 400, 'Template ID and resume data are required.');
    }

    const template = await ResumeTemplate.findById(templateId);
    if (!template) {
      return sendError(res, 404, 'Resume template not found.');
    }

    // Extract tags that AI is allowed to rewrite
    const enhanceableTags = template.questions
      ? template.questions.filter((q: any) => q.aiEnhanceable).map((q: any) => q.tag)
      : [];

    // Process using ResumeService
    const { docxBuffer, htmlPreview, knownLimitations } = await resumeService.processResumeTemplate(template.fileUrl, data, tone, enhanceableTags);

    // Save draft in DB
    const studentResume = await StudentResume.findOneAndUpdate(
      { userId: req.user.userId, templateId },
      { 
        filledData: data,
      },
      { new: true, upsert: true }
    );

    // Return the generated HTML preview and Base64 of the DOCX
    // Using Base64 allows frontend to easily trigger a download
    const docxBase64 = docxBuffer.toString('base64');
    
    return sendResponse(res, 200, {
      htmlPreview,
      docxBase64,
      studentResumeId: studentResume._id,
      knownLimitations,
    }, 'Resume generated successfully');
    
  } catch (error: any) {
    logger.error('Error generating resume:', error);
    return sendError(res, 500, error.message || 'Failed to generate resume');
  }
};

/**
 * Get previously saved draft
 */
export const getSavedResumeController = async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    const { templateId } = req.query;
    if (!templateId) {
      return sendError(res, 400, 'Template ID is required.');
    }

    const studentResume = await StudentResume.findOne({
      userId: req.user.userId,
      templateId
    });

    return sendResponse(res, 200, studentResume ? studentResume.filledData : null, 'Draft retrieved successfully');
  } catch (error: any) {
    logger.error('Error fetching resume draft:', error);
    return sendError(res, 500, 'Failed to fetch resume draft');
  }
};

/**
 * Save resume draft data without generating DOCX or preview
 */
export const saveDraftController = async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    const { templateId, data } = req.body;
    if (!templateId || data == null) {
      return sendError(res, 400, 'Template ID and data are required.');
    }

    const studentResume = await StudentResume.findOneAndUpdate(
      { userId: req.user.userId, templateId },
      { filledData: data },
      { new: true, upsert: true }
    );

    return sendResponse(res, 200, {
      studentResumeId: studentResume._id,
      updatedAt: studentResume.updatedAt,
    }, 'Draft saved successfully');
  } catch (error: any) {
    logger.error('Error saving resume draft:', error);
    return sendError(res, 500, 'Failed to save draft');
  }
};

/**
 * Process a raw template: extract structure, inject placeholders, generate processed DOCX
 */
export const processTemplateController = async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    const { templateId } = req.body;
    if (!templateId) {
      return sendError(res, 400, 'Template ID is required.');
    }

    const template = await ResumeTemplate.findById(templateId);
    if (!template) {
      return sendError(res, 404, 'Resume template not found.');
    }

    const organizationId = req.user.organizationId;

    const orchestrator = new TemplateProcessingOrchestrator({
      enableAiAssistance: false,
    });

    let originalBuffer: Buffer;
    try {
      const response = await axios.get(template.fileUrl, { responseType: 'arraybuffer' });
      originalBuffer = Buffer.from(response.data);
    } catch (error: any) {
      return sendError(res, 500, `Failed to download template: ${error.message}`);
    }

    const result = await orchestrator.process(originalBuffer);

    if (!result.success) {
      return sendError(res, 500, `Template processing failed: ${result.issues.join(', ')}`);
    }

    const timestamp = Date.now();
    const safeName = `processed_${timestamp}_template.docx`;
    const processedFileUrl = await storageService.uploadResumeTemplate(
      result.processedBuffer,
      safeName,
      organizationId
    );

    // Build a lookup map for canonical placeholder section assignments
    const placeholderSectionMap = new Map<string, string>();
    for (const p of RESUME_PLACEHOLDERS) {
      placeholderSectionMap.set(p.key.toLowerCase(), p.section);
    }

    const questions = result.milestone2Result.sections.flatMap((section: any) =>
      section.fields.map((field: any) => ({
        tag: field.key,
        question: field.label,
        type: field.type === 'textarea' ? 'textarea' : 'text',
        aiEnhanceable: field.aiEnhanceable || false,
        section: placeholderSectionMap.get(field.key.toLowerCase()) || 'other',
      }))
    );

    const updatePayload: any = {
      fileUrl: processedFileUrl,
      originalFileUrl: template.fileUrl,
      sections: result.milestone2Result.sections.map((section: any) => ({
        id: section.id,
        title: section.title,
        order: section.order,
        repeatable: section.repeatable,
        maxEntries: section.maxEntries,
        minEntries: section.minEntries,
        fields: section.fields.map((field: any) => ({
          key: field.key,
          label: field.label,
          type: field.type,
          required: field.required,
          aiEnhanceable: field.aiEnhanceable,
          placeholder: field.placeholder,
          validation: field.validation,
          options: field.options,
        })),
        aiPrompt: section.aiPrompt,
      })),
      questions,
      formattingMetadata: result.milestone2Result.formattingMetadata,
      confidence: result.milestone2Result.confidence,
    };

    const updatedTemplate = await ResumeTemplate.findByIdAndUpdate(
      templateId,
      { $set: updatePayload },
      { new: true }
    );

    return sendResponse(res, 200, {
      originalFileUrl: updatedTemplate.originalFileUrl,
      processedFileUrl: updatedTemplate.fileUrl,
      sections: updatedTemplate.sections,
      questions: updatedTemplate.questions,
      confidence: updatedTemplate.confidence,
      placeholdersInjected: result.injectionResult.placeholdersInjected,
      extractionIssues: result.milestone2Result.extractionIssues,
    }, 'Template processed successfully');
  } catch (error: any) {
    logger.error('Error processing template:', error);
    return sendError(res, 500, error.message || 'Failed to process template');
  }
};

/**
 * Generate a filled resume from a processed template and student data
 */
export const generateResumeController = async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    const { processedTemplateBuffer, studentData } = req.body;
    
    if (!processedTemplateBuffer || !studentData) {
      return sendError(res, 400, 'Processed template buffer and student data are required.');
    }

    const orchestrator = new ResumeGenerationOrchestrator({
      enableAiAssistance: false,
    });

    const templateBuffer = Buffer.from(processedTemplateBuffer, 'base64');
    const result = await orchestrator.generate(templateBuffer, studentData);

    if (!result.success) {
      return sendError(res, 500, `Resume generation failed: ${result.issues.join(', ')}`);
    }

    const docxBase64 = result.docxBuffer.toString('base64');

    return sendResponse(res, 200, {
      docxBase64,
      htmlPreview: result.htmlPreview,
      validation: result.validationResult,
    }, 'Resume generated successfully');
  } catch (error: any) {
    logger.error('Error generating resume:', error);
    return sendError(res, 500, error.message || 'Failed to generate resume');
  }
};

export const validateTemplateController = async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    const file = req.file;
    if (!file) {
      return sendError(res, 400, 'No template file provided.');
    }

    const acceptedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
    ];

    const isDocx =
      acceptedTypes.includes(file.mimetype) ||
      (file.originalname && file.originalname.toLowerCase().endsWith('.docx'));

    if (!isDocx) {
      return sendError(res, 400, 'Invalid file type. Only DOCX files are supported.');
    }

    const validator = new PlaceholderValidator();
    const report = await validator.validate(file.buffer);

    return sendResponse(res, 200, {
      success: report.valid,
      data: report,
    }, report.valid ? 'Template validated successfully' : 'Template validation failed');
  } catch (error: any) {
    logger.error('Error validating template:', error);
    return sendError(res, 500, error.message || 'Failed to validate template');
  }
};
