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

export type GrowthMetric<T> = {
  state: GrowthMetricState;
  value: T | null;
  updatedAt: string | null;
  stale: boolean | null;
  reasonCode: GrowthMetricReasonCode | null;
};

export type SubjectPerformance = {
  subjectId: string;
  averageMarks: number;
  count: number;
};

export type GrowthResponse = {
  metrics: {
    marksSummary: GrowthMetric<number>;
    averageMarks: GrowthMetric<number>;
    attendance: GrowthMetric<number>;
    academicProfileStatus: GrowthMetric<string>;
    githubRepositoryCount: GrowthMetric<number>;
    completedProjects: GrowthMetric<number>;
    subjectWisePerformance: GrowthMetric<SubjectPerformance[]>;
  };
};
