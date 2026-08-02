import { SkillCategory, ProficiencyLevel, SkillSource } from '../../shared/enums/skills.enum';

export interface SkillRecordDTO {
  id: string;
  skillId: string;
  skillName: string;
  aliases: string[];
  skillCategory: SkillCategory;
  skillSubcategory?: string;
  scoringModelVersion?: string;
  proficiencyLevel: ProficiencyLevel;
  proficiencyScore: number;
  confidenceScore?: number;
  verificationStatus?: string;
  scoreBreakdown?: {
    volume: number;
    recency: number;
    ownership: number;
    complexity: number;
    dominance: number;
  };
  recruiterExplanation?: string;
  evidenceCount: number;
  evidenceSources?: string[];
  timelineData?: Array<{ year: number; evidenceCount: number; proficiencyScore: number }>;
  relatedSkillIds?: string[];
  firstSeenAt: Date;
  lastVerifiedAt: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  explanation?: ProficiencyExplanationDTO;
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
  sourceDetails?: EvidenceSourceDetails;
  explanation?: SourceDefaultInfo;
}

export interface EvidenceSourceDetails {
  title?: string;
  subtitle?: string;
  owner?: string;
  url?: string;
  repository?: {
    id: string;
    name: string;
    owner: string;
    url: string;
  } | null;
  detectedLanguage?: string;
  metadata?: Record<string, any>;
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

export interface SourceDefaultInfo {
  source: string;
  defaultConfidence: number;
  isSourceDefault: boolean;
  description: string;
}

export interface ConfidenceExplanationDTO {
  overallConfidence: number;
  isSourceDefault: boolean;
  source: string;
  sourceDefaultConfidence: number;
  description: string;
  perSourceBreakdown: Array<{
    source: string;
    count: number;
    avgConfidence: number;
    isSourceDefault: boolean;
  }>;
}

export interface ProficiencyExplanationDTO {
  score: number;
  level: string;
  thresholds: {
    BEGINNER: number;
    INTERMEDIATE: number;
    ADVANCED: number;
    EXPERT: number;
  };
  formula: string;
  evidenceCount: number;
  activeEvidenceCount: number;
  description: string;
  sourceBreakdown: Array<{
    source: string;
    count: number;
    avgWeight: number;
    sourceWeight: number;
    isSourceDefault: boolean;
  }>;
}
