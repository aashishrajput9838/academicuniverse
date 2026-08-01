import { Response } from 'express';
import { sendResponse, sendError } from '../utils/response';
import { PersonResolver } from '../shared/services/personResolver.service';
import { SkillProjectionService } from '../shared/services/skillProjection.service';
import { SkillEvidenceService } from '../shared/services/skillEvidence.service';
import { SubjectSkillMappingService } from '../shared/services/subjectSkillMapping.service';
import { SkillRecordRepository } from '../shared/repositories/skillRecord.repository';
import { SkillEvidenceRepository } from '../shared/repositories/skillEvidence.repository';
import { SkillRecord } from '../models/SkillRecord';
import { SkillEvidence } from '../models/SkillEvidence';
import { GithubRecord } from '../models/GithubRecord';
import { logger } from '../utils/logger';
import {
  SkillRecordDTO,
  SkillEvidenceDTO,
  EvidenceSourceDetails,
  SkillProfileResponse,
  SkillSummaryResponse,
  SubjectMappingDTO,
  CreateMappingRequest,
} from '../shared/dtos/skills.dto';
import { SkillCategory, ProficiencyLevel, SkillSource, SkillStatus, EvidenceStatus } from '../shared/enums/skills.enum';
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
    const personId = await personResolver.resolve(authUserId, organizationId, user.email, user.name);

    const records = await skillRecordRepo.findByPerson(personId, organizationId);
    const allEvidence = await evidenceRepo.findByPerson(personId, organizationId);
    const evidenceBySkill = new Map<string, any[]>();
    for (const e of allEvidence) {
      const key = e.skillId;
      if (!evidenceBySkill.has(key)) {
        evidenceBySkill.set(key, []);
      }
      evidenceBySkill.get(key)!.push(e);
    }

    const skills = records.map(record => {
      const dto = toSkillRecordDTO(record);
      const evidence = evidenceBySkill.get(record.skillId) || [];
      dto.explanation = skillProjectionService.generateProficiencyExplanation(evidence);
      return dto;
    });

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
    const personId = await personResolver.resolve(authUserId, organizationId, user.email, user.name);

    const skillRecord = await skillRecordRepo.findBySkill(personId, skillId, organizationId);
    if (!skillRecord) {
      return sendError(res, 404, 'Skill not found');
    }

    const evidence = await evidenceRepo.findActiveByPersonAndSkill(personId, skillId, organizationId);

    const correlationIds = Array.from(
      new Set(
        evidence
          .map(e => e.correlationId)
          .filter((id): id is string => !!id)
      )
    );

    const githubRecordMap = new Map<string, any>();
    if (correlationIds.length > 0) {
      const githubRecords = await GithubRecord.find({
        _id: { $in: correlationIds.map(id => toObjectId(id)) },
      }).lean().exec();

      for (const record of githubRecords) {
        githubRecordMap.set(record._id.toString(), record);
      }
    }

    const evidenceDTOs = evidence.map(raw => {
      const dto = toSkillEvidenceDTO(raw);
      const sourceDetails = buildSourceDetails(raw, githubRecordMap);
      const sourceDefaultConfidence = skillProjectionService.getSourceWeight(raw.primarySource);
      dto.explanation = {
        source: raw.primarySource,
        defaultConfidence: sourceDefaultConfidence,
        isSourceDefault: Math.abs(raw.confidence - sourceDefaultConfidence) < 0.01,
        description: raw.confidence === sourceDefaultConfidence
          ? `This evidence uses the default confidence value (${Math.round(sourceDefaultConfidence * 100)}%) for ${raw.primarySource} sources. This reflects source reliability, not individual evidence quality.`
          : `This evidence has a custom confidence value (${Math.round(raw.confidence * 100)}%), different from the ${raw.primarySource} source default (${Math.round(sourceDefaultConfidence * 100)}%).`,
      };
      return { ...dto, sourceDetails };
    });

    const proficiencyExplanation = skillProjectionService.generateProficiencyExplanation(evidence);

    return sendResponse(
      res,
      200,
      {
        skillId: skillRecord.skillId,
        skillName: skillRecord.skillName,
        evidence: evidenceDTOs,
        explanation: proficiencyExplanation,
      },
      'Skill evidence retrieved'
    );
  } catch (err: any) {
    logger.error('Get skill evidence error:', err);
    return sendError(res, 500, 'Failed to fetch skill evidence');
  }
};

