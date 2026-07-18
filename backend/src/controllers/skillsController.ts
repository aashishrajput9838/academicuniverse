import { Response } from 'express';
import { sendResponse, sendError } from '../utils/response';
import { PersonResolver } from '../shared/services/personResolver.service';
import { SkillProjectionService } from '../shared/services/skillProjection.service';
import { SkillEvidenceService } from '../shared/services/skillEvidence.service';
import { SubjectSkillMappingService } from '../shared/services/subjectSkillMapping.service';
import { SkillRecordRepository } from '../shared/repositories/skillRecord.repository';
import { SkillEvidenceRepository } from '../shared/repositories/skillEvidence.repository';
import { logger } from '../utils/logger';
import {
  SkillRecordDTO,
  SkillEvidenceDTO,
  SkillProfileResponse,
  SkillSummaryResponse,
  SubjectMappingDTO,
  CreateMappingRequest,
} from '../shared/dtos/skills.dto';
import { SkillCategory } from '../shared/enums/skills.enum';
import { toObjectId } from '../utils/mongooseHelpers';

const skillProjectionService = new SkillProjectionService();
const evidenceService = new SkillEvidenceService();
const mappingService = new SubjectSkillMappingService();
const skillRecordRepo = new SkillRecordRepository();
const evidenceRepo = new SkillEvidenceRepository();

