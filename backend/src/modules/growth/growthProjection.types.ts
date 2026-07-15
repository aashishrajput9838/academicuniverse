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
  };
  sources: {
    academicRecords: GrowthSourceState;
    marks: GrowthSourceState;
    ezone: GrowthSourceState;
    github: GrowthSourceState;
    certificates: GrowthSourceState;
    experience: GrowthSourceState;
  };
  sourceVersions: Record<string, string | null>;
}
