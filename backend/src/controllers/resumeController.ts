import { Request, Response } from 'express';
import { sendResponse, sendError } from '../utils/response';
import storageService from '../services/storageService';
import resumeService from '../services/resumeService';
import ResumeTemplate from '../models/ResumeTemplate';
import StudentResume from '../models/StudentResume';
import { Logger } from '../utils/logger';

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

    const organizationId = req.user.organizationId;
    const uploadedBy = req.user.userId;

    let finalBuffer = file.buffer;

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

    // Upload file to Firebase Storage
    const fileUrl = await storageService.uploadResumeTemplate(
      finalBuffer,
      file.originalname,
      organizationId
    );

    // Extract tags from DOCX and generate AI questions
    let questions: any[] = [];
    try {
      const PizZip = (await import('pizzip')).default;
      const zip = new PizZip(finalBuffer);
      const docXml = zip.file('word/document.xml')?.asText() || '';
      
      // Strip XML formatting tags to reconstruct raw text. 
      const cleanText = docXml.replace(/<[^>]+>/g, '');
      const matches = cleanText.match(/\{\{([^}]+)\}\}/g);
      
      if (matches) {
        // Extract raw tag names and remove duplicates
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
      // We don't fail the upload, just proceed with an empty questions array
    }

    // Save metadata to DB
    const template = new ResumeTemplate({
      templateName,
      type,
      target: target || '',
      fileUrl,
      organizationId,
      uploadedBy,
      questions,
    });

    await template.save();

    return sendResponse(res, 201, template, 'Resume template uploaded successfully');
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
    
    // Admin/Faculty can see all templates for the org
    const isAdminOrFaculty = ['FACULTY', 'ADMIN', 'SUPER_ADMIN'].includes(roleName) || req.user.isSuperAdmin;
    
    let query: any = { organizationId };

    if (!isAdminOrFaculty) {
      // Find the user's section to match section-level templates
      // We don't need to look up Section manually if frontend doesn't provide it, 
      // because we solely rely on type 'global' or matching specific frontend inputs.
      const targets: string[] = [];
      if (req.query.target && typeof req.query.target === 'string') {
        targets.push(req.query.target); // Frontend passes specific department or section name like 'CSE' or 'CSE-A'
      }

      // Base query: templates for this org that are 'global', OR matching specific target provided by frontend
      query = {
        organizationId,
        $or: [
          { type: 'global' },
          { target: { $in: targets } }
        ]
      };
    }

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
    const { docxBuffer, htmlPreview } = await resumeService.processResumeTemplate(template.fileUrl, data, tone, enhanceableTags);

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
      studentResumeId: studentResume._id
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
