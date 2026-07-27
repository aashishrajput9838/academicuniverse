export type GrowthMetricState =
  | 'AVAILABLE'
  | 'EMPTY'
  | 'NOT_CONNECTED'
  | 'NOT_SYNCED'
  | 'UNAVAILABLE'
  | 'ERROR';

export type GrowthMetricReasonCode =
  | 'NO_DATA'
  | 'NOT_CONNECTED'
  | 'NOT_SYNCED'
  | 'UNAVAILABLE'
  | 'AUTH_REQUIRED'
  | 'ORG_REQUIRED'
  | 'SOURCE_ERROR'
  | 'UNKNOWN';

export interface GrowthMetric<T> {
  state: GrowthMetricState;
  value: T | null;
  updatedAt: string | null;
  stale: boolean | null;
  reasonCode: GrowthMetricReasonCode | null;
}

export interface GrowthSourceState {
  state: GrowthMetricState;
  updatedAt: string | null;
  stale: boolean;
  reasonCode: GrowthMetricReasonCode | null;
}

export interface SubjectPerformance {
  subjectId: string;
  averageMarks: number;
  count: number;
}

export interface SkillSummaryItem {
  skillId: string;
  skillName: string;
  proficiencyScore: number;
  evidenceCount: number;
}

export interface SkillsMetrics {
  totalSkills: number;
  averageProficiency: number;
  technicalSkills: number;
  softSkills: number;
  languageSkills: number;
  toolSkills: number;
  topSkills: SkillSummaryItem[];
  weakestSkills: SkillSummaryItem[];
  lastProjectionAt: string | null;
}

export interface CodeArenaSummary {
  totalPoints: number;
  issuesPosted: number;
  issuesSolved: number;
  acceptanceRate: number;
  totalRewardsEarned: number;
  badges: string[];
}

export interface GrowthProjection {
  projectionVersion: number;
  generatedAt: string;
  stale: boolean;
  profileId: string;
  metrics: {
    marksSummary: GrowthMetric<number>;
    averageMarks: GrowthMetric<number>;
    subjectWisePerformance: GrowthMetric<SubjectPerformance[]>;
    attendance: GrowthMetric<number>;
    academicProfileStatus: GrowthMetric<string>;
    githubRepositoryCount: GrowthMetric<number>;
    completedProjects: GrowthMetric<number>;
    academicRecordsCount: GrowthMetric<number>;
    certificatesCount: GrowthMetric<number>;
    experienceCount: GrowthMetric<number>;
    skills: GrowthMetric<SkillsMetrics>;
    codeArena?: GrowthMetric<CodeArenaSummary>;
  };
  sources: {
    academicRecords: GrowthSourceState;
    marks: GrowthSourceState;
    ezone: GrowthSourceState;
    github: GrowthSourceState;
    certificates: GrowthSourceState;
    experience: GrowthSourceState;
    skillsTracker: GrowthSourceState;
    codeArena?: GrowthSourceState;
  };
  sourceVersions: Record<string, string | null>;
}