function toSkillRecordDTO(record: any): SkillRecordDTO {
  return {
    id: record._id.toString(),
    skillId: record.skillId,
    skillName: record.skillName,
    aliases: record.aliases || [],
    skillCategory: record.skillCategory,
    skillSubcategory: record.skillSubcategory,
    proficiencyLevel: record.proficiencyLevel,
    proficiencyScore: record.proficiencyScore,
    evidenceCount: record.evidenceCount,
    firstSeenAt: record.firstSeenAt,
    lastVerifiedAt: record.lastVerifiedAt,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toSkillEvidenceDTO(evidence: any): SkillEvidenceDTO {
  return {
    id: evidence._id.toString(),
    primarySource: evidence.primarySource,
    sourceType: evidence.sourceType,
    sourceSubtype: evidence.sourceSubtype,
    payload: evidence.payload || {},
    confidence: evidence.confidence,
    extractedBy: evidence.extractedBy,
    correlationId: evidence.correlationId,
    effectiveFrom: evidence.effectiveFrom,
    effectiveTo: evidence.effectiveTo,
    status: evidence.status,
    createdAt: evidence.createdAt,
    updatedAt: evidence.updatedAt,
  };
}

function toSubjectMappingDTO(mapping: any): SubjectMappingDTO {
  return {
    subjectCode: mapping.subjectCode,
    subjectName: mapping.subjectName,
    effectiveFrom: mapping.effectiveFrom,
    effectiveTo: mapping.effectiveTo,
    mappings: [
      {
        skillId: mapping.skillId,
        skillName: mapping.skillName,
        skillCategory: mapping.skillCategory,
        relevanceWeight: mapping.relevanceWeight,
        isCore: mapping.isCore,
      },
    ],
  };
}

export const getMySkills = async (req: any, res: Response) => {
  try {
    const { organizationId, user } = req;
    const authUserId = user?.userId;
    if (!organizationId || !authUserId) {
      return sendError(res, 401, 'Authentication required');
    }

    const personResolver = new PersonResolver();
    const personId = await personResolver.resolve(authUserId, organizationId);

    const records = await skillRecordRepo.findByPerson(personId, organizationId);
    const skills = records.map(toSkillRecordDTO);

    const categories: Record<string, { count: number; averageScore: number }> = {};
    for (const skill of skills) {
      const cat = skill.skillCategory;
      if (!categories[cat]) {
        categories[cat] = { count: 0, averageScore: 0 };
      }
      categories[cat].count++;
      categories[cat].averageScore =
        (categories[cat].averageScore * (categories[cat].count - 1) + skill.proficiencyScore) /
        categories[cat].count;
    }

    const subjectMappings = await mappingService.getMappingsForSubject('', organizationId);
    const groupedMappings = new Map<string, SubjectMappingDTO>();
    for (const mapping of subjectMappings) {
      const key = `${mapping.subjectCode}-${mapping.skillId}`;
      if (!groupedMappings.has(key)) {
        groupedMappings.set(key, toSubjectMappingDTO(mapping));
      }
    }

    const response: SkillProfileResponse = {
      profileId: personId,
      generatedAt: new Date(),
      skills,
      categories,
      subjectMappings: Array.from(groupedMappings.values()),
    };

    return sendResponse(res, 200, response, 'Skill profile retrieved');
  } catch (err: any) {
    logger.error('Get my skills error:', err);
    return sendError(res, 500, 'Failed to fetch skill profile');
  }
};

export const getMySkillEvidence = async (req: any, res: Response) => {
  try {
    const { organizationId, user } = req;
    const { skillId } = req.params;
    const authUserId = user?.userId;

    if (!organizationId || !authUserId) {
      return sendError(res, 401, 'Authentication required');
    }

    if (!skillId) {
      return sendError(res, 400, 'skillId is required');
    }

    const personResolver = new PersonResolver();
    const personId = await personResolver.resolve(authUserId, organizationId);

    const skillRecord = await skillRecordRepo.findBySkill(personId, skillId, organizationId);
    if (!skillRecord) {
      return sendError(res, 404, 'Skill not found');
    }

    const evidence = await evidenceRepo.findActiveByPersonAndSkill(personId, skillId, organizationId);
    const evidenceDTOs = evidence.map(toSkillEvidenceDTO);

    return sendResponse(
      res,
      200,
      {
        skillId: skillRecord.skillId,
        skillName: skillRecord.skillName,
        evidence: evidenceDTOs,
      },
      'Skill evidence retrieved'
    );
  } catch (err: any) {
    logger.error('Get skill evidence error:', err);
    return sendError(res, 500, 'Failed to fetch skill evidence');
  }
};

export const getMySkillSummary = async (req: any, res: Response) => {
  try {
    const { organizationId, user } = req;
    const authUserId = user?.userId;
    if (!organizationId || !authUserId) {
      return sendError(res, 401, 'Authentication required');
    }

    const personResolver = new PersonResolver();
    const personId = await personResolver.resolve(authUserId, organizationId);

    const records = await skillRecordRepo.findByPerson(personId, organizationId);

    const categories: Record<string, number> = {};
    const topSkills: { skillName: string; proficiencyScore: number }[] = [];
    const skillGaps: { skillName: string; proficiencyScore: number }[] = [];

    for (const record of records) {
      categories[record.skillCategory] = (categories[record.skillCategory] || 0) + 1;

      if (record.proficiencyScore >= 70) {
        topSkills.push({ skillName: record.skillName, proficiencyScore: record.proficiencyScore });
      } else if (record.proficiencyScore < 30) {
        skillGaps.push({ skillName: record.skillName, proficiencyScore: record.proficiencyScore });
      }
    }

    topSkills.sort((a, b) => b.proficiencyScore - a.proficiencyScore);
    skillGaps.sort((a, b) => a.proficiencyScore - b.proficiencyScore);

    const response: SkillSummaryResponse = {
      totalSkills: records.length,
      categories,
      topSkills: topSkills.slice(0, 10),
      skillGaps: skillGaps.slice(0, 10),
    };

    return sendResponse(res, 200, response, 'Skill summary retrieved');
  } catch (err: any) {
    logger.error('Get skill summary error:', err);
    return sendError(res, 500, 'Failed to fetch skill summary');
  }
};

export const createSkillMapping = async (req: any, res: Response) => {
  try {
    const { organizationId, user } = req;
    const body = req.body as CreateMappingRequest;
    const authUserId = user?.userId;

    if (!organizationId || !authUserId) {
      return sendError(res, 401, 'Authentication required');
    }

    if (!body.subjectCode || !body.subjectName || !body.skillId || !body.skillName) {
      return sendError(res, 400, 'subjectCode, subjectName, skillId, and skillName are required');
    }

    if (typeof body.relevanceWeight !== 'number' || body.relevanceWeight < 0 || body.relevanceWeight > 1) {
      return sendError(res, 400, 'relevanceWeight must be a number between 0 and 1');
    }

    if (!Object.values(SkillCategory).includes(body.skillCategory)) {
      return sendError(res, 400, 'Invalid skillCategory');
    }

    const mapping = await mappingService.upsertMapping({
      organizationId,
      subjectCode: body.subjectCode,
      subjectName: body.subjectName,
      skillId: body.skillId,
      skillName: body.skillName,
      skillCategory: body.skillCategory,
      relevanceWeight: body.relevanceWeight,
      isCore: body.isCore ?? false,
      effectiveFrom: body.effectiveFrom,
      effectiveTo: body.effectiveTo,
      version: body.version,
      createdBy: body.createdBy || authUserId,
    });

    return sendResponse(res, 201, { mappingId: mapping._id.toString(), action: 'create' }, 'Subject-skill mapping created');
  } catch (err: any) {
    logger.error('Create skill mapping error:', err);
    return sendError(res, 500, 'Failed to create skill mapping');
  }
};

export const getMappingsForSubject = async (req: any, res: Response) => {
  try {
    const { organizationId } = req;
    const { subjectCode } = req.params;

    if (!organizationId) {
      return sendError(res, 403, 'Organization context is required');
    }

    if (!subjectCode) {
      return sendError(res, 400, 'subjectCode is required');
    }

    const mappings = await mappingService.getMappingsForSubject(subjectCode, organizationId);

    const grouped = new Map<string, any>();
    for (const mapping of mappings) {
      const key = mapping.skillId;
      if (!grouped.has(key)) {
        grouped.set(key, {
          subjectCode: mapping.subjectCode,
          subjectName: mapping.subjectName,
          effectiveFrom: mapping.effectiveFrom,
          effectiveTo: mapping.effectiveTo,
          mappings: [],
        });
      }
      grouped.get(key).mappings.push({
        skillId: mapping.skillId,
        skillName: mapping.skillName,
        skillCategory: mapping.skillCategory,
        relevanceWeight: mapping.relevanceWeight,
        isCore: mapping.isCore,
      });
    }

    return sendResponse(res, 200, { subjectCode, mappings: Array.from(grouped.values()) }, 'Mappings retrieved');
  } catch (err: any) {
    logger.error('Get mappings for subject error:', err);
    return sendError(res, 500, 'Failed to fetch subject mappings');
  }
};