function buildSourceDetails(
  evidence: any,
  githubRecordMap: Map<string, any>
): EvidenceSourceDetails | undefined {
  const primarySource = evidence.primarySource;
  const payload = evidence.payload || {};
  const correlationId = evidence.correlationId;

  if (primarySource === 'GITHUB') {
    const githubRecord = correlationId ? githubRecordMap.get(correlationId) : null;

    const repository =
      evidence.repositoryId || evidence.repositoryName
        ? {
            id: evidence.repositoryId || String(payload.repositoryId || ''),
            name: evidence.repositoryName || payload.repositoryName || 'Unknown',
            owner: evidence.owner || payload.owner || githubRecord?.githubUsername || 'Unknown',
            url: evidence.repositoryUrl || payload.repositoryUrl || githubRecord?.repositories?.find?.(
              (r: any) => r.language === (evidence.language || payload.language)
            )?.html_url || '',
          }
        : null;

    return {
      repository,
      detectedLanguage: evidence.language || payload.language,
      metadata: {
        bytesOfCode: evidence.bytesOfCode ?? payload.bytesOfCode,
        contributionCount: payload.contributionCount,
        firstCommitDate: evidence.firstCommitDate || payload.firstCommitDate,
        lastCommitDate: evidence.lastCommitDate || payload.lastCommitDate,
        repositoryVisibility: evidence.repositoryVisibility || payload.repositoryVisibility,
        topics: payload.topics,
        description: payload.description,
      },
    };
  }

  if (primarySource === 'ACADEMIC') {
    return {
      title: payload.subjectName || payload.fileName,
      subtitle: payload.subjectCode,
      metadata: {
        grade: payload.grade,
        credits: payload.credits,
        semester: payload.semester,
        year: payload.year,
      },
    };
  }

  if (primarySource === 'CERTIFICATE') {
    return {
      title: payload.title || payload.fileName,
      subtitle: payload.issuer,
      metadata: {
        issuedDate: payload.issuedDate,
      },
    };
  }

  if (primarySource === 'RESEARCH') {
    return {
      title: payload.title || payload.fileName,
      subtitle: payload.journal,
      metadata: {
        authors: payload.authors,
        abstract: payload.abstract,
      },
    };
  }

  return {
    title: payload.title || payload.fileName || payload.subjectName,
    metadata: payload,
  };
}

