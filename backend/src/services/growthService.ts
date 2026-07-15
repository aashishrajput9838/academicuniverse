import mongoose from 'mongoose';
import Mark from '../models/Mark';
import { EzoneAcademicProfile } from '../models/EzoneAcademicProfile';
import User from '../models/User';
import githubService from './githubService';
import { ConfigurationError, ExternalAPIError } from '../utils/errors';
import { toObjectId } from '../utils/mongooseHelpers';

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

export interface SubjectPerformance {
  subjectId: string;
  averageMarks: number;
  count: number;
}

export interface GrowthHubResponse {
  generatedAt: string;
  metrics: {
    marksSummary: GrowthMetric<number>;
    averageMarks: GrowthMetric<number>;
    subjectWisePerformance: GrowthMetric<SubjectPerformance[]>;
    attendance: GrowthMetric<number>;
    academicProfileStatus: GrowthMetric<string>;
    githubRepositoryCount: GrowthMetric<number>;
    completedProjects: GrowthMetric<number>;
  };
}

const createMetric = <T>(
  state: GrowthMetricState,
  value: T | null,
  updatedAt: string | null,
  stale: boolean | null,
  reasonCode: GrowthMetricReasonCode | null
): GrowthMetric<T> => ({
  state,
  value,
  updatedAt,
  stale,
  reasonCode,
});

const toTimestamp = (value: Date | string | undefined | null): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const getMarksMetrics = async (userId: string, organizationId: string) => {
  try {
    const marks = await Mark.find({
      studentId: toObjectId(userId),
      organizationId: toObjectId(organizationId),
    })
      .sort({ updatedAt: -1 })
      .lean();

    if (!marks.length) {
      return {
        marksSummary: createMetric<number>('EMPTY', null, null, null, 'NO_DATA'),
        averageMarks: createMetric<number>('EMPTY', null, null, null, 'NO_DATA'),
        subjectWisePerformance: createMetric<SubjectPerformance[]>('EMPTY', [], null, null, 'NO_DATA'),
      };
    }

    const values = marks.map((mark) => Number(mark.marks));
    const averageMarks = values.reduce((sum, value) => sum + value, 0) / values.length;

    const grouped = marks.reduce<Record<string, { sum: number; count: number }>>((acc, mark) => {
      const subjectId = String(mark.subjectId || 'unknown');
      if (!acc[subjectId]) {
        acc[subjectId] = { sum: 0, count: 0 };
      }
      acc[subjectId].sum += Number(mark.marks);
      acc[subjectId].count += 1;
      return acc;
    }, {});

    const subjectWisePerformance: SubjectPerformance[] = Object.entries(grouped).map(([subjectId, entry]) => ({
      subjectId,
      averageMarks: entry.sum / entry.count,
      count: entry.count,
    }));

    const latestTimestamp = toTimestamp(marks[0]?.updatedAt || marks[0]?.createdAt);

    return {
      marksSummary: createMetric<number>('AVAILABLE', marks.length, latestTimestamp, null, null),
      averageMarks: createMetric<number>('AVAILABLE', Number(averageMarks.toFixed(2)), latestTimestamp, null, null),
      subjectWisePerformance: createMetric<SubjectPerformance[]>('AVAILABLE', subjectWisePerformance, latestTimestamp, null, null),
    };
  } catch (error) {
    return {
      marksSummary: createMetric<number>('ERROR', null, null, null, 'SOURCE_ERROR'),
      averageMarks: createMetric<number>('ERROR', null, null, null, 'SOURCE_ERROR'),
      subjectWisePerformance: createMetric<SubjectPerformance[]>('ERROR', null, null, null, 'SOURCE_ERROR'),
    };
  }
};

const getEzoneMetrics = async (userId: string, organizationId: string) => {
  try {
    const profile = await EzoneAcademicProfile.findOne({
      userId: toObjectId(userId),
      organizationId: toObjectId(organizationId),
    }).lean();

    if (!profile) {
      return {
        attendance: createMetric<number>('NOT_SYNCED', null, null, null, 'NOT_SYNCED'),
        academicProfileStatus: createMetric<string>('NOT_SYNCED', null, null, null, 'NOT_SYNCED'),
      };
    }

    const updatedAt = toTimestamp((profile as any).lastSyncedAt || (profile as any).updatedAt || (profile as any).createdAt);

    const hasAttendance = (profile as any).attendancePercentage !== undefined && (profile as any).attendancePercentage !== null;
    const attendanceMetric = hasAttendance
      ? createMetric<number>('AVAILABLE', Number((profile as any).attendancePercentage), updatedAt, null, null)
      : createMetric<number>('EMPTY', null, updatedAt, null, 'NO_DATA');

    const statusValue = typeof (profile as any).status === 'string' && (profile as any).status.trim().length > 0
      ? String((profile as any).status)
      : null;
    const statusMetric = statusValue
      ? createMetric<string>('AVAILABLE', statusValue, updatedAt, null, null)
      : createMetric<string>('EMPTY', null, updatedAt, null, 'NO_DATA');

    return {
      attendance: attendanceMetric,
      academicProfileStatus: statusMetric,
    };
  } catch (error) {
    return {
      attendance: createMetric<number>('ERROR', null, null, null, 'SOURCE_ERROR'),
      academicProfileStatus: createMetric<string>('ERROR', null, null, null, 'SOURCE_ERROR'),
    };
  }
};

const getGithubMetrics = async (userId: string) => {
  try {
    const user = await User.findById(userId).select('githubUsername').lean();
    if (!user?.githubUsername) {
      return {
        githubRepositoryCount: createMetric<number>('NOT_CONNECTED', null, null, null, 'NOT_CONNECTED'),
        completedProjects: createMetric<number>('NOT_CONNECTED', null, null, null, 'NOT_CONNECTED'),
      };
    }

    const stats = await githubService.getProjectStats(String(user.githubUsername));

    return {
      githubRepositoryCount: createMetric<number>('AVAILABLE', Number(stats.total), null, null, null),
      completedProjects: createMetric<number>('AVAILABLE', Number(stats.completed), null, null, null),
    };
  } catch (error) {
    if (error instanceof ConfigurationError) {
      return {
        githubRepositoryCount: createMetric<number>('UNAVAILABLE', null, null, null, 'UNAVAILABLE'),
        completedProjects: createMetric<number>('UNAVAILABLE', null, null, null, 'UNAVAILABLE'),
      };
    }

    return {
      githubRepositoryCount: createMetric<number>('UNAVAILABLE', null, null, null, 'SOURCE_ERROR'),
      completedProjects: createMetric<number>('UNAVAILABLE', null, null, null, 'SOURCE_ERROR'),
    };
  }
};

export const buildGrowthHubResponse = async (userId: string, organizationId: string): Promise<GrowthHubResponse> => {
  const [marksMetrics, ezoneMetrics, githubMetrics] = await Promise.all([
    getMarksMetrics(userId, organizationId),
    getEzoneMetrics(userId, organizationId),
    getGithubMetrics(userId),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    metrics: {
      marksSummary: marksMetrics.marksSummary,
      averageMarks: marksMetrics.averageMarks,
      subjectWisePerformance: marksMetrics.subjectWisePerformance,
      attendance: ezoneMetrics.attendance,
      academicProfileStatus: ezoneMetrics.academicProfileStatus,
      githubRepositoryCount: githubMetrics.githubRepositoryCount,
      completedProjects: githubMetrics.completedProjects,
    },
  };
};
