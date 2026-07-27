import Mark from '../../models/Mark';
import { EzoneAcademicProfile } from '../../models/EzoneAcademicProfile';
import User from '../../models/User';
import { AcademicRecord } from '../../models/AcademicRecord';
import { CertificateRecord } from '../../models/CertificateRecord';
import { ExperienceRecord } from '../../models/ExperienceRecord';
import { Person } from '../../models/Person';
import { SkillRecord } from '../../models/SkillRecord';
import { SkillEvidence } from '../../models/SkillEvidence';
import { SkillCategory } from '../../shared/enums/skills.enum';
import githubService from '../../services/githubService';
import { ConfigurationError } from '../../utils/errors';
import { toObjectId } from '../../utils/mongooseHelpers';
import { Logger } from '../../utils/logger';
import {
  GrowthMetric,
  GrowthMetricReasonCode,
  GrowthMetricState,
  GrowthProjection,
  GrowthSourceState,
  SubjectPerformance,
  SkillsMetrics,
  SkillSummaryItem,
} from './growthProjection.types';

const logger = new Logger('GrowthProjectionService');

const PROJECTION_VERSION = 2;

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

const createSourceState = (
  state: GrowthMetricState,
  updatedAt: string | null,
  stale: boolean,
  reasonCode: GrowthMetricReasonCode | null
): GrowthSourceState => ({
  state,
  updatedAt,
  stale,
  reasonCode,
});

const toTimestamp = (value: Date | string | undefined | null): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const latestTimestamp = (values: Array<Date | string | undefined | null>): string | null => {
  const times = values
    .map((value) => {
      if (!value) return null;
      const date = value instanceof Date ? value : new Date(value);
      return Number.isNaN(date.getTime()) ? null : date.getTime();
    })
    .filter((value): value is number => value !== null);

  if (!times.length) return null;
  return new Date(Math.max(...times)).toISOString();
};

export class GrowthProjectionService {
  async buildProjection(userId: string, organizationId: string): Promise<GrowthProjection> {
    const startTime = Date.now();
    const [profileId, marksMetrics, canonicalMetrics, ezoneMetrics, githubMetrics, skillsMetrics, codeArenaMetrics] = await Promise.all([
      this.resolveProfileId(userId, organizationId),
      this.getMarksMetrics(userId, organizationId),
      this.getCanonicalProfileMetrics(userId, organizationId),
      this.getEzoneMetrics(userId, organizationId),
      this.getGithubMetrics(userId, organizationId),
      this.getSkillsMetrics(userId, organizationId),
      this.getCodeArenaMetrics(userId, organizationId),
    ]);

    const sourceVersions = {
      academicRecords: canonicalMetrics.sources.academicRecords.updatedAt,
      marks: marksMetrics.source.updatedAt,
      ezone: ezoneMetrics.source.updatedAt,
      github: githubMetrics.source.updatedAt,
      certificates: canonicalMetrics.sources.certificates.updatedAt,
      experience: canonicalMetrics.sources.experience.updatedAt,
      skillsTracker: skillsMetrics.source.updatedAt,
      codeArena: codeArenaMetrics.source.updatedAt,
    };

    const projection = {
      projectionVersion: PROJECTION_VERSION,
      generatedAt: new Date().toISOString(),
      stale: false,
      profileId,
      metrics: {
        marksSummary: marksMetrics.marksSummary,
        averageMarks: marksMetrics.averageMarks,
        subjectWisePerformance: marksMetrics.subjectWisePerformance,
        attendance: ezoneMetrics.attendance,
        academicProfileStatus: ezoneMetrics.academicProfileStatus,
        githubRepositoryCount: githubMetrics.githubRepositoryCount,
        completedProjects: githubMetrics.completedProjects,
        academicRecordsCount: canonicalMetrics.academicRecordsCount,
        certificatesCount: canonicalMetrics.certificatesCount,
        experienceCount: canonicalMetrics.experienceCount,
        skills: skillsMetrics.skills,
        codeArena: codeArenaMetrics.metric,
      },
      sources: {
        academicRecords: canonicalMetrics.sources.academicRecords,
        marks: marksMetrics.source,
        ezone: ezoneMetrics.source,
        github: githubMetrics.source,
        certificates: canonicalMetrics.sources.certificates,
        experience: canonicalMetrics.sources.experience,
        skillsTracker: skillsMetrics.source,
        codeArena: codeArenaMetrics.source,
      },
      sourceVersions,
    };

    const duration = Date.now() - startTime;
    logger.info('Growth Hub projection built', {
      userId,
      organizationId,
      profileId,
      projectionVersion: PROJECTION_VERSION,
      durationMs: duration,
      skillsState: skillsMetrics.skills.state,
      skillsTotal: skillsMetrics.skills.value.totalSkills,
    });

    return projection;
  }

