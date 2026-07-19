export type ProficiencyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export type SkillStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

export type SkillCategory = 'TECHNICAL' | 'SOFT' | 'LANGUAGE' | 'TOOL' | 'DOMAIN_SPECIFIC';

export type EvidenceSourceType =
  | 'ACADEMIC_RECORD'
  | 'GITHUB'
  | 'CERTIFICATE'
  | 'RESEARCH'
  | 'CODING_ARENA'
  | 'PROJECT'
  | 'ASSESSMENT'
  | 'MANUAL';

export type SkillRecordDTO = {
  id: string;
  skillId: string;
  skillName: string;
  aliases: string[];
  skillCategory: SkillCategory;
  skillSubcategory?: string;
  proficiencyLevel: ProficiencyLevel;
  proficiencyScore: number;
  evidenceCount: number;
  firstSeenAt: string;
  lastVerifiedAt: string;
  status: SkillStatus;
  createdAt: string;
  updatedAt: string;
};

export type SkillEvidenceDTO = {
  id: string;
  primarySource: EvidenceSourceType;
  sourceType: string;
  sourceSubtype?: string;
  payload: Record<string, any>;
  confidence: number;
  extractedBy: string;
  correlationId?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type SkillDetailDTO = {
  skillId: string;
  skillName: string;
  evidence: SkillEvidenceDTO[];
};

export type SkillProfileResponse = {
  profileId: string;
  generatedAt: string;
  skills: SkillRecordDTO[];
  categories: Record<string, { count: number; averageScore: number }>;
  subjectMappings: Array<{
    subjectCode: string;
    subjectName: string;
    effectiveFrom: string;
    effectiveTo?: string;
    mappings: Array<{
      skillId: string;
      skillName: string;
      skillCategory: SkillCategory;
      relevanceWeight: number;
      isCore: boolean;
    }>;
  }>;
};

export type SkillSummaryResponse = {
  totalSkills: number;
  categories: Record<string, number>;
  topSkills: { skillName: string; proficiencyScore: number }[];
  skillGaps: { skillName: string; proficiencyScore: number }[];
};

export type SourceContribution = {
  source: EvidenceSourceType;
  count: number;
  percentage: number;
};

export type ResumeReadiness = 'RESUME_READY' | 'NEEDS_MORE_EVIDENCE' | 'NOT_VERIFIED';

export type SkillGrowthStage = {
  level: ProficiencyLevel;
  achievedAt: string;
  source: string;
};

export type MissingEvidenceItem = {
  type: EvidenceSourceType;
  label: string;
  description: string;
};