export const getMySkillSummary = async (req: any, res: Response) => {
  try {
    const { organizationId, user } = req;
    const authUserId = user?.userId;
    if (!organizationId || !authUserId) {
      return sendError(res, 401, 'Authentication required');
    }

    const personResolver = new PersonResolver();
    const personId = await personResolver.resolve(authUserId, organizationId, user.email, user.name);

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

/**
 * Helper to normalize skill name into canonical skillId
 */
export function normalizeSkillId(skillName: string): string {
  return skillName
    .toLowerCase()
    .trim()
    .replace(/\+/g, 'p')
    .replace(/#/g, 'sharp')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Helper to map proficiency level string to 0-100 score
 */
export function getProficiencyScore(level: string): number {
  switch (level.toUpperCase()) {
    case 'EXPERT': return 90;
    case 'ADVANCED': return 75;
    case 'INTERMEDIATE': return 50;
    case 'BEGINNER': default: return 25;
  }
}

/**
 * Sync active student skills to StudentResume filledData
 */
async function syncSkillsToResumeDraft(authUserId: string, organizationId: string, personId: string) {
  try {
    const records = await skillRecordRepo.findByPerson(personId, organizationId);
    const skillNames = records.map(r => r.skillName);
    const StudentResume = (await import('../models/StudentResume')).default;
    await StudentResume.findOneAndUpdate(
      { userId: authUserId },
      { $set: { 'filledData.skills': skillNames.join(', ') } }
    );
  } catch (e) {
    logger.warn('Failed to sync skills to StudentResume draft', e);
  }
}

/**
 * Add / Upsert Skill(s) for authenticated student
 * POST /api/skills/me
 */
export const addSkillsController = async (req: any, res: Response) => {
  try {
    const { organizationId, user, body } = req;
    const authUserId = user?.userId;
    if (!organizationId || !authUserId) {
      return sendError(res, 401, 'Authentication required');
    }

    const skillsInput = Array.isArray(body.skills) ? body.skills : [body];
    if (skillsInput.length === 0) {
      return sendError(res, 400, 'At least one skill is required.');
    }

    const personResolver = new PersonResolver();
    const personId = await personResolver.resolve(authUserId, organizationId, user.email, user.name);

    const processedSkills = [];

    for (const item of skillsInput) {
      const name = item.skillName || item.name;
      if (!name || typeof name !== 'string') continue;

      const skillId = normalizeSkillId(name);
      const category = item.category || item.skillCategory || SkillCategory.TECHNICAL;
      const level = item.proficiencyLevel || item.level || 'INTERMEDIATE';
      const score = typeof item.proficiencyScore === 'number'
        ? Math.max(0, Math.min(100, Math.round(item.proficiencyScore)))
        : (typeof item.score === 'number' ? Math.max(0, Math.min(100, Math.round(item.score))) : getProficiencyScore(level));
      const source = item.source || SkillSource.MANUAL;

      // Check for existing record (Duplicate Prevention!)
      let record = await skillRecordRepo.findBySkill(personId, skillId, organizationId);
      const now = new Date();

      if (record) {
        // Update existing SkillRecord (Duplicate Prevention!)
        record.proficiencyLevel = level;
        record.proficiencyScore = score;
        record.skillCategory = category;
        record.lastVerifiedAt = now;
        record.status = SkillStatus.ACTIVE;
        await record.save();
      } else {
        // Create new SkillRecord
        record = await SkillRecord.create({
          organizationId: toObjectId(organizationId),
          personId: toObjectId(personId),
          skillId,
          skillName: name.trim(),
          aliases: [],
          skillCategory: category,
          proficiencyLevel: level,
          proficiencyScore: score,
          evidenceCount: 1,
          firstSeenAt: now,
          lastVerifiedAt: now,
          status: SkillStatus.ACTIVE,
        });
      }

      // Create supporting SkillEvidence
      await SkillEvidence.create({
        organizationId: toObjectId(organizationId),
        personId: toObjectId(personId),
        skillId,
        skillName: name.trim(),
        aliases: [],
        primarySource: source,
        sourceType: 'USER_MANAGED',
        sourceSubtype: 'DIRECT_ENTRY',
        payload: { notes: item.notes || 'Manually added by student' },
        confidence: 0.9,
        extractedBy: 'SKILLS_TRACKER_UI',
        effectiveFrom: now,
        status: EvidenceStatus.ACTIVE,
      });

      processedSkills.push(toSkillRecordDTO(record));
    }

    // Cross-Module Synchronization with Resume Builder
    await syncSkillsToResumeDraft(authUserId, organizationId, personId);

    return sendResponse(res, 201, {
      count: processedSkills.length,
      skills: processedSkills,
    }, 'Skills saved and synchronized successfully');
  } catch (err: any) {
    logger.error('Add skills error:', err);
    return sendError(res, 500, 'Failed to save skills');
  }
};

/**
 * Edit Skill Level / Category for authenticated student
 * PUT /api/skills/me/:skillId
 */
export const updateSkillController = async (req: any, res: Response) => {
  try {
    const { organizationId, user, params, body } = req;
    const { skillId } = params;
    const authUserId = user?.userId;

    if (!organizationId || !authUserId) {
      return sendError(res, 401, 'Authentication required');
    }

    if (!skillId) {
      return sendError(res, 400, 'skillId is required');
    }

    const personResolver = new PersonResolver();
    const personId = await personResolver.resolve(authUserId, organizationId, user.email, user.name);

    const record = await skillRecordRepo.findBySkill(personId, skillId, organizationId);
    if (!record) {
      return sendError(res, 404, 'Skill record not found');
    }

    if (body.proficiencyLevel || body.level) {
      record.proficiencyLevel = body.proficiencyLevel || body.level;
      record.proficiencyScore = getProficiencyScore(record.proficiencyLevel);
    }

    if (typeof body.proficiencyScore === 'number' || typeof body.score === 'number') {
      const scoreVal = typeof body.proficiencyScore === 'number' ? body.proficiencyScore : body.score;
      record.proficiencyScore = Math.max(0, Math.min(100, Math.round(scoreVal)));
    }

    if (body.skillCategory || body.category) {
      record.skillCategory = body.skillCategory || body.category;
    }

    record.lastVerifiedAt = new Date();
    await record.save();

    // Create updated evidence log
    await SkillEvidence.create({
      organizationId: toObjectId(organizationId),
      personId: toObjectId(personId),
      skillId: record.skillId,
      skillName: record.skillName,
      aliases: [],
      primarySource: body.source || SkillSource.MANUAL,
      sourceType: 'USER_MANAGED',
      sourceSubtype: 'PROFICIENCY_UPDATE',
      payload: { notes: body.notes || 'Updated by student' },
      confidence: 0.9,
      extractedBy: 'SKILLS_TRACKER_UI',
      effectiveFrom: new Date(),
      status: EvidenceStatus.ACTIVE,
    });

    await syncSkillsToResumeDraft(authUserId, organizationId, personId);

    return sendResponse(res, 200, toSkillRecordDTO(record), 'Skill updated successfully');
  } catch (err: any) {
    logger.error('Update skill error:', err);
    return sendError(res, 500, 'Failed to update skill');
  }
};

/**
 * Delete Skill for authenticated student
 * DELETE /api/skills/me/:skillId
 */
export const deleteSkillController = async (req: any, res: Response) => {
  try {
    const { organizationId, user, params } = req;
    const { skillId } = params;
    const authUserId = user?.userId;

    if (!organizationId || !authUserId) {
      return sendError(res, 401, 'Authentication required');
    }

    if (!skillId) {
      return sendError(res, 400, 'skillId is required');
    }

    const personResolver = new PersonResolver();
    const personId = await personResolver.resolve(authUserId, organizationId, user.email, user.name);

    await SkillRecord.deleteMany({ organizationId: toObjectId(organizationId), personId: toObjectId(personId), skillId });
    await SkillEvidence.deleteMany({ organizationId: toObjectId(organizationId), personId: toObjectId(personId), skillId });

    await syncSkillsToResumeDraft(authUserId, organizationId, personId);

    return sendResponse(res, 200, { skillId }, 'Skill deleted successfully');
  } catch (err: any) {
    logger.error('Delete skill error:', err);
    return sendError(res, 500, 'Failed to delete skill');
  }
};
