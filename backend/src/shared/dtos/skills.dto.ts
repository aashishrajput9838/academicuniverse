import { SkillCategory, ProficiencyLevel, SkillSource } from '../../shared/enums/skills.enum';

export interface SkillRecordDTO {
  id: string;
  skillId: string;
  skillName: string;
  aliases: string[];
  skillCategory: SkillCategory;
  skillSubcategory?: string;
  proficiencyLevel: ProficiencyLevel;
  proficiencyScore: number;
  evidenceCount: number;
  firstSeenAt: Date;
  lastVerifiedAt: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillEvidenceDTO {
  id: string;
  primarySource: SkillSource;
  sourceType: string;
  sourceSubtype?: string;
  payload: Record<string, any>;
  confidence: number;
  extractedBy: string;
  correlationId?: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillProfileResponse {
  profileId: string;
  generatedAt: Date;
  skills: SkillRecordDTO[];
  categories: Record<string, { count: number; averageScore: number }>;
  subjectMappings: SubjectMappingDTO[];
}

export interface SubjectMappingDTO {
  subjectCode: string;
  subjectName: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  mappings: {
    skillId: string;
    skillName: string;
    skillCategory: SkillCategory;
    relevanceWeight: number;
    isCore: boolean;
  }[];
}

export interface SkillSummaryResponse {
  totalSkills: number;
  categories: Record<string, number>;
  topSkills: { skillName: string; proficiencyScore: number }[];
  skillGaps: { skillName: string; proficiencyScore: number }[];
}

export interface CreateMappingRequest {
  subjectCode: string;
  subjectName: string;
  skillId: string;
  skillName: string;
  skillCategory: SkillCategory;
  relevanceWeight: number;
  isCore?: boolean;
  effectiveFrom: string | Date;
  effectiveTo?: string | Date;
  version?: number;
  createdBy?: string;
}

export interface ApiEnvelope<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}
