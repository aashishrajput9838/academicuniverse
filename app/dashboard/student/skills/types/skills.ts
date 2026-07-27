export type ProficiencyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export type SkillStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

export type SkillCategory = 'TECHNICAL' | 'SOFT' | 'LANGUAGE' | 'TOOL' | 'DOMAIN_SPECIFIC';

/** Source channel through which a skill was added */
export type SkillSource = 'MANUAL' | 'AI_SUGGESTED' | 'IMPORTED';


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
  explanation?: {
    score: number;
    level: string;
    thresholds: { BEGINNER: number; INTERMEDIATE: number; ADVANCED: number; EXPERT: number };
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
  };
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
  sourceDetails?: {
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
  };
  explanation?: {
    source: string;
    defaultConfidence: number;
    isSourceDefault: boolean;
    description: string;
  };
};

export type SkillDetailDTO = {
  skillId: string;
  skillName: string;
  evidence: SkillEvidenceDTO[];
  explanation?: {
    score: number;
    level: string;
    thresholds: { BEGINNER: number; INTERMEDIATE: number; ADVANCED: number; EXPERT: number };
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
  };
};

export type SkillProfileResponse = {
  profileId: string;
  generatedAt: string;
  skills: Array<{
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
    explanation?: {
      score: number;
      level: string;
      thresholds: { BEGINNER: number; INTERMEDIATE: number; ADVANCED: number; EXPERT: number };
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
    };
  }>;
  categories: Record<string, { count: number; averageScore: number }>;
  subjectMappings: Array<{
    subjectCode: string;
    subjectName: string;
    effectiveFrom: string;
    effectiveTo?: string;
    mappings: Array<{
      skillId: string;
      skillName: string;
      skillCategory: string;
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