  private async resolveProfileId(userId: string, organizationId: string): Promise<string> {
    try {
      const person = await Person.findOne({
        organizationId: toObjectId(organizationId),
        userIds: toObjectId(userId),
      })
        .select('_id')
        .lean();

      return person?._id?.toString() ?? userId;
    } catch {
      return userId;
    }
  }

  private async getMarksMetrics(userId: string, organizationId: string) {
    try {
      const marks = await Mark.find({
        studentId: toObjectId(userId),
        organizationId: toObjectId(organizationId),
      })
        .sort({ updatedAt: -1 })
        .lean();

      if (!marks.length) {
        const source = createSourceState('EMPTY', null, false, 'NO_DATA');
        return {
          source,
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

      const subjectWisePerformance = Object.entries(grouped).map(([subjectId, entry]) => ({
        subjectId,
        averageMarks: Number((entry.sum / entry.count).toFixed(2)),
        count: entry.count,
      }));

      const updatedAt = latestTimestamp(marks.map((mark) => (mark as any).updatedAt || (mark as any).createdAt));
      const source = createSourceState('AVAILABLE', updatedAt, false, null);

      return {
        source,
        marksSummary: createMetric<number>('AVAILABLE', marks.length, updatedAt, false, null),
        averageMarks: createMetric<number>('AVAILABLE', Number(averageMarks.toFixed(2)), updatedAt, false, null),
        subjectWisePerformance: createMetric<SubjectPerformance[]>('AVAILABLE', subjectWisePerformance, updatedAt, false, null),
      };
    } catch {
      const source = createSourceState('ERROR', null, false, 'SOURCE_ERROR');
      return {
        source,
        marksSummary: createMetric<number>('ERROR', null, null, null, 'SOURCE_ERROR'),
        averageMarks: createMetric<number>('ERROR', null, null, null, 'SOURCE_ERROR'),
        subjectWisePerformance: createMetric<SubjectPerformance[]>('ERROR', null, null, null, 'SOURCE_ERROR'),
      };
    }
  }

  private async getCanonicalProfileMetrics(userId: string, organizationId: string) {
    try {
      const person = await Person.findOne({
        organizationId: toObjectId(organizationId),
        userIds: toObjectId(userId),
      })
        .select('_id')
        .lean();

      if (!person?._id) {
        const empty = createSourceState('EMPTY', null, false, 'NO_DATA');
        return {
          academicRecordsCount: createMetric<number>('EMPTY', 0, null, false, 'NO_DATA'),
          certificatesCount: createMetric<number>('EMPTY', 0, null, false, 'NO_DATA'),
          experienceCount: createMetric<number>('EMPTY', 0, null, false, 'NO_DATA'),
          sources: {
            academicRecords: empty,
            certificates: empty,
            experience: empty,
          },
        };
      }

      const [academicRecords, certificates, experiences] = await Promise.all([
        AcademicRecord.find({ organizationId: toObjectId(organizationId), personId: person._id }).sort({ updatedAt: -1 }).lean(),
        CertificateRecord.find({ organizationId: toObjectId(organizationId), personId: person._id }).sort({ updatedAt: -1 }).lean(),
        ExperienceRecord.find({ organizationId: toObjectId(organizationId), personId: person._id }).sort({ updatedAt: -1 }).lean(),
      ]);

      const academicUpdatedAt = latestTimestamp(academicRecords.map((record) => (record as any).updatedAt || (record as any).createdAt));
      const certificateUpdatedAt = latestTimestamp(certificates.map((record) => (record as any).updatedAt || (record as any).createdAt));
      const experienceUpdatedAt = latestTimestamp(experiences.map((record) => (record as any).updatedAt || (record as any).createdAt));

      return {
        academicRecordsCount: createMetric<number>(
          academicRecords.length ? 'AVAILABLE' : 'EMPTY',
          academicRecords.length,
          academicUpdatedAt,
          false,
          academicRecords.length ? null : 'NO_DATA'
        ),
        certificatesCount: createMetric<number>(
          certificates.length ? 'AVAILABLE' : 'EMPTY',
          certificates.length,
          certificateUpdatedAt,
          false,
          certificates.length ? null : 'NO_DATA'
        ),
        experienceCount: createMetric<number>(
          experiences.length ? 'AVAILABLE' : 'EMPTY',
          experiences.length,
          experienceUpdatedAt,
          false,
          experiences.length ? null : 'NO_DATA'
        ),
        sources: {
          academicRecords: createSourceState(academicRecords.length ? 'AVAILABLE' : 'EMPTY', academicUpdatedAt, false, academicRecords.length ? null : 'NO_DATA'),
          certificates: createSourceState(certificates.length ? 'AVAILABLE' : 'EMPTY', certificateUpdatedAt, false, certificates.length ? null : 'NO_DATA'),
          experience: createSourceState(experiences.length ? 'AVAILABLE' : 'EMPTY', experienceUpdatedAt, false, experiences.length ? null : 'NO_DATA'),
        },
      };
    } catch {
      const error = createSourceState('ERROR', null, false, 'SOURCE_ERROR');
      return {
        academicRecordsCount: createMetric<number>('ERROR', null, null, null, 'SOURCE_ERROR'),
        certificatesCount: createMetric<number>('ERROR', null, null, null, 'SOURCE_ERROR'),
        experienceCount: createMetric<number>('ERROR', null, null, null, 'SOURCE_ERROR'),
        sources: {
          academicRecords: error,
          certificates: error,
          experience: error,
        },
      };
    }
  }

  private async getEzoneMetrics(userId: string, organizationId: string) {
    try {
      const profile = await EzoneAcademicProfile.findOne({
        userId: toObjectId(userId),
        organizationId: toObjectId(organizationId),
      }).lean();

      if (!profile) {
        const source = createSourceState('NOT_SYNCED', null, false, 'NOT_SYNCED');
        return {
          source,
          attendance: createMetric<number>('NOT_SYNCED', null, null, null, 'NOT_SYNCED'),
          academicProfileStatus: createMetric<string>('NOT_SYNCED', null, null, null, 'NOT_SYNCED'),
        };
      }

      const updatedAt = toTimestamp((profile as any).lastSyncedAt || (profile as any).updatedAt || (profile as any).createdAt);
      const source = createSourceState('AVAILABLE', updatedAt, false, null);
      const hasAttendance = (profile as any).attendancePercentage !== undefined && (profile as any).attendancePercentage !== null;
      const statusValue = typeof (profile as any).status === 'string' && (profile as any).status.trim().length > 0
        ? String((profile as any).status)
        : null;

      return {
        source,
        attendance: hasAttendance
          ? createMetric<number>('AVAILABLE', Number((profile as any).attendancePercentage), updatedAt, false, null)
          : createMetric<number>('EMPTY', null, updatedAt, false, 'NO_DATA'),
        academicProfileStatus: statusValue
          ? createMetric<string>('AVAILABLE', statusValue, updatedAt, false, null)
          : createMetric<string>('EMPTY', null, updatedAt, false, 'NO_DATA'),
      };
    } catch {
      const source = createSourceState('ERROR', null, false, 'SOURCE_ERROR');
      return {
        source,
        attendance: createMetric<number>('ERROR', null, null, null, 'SOURCE_ERROR'),
        academicProfileStatus: createMetric<string>('ERROR', null, null, null, 'SOURCE_ERROR'),
      };
    }
  }

  private async getGithubMetrics(userId: string, organizationId: string) {
    try {
      const user = await User.findOne({
        _id: toObjectId(userId),
        organizationId: toObjectId(organizationId),
      })
        .select('githubUsername updatedAt')
        .lean();

      if (!user?.githubUsername) {
        const source = createSourceState('NOT_CONNECTED', toTimestamp((user as any)?.updatedAt), false, 'NOT_CONNECTED');
        return {
          source,
          githubRepositoryCount: createMetric<number>('NOT_CONNECTED', null, null, null, 'NOT_CONNECTED'),
          completedProjects: createMetric<number>('NOT_CONNECTED', null, null, null, 'NOT_CONNECTED'),
        };
      }

      const stats = await githubService.getProjectStats(String(user.githubUsername));
      const updatedAt = toTimestamp((user as any).updatedAt);
      const source = createSourceState('AVAILABLE', updatedAt, false, null);

      return {
        source,
        githubRepositoryCount: createMetric<number>('AVAILABLE', Number(stats.total), updatedAt, false, null),
        completedProjects: createMetric<number>('AVAILABLE', Number(stats.completed), updatedAt, false, null),
      };
    } catch (error) {
      const state: GrowthMetricState = error instanceof ConfigurationError ? 'UNAVAILABLE' : 'UNAVAILABLE';
      const reason: GrowthMetricReasonCode = error instanceof ConfigurationError ? 'UNAVAILABLE' : 'SOURCE_ERROR';
      const source = createSourceState(state, null, false, reason);
      return {
        source,
        githubRepositoryCount: createMetric<number>(state, null, null, null, reason),
        completedProjects: createMetric<number>(state, null, null, null, reason),
      };
    }
  }

  private async getSkillsMetrics(userId: string, organizationId: string) {
    try {
      const person = await Person.findOne({
        organizationId: toObjectId(organizationId),
        userIds: toObjectId(userId),
      })
        .select('_id')
        .lean();

      if (!person?._id) {
        const emptyMetrics = this.createEmptySkillsMetrics();
        const source = createSourceState('EMPTY', null, false, 'NO_DATA');
        return {
          source,
          skills: createMetric<SkillsMetrics>('EMPTY', emptyMetrics, null, null, 'NO_DATA'),
        };
      }

      const skillRecords = await SkillRecord.find({
        organizationId: toObjectId(organizationId),
        personId: person._id,
        status: 'ACTIVE',
      }).lean();

      if (!skillRecords.length) {
        const emptyMetrics = this.createEmptySkillsMetrics();
        const source = createSourceState('EMPTY', null, false, 'NO_DATA');
        return {
          source,
          skills: createMetric<SkillsMetrics>('EMPTY', emptyMetrics, null, null, 'NO_DATA'),
        };
      }

      const categoryCounts: Record<string, number> = {};
      let totalProficiency = 0;
      const skillSummaries: SkillSummaryItem[] = [];

      for (const record of skillRecords) {
        const category = (record as any).skillCategory || 'DOMAIN_SPECIFIC';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        totalProficiency += Number((record as any).proficiencyScore || 0);

        skillSummaries.push({
          skillId: (record as any).skillId,
          skillName: (record as any).skillName,
          proficiencyScore: Number((record as any).proficiencyScore || 0),
          evidenceCount: Number((record as any).evidenceCount || 0),
        });
      }

      skillSummaries.sort((a, b) => b.proficiencyScore - a.proficiencyScore);

      const topSkills = skillSummaries.slice(0, 5);
      const weakestSkills = skillSummaries.slice(-5).reverse();

      const latestRecord = skillRecords[0];
      const updatedAt = toTimestamp((latestRecord as any).updatedAt || (latestRecord as any).createdAt);
      const source = createSourceState('AVAILABLE', updatedAt, false, null);

      const skillsMetrics: SkillsMetrics = {
        totalSkills: skillRecords.length,
        averageProficiency: Number((totalProficiency / skillRecords.length).toFixed(2)),
        technicalSkills: categoryCounts[SkillCategory.TECHNICAL] || 0,
        softSkills: categoryCounts[SkillCategory.SOFT] || 0,
        languageSkills: categoryCounts[SkillCategory.LANGUAGE] || 0,
        toolSkills: categoryCounts[SkillCategory.TOOL] || 0,
        topSkills,
        weakestSkills,
        lastProjectionAt: updatedAt,
      };

      return {
        source,
        skills: createMetric<SkillsMetrics>('AVAILABLE', skillsMetrics, updatedAt, false, null),
      };
    } catch {
      const errorSource = createSourceState('ERROR', null, false, 'SOURCE_ERROR');
      const emptyMetrics = this.createEmptySkillsMetrics();
      return {
        source: errorSource,
        skills: createMetric<SkillsMetrics>('ERROR', emptyMetrics, null, null, 'SOURCE_ERROR'),
      };
    }
  }

  private createEmptySkillsMetrics(): SkillsMetrics {
    return {
      totalSkills: 0,
      averageProficiency: 0,
      technicalSkills: 0,
      softSkills: 0,
      languageSkills: 0,
      toolSkills: 0,
      topSkills: [],
      weakestSkills: [],
      lastProjectionAt: null,
    };
  }

  private async getCodeArenaMetrics(userId: string, organizationId: string) {
    try {
      const { CodeArenaReputation } = await import('../../models/CodeArenaReputation');
      const { toObjectId } = await import('../../utils/mongooseHelpers');
      const orgObjId = toObjectId(organizationId);

      const rep = await CodeArenaReputation.findOne({ organizationId: orgObjId, userId });
      const updatedAt = rep ? toTimestamp(rep.updatedAt) : null;
      const source = createSourceState(rep ? 'AVAILABLE' : 'EMPTY', updatedAt, false, rep ? null : 'NO_DATA');

      const value = {
        totalPoints: rep?.totalPoints || 0,
        issuesPosted: rep?.issuesPosted || 0,
        issuesSolved: rep?.issuesSolved || 0,
        acceptanceRate: rep?.acceptanceRate || 0,
        totalRewardsEarned: rep?.totalEarned || 0,
        badges: rep?.badges || [],
      };

      return {
        source,
        metric: createMetric('AVAILABLE', value, updatedAt, false, null),
      };
    } catch {
      const errorSource = createSourceState('ERROR', null, false, 'SOURCE_ERROR');
      return {
        source: errorSource,
        metric: createMetric('ERROR', { totalPoints: 0, issuesPosted: 0, issuesSolved: 0, acceptanceRate: 0, totalRewardsEarned: 0, badges: [] }, null, null, 'SOURCE_ERROR'),
      };
    }
  }
}
