import mongoose, { Schema, Types } from 'mongoose';
import { aiProvider } from '../../core/ai';
import { KnowledgeRecordModel, TargetModuleRoutingDecision } from '../../models/KnowledgeRecord';
import { AcademicRecord } from '../../models/AcademicRecord';
import { CertificateRecord } from '../../models/CertificateRecord';
import { ExperienceRecord } from '../../models/ExperienceRecord';
import { AcademicSchedule } from '../../models/AcademicSchedule';
import StudentResume from '../../models/StudentResume';
import { GrowthHubRecord } from '../../models/GrowthHubRecord';
import { CareerRecord } from '../../models/CareerRecord';
import { ResearchPaperRecord } from '../../models/ResearchPaperRecord';
import { GithubRecord } from '../../models/GithubRecord';
import { Logger } from '../../shared/utils';
import { toObjectId } from '../../utils/mongooseHelpers';
import { ModuleRegistry, ModuleDescriptor } from './moduleRegistry';
import { ModulePopulationLog } from '../../models/ModulePopulationLog';
import { normalizeScheduleDates, normalizeDate } from '../../shared/utils/dateNormalizer';

const logger = new Logger('RoutingEngine');

export { ModuleRegistry, ModuleDescriptor } from './moduleRegistry';

export const moduleRegistry: ModuleDescriptor[] = ModuleRegistry.getInstance().getAll();

export interface IModuleAdapter {
  validateData(fields: Record<string, any>): boolean;
  mapCandidateFields(fields: Record<string, any>, kr: any): Record<string, any>;
  populate(
    fields: Record<string, any>,
    kr: any,
    upload: any,
    personId: Types.ObjectId,
    session: mongoose.ClientSession,
    reviewer: any,
    populationLog: typeof ModulePopulationLog
  ): Promise<string[]>;
  rollback(
    processingId: string,
    organizationId: string,
    personId: string,
    session: mongoose.ClientSession,
    populationLog: typeof ModulePopulationLog
  ): Promise<string[]>;
  healthCheck(): Promise<{ healthy: boolean; message?: string }>;
}

// ── Base Adapter with Idempotency ──────────────────────────────────────────────

abstract class BaseAdapter implements IModuleAdapter {
  abstract validateData(fields: Record<string, any>): boolean;
  abstract mapCandidateFields(fields: Record<string, any>, kr: any): Record<string, any>;
  abstract writeCanonical(
    fields: Record<string, any>,
    kr: any,
    upload: any,
    personId: Types.ObjectId,
    session: mongoose.ClientSession,
    reviewer: any
  ): Promise<string[]>;
  abstract deleteCanonical(
    recordIds: string[],
    organizationId: string,
    session: mongoose.ClientSession
  ): Promise<void>;

  async populate(
    fields: Record<string, any>,
    kr: any,
    upload: any,
    personId: Types.ObjectId,
    session: mongoose.ClientSession,
    reviewer: any,
    populationLog: typeof ModulePopulationLog
  ): Promise<string[]> {
    const startTime = Date.now();
    const existingLog = await populationLog.findOne({
      processingId: kr.processingId,
      moduleId: (this.constructor as any).MODULE_ID,
      action: 'POPULATE',
      status: 'SUCCESS',
    }).session(session);

    if (existingLog) {
      logger.info('Population skipped - already processed', {
        processingId: kr.processingId,
        moduleId: (this.constructor as any).MODULE_ID,
        previousRecordIds: existingLog.recordIds,
      });
      await populationLog.create(
        [
          {
            processingId: kr.processingId,
            knowledgeRecordId: kr._id,
            organizationId: reviewer.organizationId,
            personId,
            moduleId: (this.constructor as any).MODULE_ID,
            canonicalCollection: (this.constructor as any).CANONICAL_COLLECTION,
            recordIds: existingLog.recordIds,
            action: 'POPULATE',
            status: 'SKIPPED',
            executionTimeMs: Date.now() - startTime,
            metadata: { reason: 'already_processed' },
          },
        ],
        { session }
      );
      return existingLog.recordIds.map(String);
    }

    const mapped = this.mapCandidateFields(fields, kr);
    const recordIds = await this.writeCanonical(mapped, kr, upload, personId, session, reviewer);

    await populationLog.create(
      [
        {
          processingId: kr.processingId,
          knowledgeRecordId: kr._id,
          organizationId: reviewer.organizationId,
          personId,
          moduleId: (this.constructor as any).MODULE_ID,
          canonicalCollection: (this.constructor as any).CANONICAL_COLLECTION,
          recordIds: recordIds.map((id: string) => toObjectId(id)),
          action: 'POPULATE',
          status: 'SUCCESS',
          executionTimeMs: Date.now() - startTime,
        },
      ],
      { session }
    );

    logger.info('Population completed', {
      processingId: kr.processingId,
      moduleId: (this.constructor as any).MODULE_ID,
      recordIds,
      executionTimeMs: Date.now() - startTime,
    });

    return recordIds;
  }

  async rollback(
    processingId: string,
    organizationId: string,
    personId: string,
    session: mongoose.ClientSession,
    populationLog: typeof ModulePopulationLog
  ): Promise<string[]> {
    const logs = await populationLog
      .find({
        processingId,
        moduleId: (this.constructor as any).MODULE_ID,
        action: 'POPULATE',
        status: 'SUCCESS',
      })
      .session(session);

    const allRecordIds: string[] = [];
    for (const log of logs) {
      const recordIds = log.recordIds.map(String);
      await this.deleteCanonical(recordIds, organizationId, session);
      allRecordIds.push(...recordIds);
    }

    await populationLog
      .deleteMany({
        processingId,
        moduleId: (this.constructor as any).MODULE_ID,
      })
      .session(session);

    logger.info('Rollback completed', {
      processingId,
      moduleId: (this.constructor as any).MODULE_ID,
      removedRecords: allRecordIds,
    });

    return allRecordIds;
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    return { healthy: true };
  }
}

// ── Adapters Implementation ───────────────────────────────────────────────────

class GrowthAdapter extends BaseAdapter {
  static MODULE_ID = 'growth_hub';
  static CANONICAL_COLLECTION = 'GrowthHubRecord';

  validateData(fields: Record<string, any>): boolean {
    return true;
  }
  mapCandidateFields(fields: Record<string, any>, kr: any): Record<string, any> {
    return fields;
  }
  async writeCanonical(
    fields: Record<string, any>,
    kr: any,
    upload: any,
    personId: Types.ObjectId,
    session: mongoose.ClientSession,
    reviewer: any
  ): Promise<string[]> {
    const orgOid = toObjectId(reviewer.organizationId);
    const result = await GrowthHubRecord.findOneAndUpdate(
      { organizationId: orgOid, personId },
      {
        $set: {
          marks: fields.subjects ?? fields.marks ?? [],
          attendance: fields.attendance ?? null,
          schedule: fields.schedule ?? [],
          certificates: fields.certificates ?? (fields.title ? [fields] : []),
          experience: fields.experience ?? [],
          sourceDocumentId: upload._id,
          rawConfidence: Number(kr.confidenceScore ?? 0),
        }
      },
      { upsert: true, new: true, session }
    );
    return [String(result._id)];
  }
  async deleteCanonical(
    recordIds: string[],
    organizationId: string,
    session: mongoose.ClientSession
  ): Promise<void> {
    const orgOid = toObjectId(organizationId);
    await GrowthHubRecord.deleteMany({ _id: { $in: recordIds.map(toObjectId) }, organizationId: orgOid }).session(session);
  }
}

class AcademicScheduleAdapter extends BaseAdapter {
  static MODULE_ID = 'academic_schedule';
  static CANONICAL_COLLECTION = 'AcademicSchedule';

  validateData(fields: Record<string, any>): boolean {
    return Array.isArray(fields.schedule);
  }
  mapCandidateFields(fields: Record<string, any>, kr: any): Record<string, any> {
    return { schedule: fields.schedule ?? [] };
  }
  async writeCanonical(
    fields: Record<string, any>,
    kr: any,
    upload: any,
    personId: Types.ObjectId,
    session: mongoose.ClientSession,
    reviewer: any
  ): Promise<string[]> {
    const orgOid = toObjectId(reviewer.organizationId);
    const schedule = normalizeScheduleDates(fields.schedule ?? []);
    const result = await AcademicSchedule.findOneAndUpdate(
      { organizationId: orgOid, personId },
      {
        $set: {
          sourceProcessingId: kr.processingId,
          rawConfidence: Number(kr.confidenceScore ?? 0),
          schedule,
          approvedBy: reviewer.userId,
          approvedAt: new Date(),
        }
      },
      { upsert: true, new: true, session }
    );
    return [String(result._id)];
  }
  async deleteCanonical(
    recordIds: string[],
    organizationId: string,
    session: mongoose.ClientSession
  ): Promise<void> {
    const orgOid = toObjectId(organizationId);
    await AcademicSchedule.deleteMany({ _id: { $in: recordIds.map(toObjectId) }, organizationId: orgOid }).session(session);
  }
}

class ResumeAdapter extends BaseAdapter {
  static MODULE_ID = 'resume_builder';
  static CANONICAL_COLLECTION = 'StudentResume';

  validateData(fields: Record<string, any>): boolean {
    return true;
  }
  mapCandidateFields(fields: Record<string, any>, kr: any): Record<string, any> {
    return fields;
  }
  async writeCanonical(
    fields: Record<string, any>,
    kr: any,
    upload: any,
    personId: Types.ObjectId,
    session: mongoose.ClientSession,
    reviewer: any
  ): Promise<string[]> {
    const userOid = toObjectId(reviewer.userId);
    const templateOid = toObjectId('64c58cfcb6fcd8ef57c0e5a8');
    const result = await StudentResume.findOneAndUpdate(
      { userId: userOid },
      {
        $set: {
          userId: userOid,
          templateId: templateOid,
          filledData: fields,
        }
      },
      { upsert: true, new: true, session }
    );
    return [String(result._id)];
  }
  async deleteCanonical(
    recordIds: string[],
    organizationId: string,
    session: mongoose.ClientSession
  ): Promise<void> {
    await StudentResume.deleteMany({ _id: { $in: recordIds.map(toObjectId) } }).session(session);
  }
}

class ResearchAdapter extends BaseAdapter {
  static MODULE_ID = 'research_wing';
  static CANONICAL_COLLECTION = 'ResearchPaperRecord';

  validateData(fields: Record<string, any>): boolean {
    return true;
  }
  mapCandidateFields(fields: Record<string, any>, kr: any): Record<string, any> {
    return fields;
  }
  async writeCanonical(
    fields: Record<string, any>,
    kr: any,
    upload: any,
    personId: Types.ObjectId,
    session: mongoose.ClientSession,
    reviewer: any
  ): Promise<string[]> {
    const orgOid = toObjectId(reviewer.organizationId);
    const result = await ResearchPaperRecord.findOneAndUpdate(
      { organizationId: orgOid, personId, title: fields.title ?? 'Unknown Title' },
      {
        $set: {
          authors: fields.authors ?? [],
          journal: fields.journal ?? 'Unknown Journal',
          abstract: fields.abstract ?? '',
          sourceDocumentId: upload._id,
          rawConfidence: Number(kr.confidenceScore ?? 0),
        }
      },
      { upsert: true, new: true, session }
    );
    return [String(result._id)];
  }
  async deleteCanonical(
    recordIds: string[],
    organizationId: string,
    session: mongoose.ClientSession
  ): Promise<void> {
    const orgOid = toObjectId(organizationId);
    await ResearchPaperRecord.deleteMany({ _id: { $in: recordIds.map(toObjectId) }, organizationId: orgOid }).session(session);
  }
}

class CertificatesAdapter extends BaseAdapter {
  static MODULE_ID = 'certificates';
  static CANONICAL_COLLECTION = 'CertificateRecord';

  validateData(fields: Record<string, any>): boolean {
    return true;
  }
  mapCandidateFields(fields: Record<string, any>, kr: any): Record<string, any> {
    return fields;
  }
  async writeCanonical(
    fields: Record<string, any>,
    kr: any,
    upload: any,
    personId: Types.ObjectId,
    session: mongoose.ClientSession,
    reviewer: any
  ): Promise<string[]> {
    const orgOid = toObjectId(reviewer.organizationId);
    const result = await CertificateRecord.findOneAndUpdate(
      {
        organizationId: orgOid,
        personId,
        title: fields.title ?? fields.certificateName ?? 'Unknown Certificate',
        issuer: fields.issuer ?? fields.issuingOrganization ?? 'Unknown',
      },
      {
        $set: {
          issuedDate: fields.issueDate ? new Date(normalizeDate(fields.issueDate).isoDateTime) : new Date(),
          rawConfidence: Number(kr.confidenceScore ?? 0),
          sourceDocumentId: upload._id,
        }
      },
      { upsert: true, new: true, session }
    );
    return [String(result._id)];
  }
  async deleteCanonical(
    recordIds: string[],
    organizationId: string,
    session: mongoose.ClientSession
  ): Promise<void> {
    const orgOid = toObjectId(organizationId);
    await CertificateRecord.deleteMany({ _id: { $in: recordIds.map(toObjectId) }, organizationId: orgOid }).session(session);
  }
}

class CareerAdapter extends BaseAdapter {
  static MODULE_ID = 'career_profile';
  static CANONICAL_COLLECTION = 'CareerRecord';

  validateData(fields: Record<string, any>): boolean {
    return true;
  }
  mapCandidateFields(fields: Record<string, any>, kr: any): Record<string, any> {
    return fields;
  }
  async writeCanonical(
    fields: Record<string, any>,
    kr: any,
    upload: any,
    personId: Types.ObjectId,
    session: mongoose.ClientSession,
    reviewer: any
  ): Promise<string[]> {
    const orgOid = toObjectId(reviewer.organizationId);
    const result = await CareerRecord.findOneAndUpdate(
      { organizationId: orgOid, personId },
      {
        $set: {
          skills: fields.skills ?? [],
          experience: fields.experience ?? [],
          projects: fields.projects ?? [],
          education: fields.education ?? [],
          sourceDocumentId: upload._id,
          rawConfidence: Number(kr.confidenceScore ?? 0),
        }
      },
      { upsert: true, new: true, session }
    );
    return [String(result._id)];
  }
  async deleteCanonical(
    recordIds: string[],
    organizationId: string,
    session: mongoose.ClientSession
  ): Promise<void> {
    const orgOid = toObjectId(organizationId);
    await CareerRecord.deleteMany({ _id: { $in: recordIds.map(toObjectId) }, organizationId: orgOid }).session(session);
  }
}

class GithubAdapter extends BaseAdapter {
  static MODULE_ID = 'github';
  static CANONICAL_COLLECTION = 'GithubRecord';

  validateData(fields: Record<string, any>): boolean {
    return true;
  }
  mapCandidateFields(fields: Record<string, any>, kr: any): Record<string, any> {
    return fields;
  }
  async writeCanonical(
    fields: Record<string, any>,
    kr: any,
    upload: any,
    personId: Types.ObjectId,
    session: mongoose.ClientSession,
    reviewer: any
  ): Promise<string[]> {
    const orgOid = toObjectId(reviewer.organizationId);
    const result = await GithubRecord.findOneAndUpdate(
      { organizationId: orgOid, personId },
      {
        $set: {
          repositories: fields.repositories ?? [],
          languages: fields.languages ?? {},
          contributions: fields.contributions ?? {},
          sourceDocumentId: upload._id,
          rawConfidence: Number(kr.confidenceScore ?? 0),
        }
      },
      { upsert: true, new: true, session }
    );
    return [String(result._id)];
  }
  async deleteCanonical(
    recordIds: string[],
    organizationId: string,
    session: mongoose.ClientSession
  ): Promise<void> {
    const orgOid = toObjectId(organizationId);
    await GithubRecord.deleteMany({ _id: { $in: recordIds.map(toObjectId) }, organizationId: orgOid }).session(session);
  }
}

class AcademicRecordsAdapter extends BaseAdapter {
  static MODULE_ID = 'academic_records';
  static CANONICAL_COLLECTION = 'AcademicRecord';

  validateData(fields: Record<string, any>): boolean {
    return true;
  }
  mapCandidateFields(fields: Record<string, any>, kr: any): Record<string, any> {
    return fields;
  }
  async writeCanonical(
    fields: Record<string, any>,
    kr: any,
    upload: any,
    personId: Types.ObjectId,
    session: mongoose.ClientSession,
    reviewer: any
  ): Promise<string[]> {
    const subjects: any[] = fields.subjects ?? [];
    const orgOid = toObjectId(reviewer.organizationId);
    const sourceOid = upload._id;
    const ids: string[] = [];

    for (const sub of subjects) {
      const filter = {
        organizationId: orgOid,
        personId,
        subjectCode: sub.code ?? sub.name ?? 'UNKNOWN',
        semester: sub.semester ?? kr.extractedEntities?.semester ?? 'UNKNOWN',
        year: Number(sub.year ?? new Date().getFullYear()),
      };
      const term = sub.term ?? kr.extractedEntities?.term ?? 'Term 1';
      const academicYear = Number(sub.academicYear ?? kr.extractedEntities?.academicYear ?? new Date().getFullYear());
      const semesterNumber = sub.semesterNumber ? Number(sub.semesterNumber) : undefined;
      const update = {
        $set: {
          subjectName: sub.name ?? sub.code ?? 'UNKNOWN',
          grade: sub.grade ?? 'N/A',
          gradePoints: Number(sub.gradePoints ?? 0),
          gradingStatus: sub.gradingStatus ?? 'Graded',
          credits: Number(sub.credits ?? 0),
          status: 'APPROVED',
          rawConfidence: Number(kr.confidenceScore ?? 0),
          sourceDocumentId: sourceOid,
          term,
          academicYear,
          ...(semesterNumber ? { semesterNumber } : {}),
        },
      };
      const result = await AcademicRecord.findOneAndUpdate(filter, update, {
        upsert: true,
        new: true,
        session,
      });
      ids.push(String(result._id));
    }
    return ids;
  }
  async deleteCanonical(
    recordIds: string[],
    organizationId: string,
    session: mongoose.ClientSession
  ): Promise<void> {
    const orgOid = toObjectId(organizationId);
    await AcademicRecord.deleteMany({ _id: { $in: recordIds.map(toObjectId) }, organizationId: orgOid }).session(session);
  }
}

// ── New Phase 2 Adapters ───────────────────────────────────────────────────────

class SkillsAdapter extends BaseAdapter {
  static MODULE_ID = 'skills_tracker';
  static CANONICAL_COLLECTION = 'CareerRecord';

  validateData(fields: Record<string, any>): boolean {
    return true;
  }
  mapCandidateFields(fields: Record<string, any>, kr: any): Record<string, any> {
    return {
      skills: fields.skills ?? [],
      sourceDocumentId: kr._id,
    };
  }
  async writeCanonical(
    fields: Record<string, any>,
    kr: any,
    upload: any,
    personId: Types.ObjectId,
    session: mongoose.ClientSession,
    reviewer: any
  ): Promise<string[]> {
    const orgOid = toObjectId(reviewer.organizationId);
    const result = await CareerRecord.findOneAndUpdate(
      { organizationId: orgOid, personId },
      {
        $set: {
          skills: fields.skills ?? [],
          sourceDocumentId: upload._id,
          rawConfidence: Number(kr.confidenceScore ?? 0),
        }
      },
      { upsert: true, new: true, session }
    );
    return [String(result._id)];
  }
  async deleteCanonical(
    recordIds: string[],
    organizationId: string,
    session: mongoose.ClientSession
  ): Promise<void> {
    const orgOid = toObjectId(organizationId);
    await CareerRecord.deleteMany({ _id: { $in: recordIds.map(toObjectId) }, organizationId: orgOid }).session(session);
  }
}

class CodeArenaAdapter extends BaseAdapter {
  static MODULE_ID = 'code_arena';
  static CANONICAL_COLLECTION = 'GithubRecord';

  validateData(fields: Record<string, any>): boolean {
    return true;
  }
  mapCandidateFields(fields: Record<string, any>, kr: any): Record<string, any> {
    return {
      languages: fields.languages ?? {},
      contributions: fields.contributions ?? {},
      sourceDocumentId: kr._id,
    };
  }
  async writeCanonical(
    fields: Record<string, any>,
    kr: any,
    upload: any,
    personId: Types.ObjectId,
    session: mongoose.ClientSession,
    reviewer: any
  ): Promise<string[]> {
    const orgOid = toObjectId(reviewer.organizationId);
    const result = await GithubRecord.findOneAndUpdate(
      { organizationId: orgOid, personId },
      {
        $set: {
          languages: fields.languages ?? {},
          contributions: fields.contributions ?? {},
          sourceDocumentId: upload._id,
          rawConfidence: Number(kr.confidenceScore ?? 0),
        }
      },
      { upsert: true, new: true, session }
    );
    return [String(result._id)];
  }
  async deleteCanonical(
    recordIds: string[],
    organizationId: string,
    session: mongoose.ClientSession
  ): Promise<void> {
    const orgOid = toObjectId(organizationId);
    await GithubRecord.deleteMany({ _id: { $in: recordIds.map(toObjectId) }, organizationId: orgOid }).session(session);
  }
}

class FacultyCabinAdapter extends BaseAdapter {
  static MODULE_ID = 'faculty_cabin';
  static CANONICAL_COLLECTION = 'Person';

  validateData(fields: Record<string, any>): boolean {
    return true;
  }
  mapCandidateFields(fields: Record<string, any>, kr: any): Record<string, any> {
    return {
      facultyName: fields.facultyName ?? fields.faculty ?? 'Unknown Faculty',
      mentoringTopics: fields.mentoringTopics ?? [],
      officeHours: fields.officeHours ?? null,
      sourceDocumentId: kr._id,
    };
  }
  async writeCanonical(
    fields: Record<string, any>,
    kr: any,
    upload: any,
    personId: Types.ObjectId,
    session: mongoose.ClientSession,
    reviewer: any
  ): Promise<string[]> {
    const orgOid = toObjectId(reviewer.organizationId);
    const Person = require('../../models/Person').default;
    const result = await Person.findOneAndUpdate(
      { organizationId: orgOid, _id: personId },
      {
        $set: {
          facultyName: fields.facultyName,
          mentoringTopics: fields.mentoringTopics,
          officeHours: fields.officeHours,
          sourceDocumentId: upload._id,
        }
      },
      { upsert: true, new: true, session }
    );
    return [String(result._id)];
  }
  async deleteCanonical(
    recordIds: string[],
    organizationId: string,
    session: mongoose.ClientSession
  ): Promise<void> {
    const orgOid = toObjectId(organizationId);
    const Person = require('../../models/Person').default;
    await Person.deleteMany({ _id: { $in: recordIds.map(toObjectId) }, organizationId: orgOid }).session(session);
  }
}

class EmotionalSupportAdapter extends BaseAdapter {
  static MODULE_ID = 'emotional_support';
  static CANONICAL_COLLECTION = 'AILogAnalysis';

  validateData(fields: Record<string, any>): boolean {
    return true;
  }
  mapCandidateFields(fields: Record<string, any>, kr: any): Record<string, any> {
    return {
      emotionalState: fields.emotionalState ?? fields.mood ?? 'neutral',
      chatHistory: fields.chatHistory ?? [],
      sourceDocumentId: kr._id,
    };
  }
  async writeCanonical(
    fields: Record<string, any>,
    kr: any,
    upload: any,
    personId: Types.ObjectId,
    session: mongoose.ClientSession,
    reviewer: any
  ): Promise<string[]> {
    const orgOid = toObjectId(reviewer.organizationId);
    const AILogAnalysis = require('../../models/AILogAnalysis').default;
    const result = await AILogAnalysis.findOneAndUpdate(
      { organizationId: orgOid, personId },
      {
        $set: {
          emotionalState: fields.emotionalState,
          chatHistory: fields.chatHistory,
          sourceDocumentId: upload._id,
          rawConfidence: Number(kr.confidenceScore ?? 0),
        }
      },
      { upsert: true, new: true, session }
    );
    return [String(result._id)];
  }
  async deleteCanonical(
    recordIds: string[],
    organizationId: string,
    session: mongoose.ClientSession
  ): Promise<void> {
    const orgOid = toObjectId(organizationId);
    const AILogAnalysis = require('../../models/AILogAnalysis').default;
    await AILogAnalysis.deleteMany({ _id: { $in: recordIds.map(toObjectId) }, organizationId: orgOid }).session(session);
  }
}

class EventsAdapter extends BaseAdapter {
  static MODULE_ID = 'events';
  static CANONICAL_COLLECTION = 'KnowledgeRecord';

  validateData(fields: Record<string, any>): boolean {
    return true;
  }
  mapCandidateFields(fields: Record<string, any>, kr: any): Record<string, any> {
    return {
      events: fields.events ?? [],
      extractedEntities: fields.extractedEntities ?? {},
      sourceDocumentId: kr._id,
    };
  }
  async writeCanonical(
    fields: Record<string, any>,
    kr: any,
    upload: any,
    personId: Types.ObjectId,
    session: mongoose.ClientSession,
    reviewer: any
  ): Promise<string[]> {
    const orgOid = toObjectId(reviewer.organizationId);
    const result = await KnowledgeRecordModel.findOneAndUpdate(
      { processingId: kr.processingId, organizationId: orgOid },
      {
        $set: {
          extractedEntities: fields.extractedEntities,
          events: fields.events,
          sourceDocumentId: upload._id,
        }
      },
      { upsert: true, new: true, session }
    );
    return [String(result._id)];
  }
  async deleteCanonical(
    recordIds: string[],
    organizationId: string,
    session: mongoose.ClientSession
  ): Promise<void> {
    const orgOid = toObjectId(organizationId);
    await KnowledgeRecordModel.deleteMany({ _id: { $in: recordIds.map(toObjectId) }, organizationId: orgOid }).session(session);
  }
}

class MailExplorerAdapter extends BaseAdapter {
  static MODULE_ID = 'mail_explorer';
  static CANONICAL_COLLECTION = 'KnowledgeRecord';

  validateData(fields: Record<string, any>): boolean {
    return true;
  }
  mapCandidateFields(fields: Record<string, any>, kr: any): Record<string, any> {
    return {
      emails: fields.emails ?? [],
      attachments: fields.attachments ?? [],
      metadata: fields.metadata ?? {},
      sourceDocumentId: kr._id,
    };
  }
  async writeCanonical(
    fields: Record<string, any>,
    kr: any,
    upload: any,
    personId: Types.ObjectId,
    session: mongoose.ClientSession,
    reviewer: any
  ): Promise<string[]> {
    const orgOid = toObjectId(reviewer.organizationId);
    const result = await KnowledgeRecordModel.findOneAndUpdate(
      { processingId: kr.processingId, organizationId: orgOid },
      {
        $set: {
          emails: fields.emails,
          attachments: fields.attachments,
          metadata: fields.metadata,
          sourceDocumentId: upload._id,
        }
      },
      { upsert: true, new: true, session }
    );
    return [String(result._id)];
  }
  async deleteCanonical(
    recordIds: string[],
    organizationId: string,
    session: mongoose.ClientSession
  ): Promise<void> {
    const orgOid = toObjectId(organizationId);
    await KnowledgeRecordModel.deleteMany({ _id: { $in: recordIds.map(toObjectId) }, organizationId: orgOid }).session(session);
  }
}

const adaptersMap: Record<string, IModuleAdapter> = {
  growth_hub: new GrowthAdapter(),
  academic_schedule: new AcademicScheduleAdapter(),
  resume_builder: new ResumeAdapter(),
  research_wing: new ResearchAdapter(),
  certificates: new CertificatesAdapter(),
  career_profile: new CareerAdapter(),
  github: new GithubAdapter(),
  academic_records: new AcademicRecordsAdapter(),
  skills_tracker: new SkillsAdapter(),
  code_arena: new CodeArenaAdapter(),
  faculty_cabin: new FacultyCabinAdapter(),
  emotional_support: new EmotionalSupportAdapter(),
  events: new EventsAdapter(),
  mail_explorer: new MailExplorerAdapter(),
};

// ── Routing Executor ───────────────────────────────────────────────────────────

export interface RoutingExecutionWrite {
  moduleId: string;
  canonicalCollection: string;
  recordIds: string[];
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  error?: string;
  executionTimeMs: number;
}

export interface RoutingExecutorResult {
  primaryCollection: string;
  primaryRecordIds: string[];
  writes: RoutingExecutionWrite[];
}

export class RoutingExecutor {
  static async execute(params: {
    kr: any;
    upload: any;
    personId: Types.ObjectId;
    session: mongoose.ClientSession;
    reviewer: any;
    finalFields: Record<string, any>;
    routingDecision: TargetModuleRoutingDecision;
  }): Promise<RoutingExecutorResult> {
    const { kr, upload, personId, session, reviewer, finalFields, routingDecision } = params;

    const writes: RoutingExecutionWrite[] = [];
    const targetModuleIds = [routingDecision.primaryModule, ...routingDecision.secondaryModules].filter(Boolean);

    logger.info('Executing routing decisions', {
      processingId: kr.processingId,
      targetModules: targetModuleIds,
    });

    for (const moduleId of targetModuleIds) {
      const reg = moduleRegistry.find(m => m.moduleId === moduleId);
      const adapter = adaptersMap[moduleId];

      if (!reg || !adapter) {
        logger.warn(`No registered module or adapter found for moduleId: ${moduleId}. Skipping.`);
        writes.push({
          moduleId,
          canonicalCollection: 'UNKNOWN',
          recordIds: [],
          status: 'FAILED',
          error: 'No registered module or adapter found',
          executionTimeMs: 0,
        });
        continue;
      }

      const startTime = Date.now();
      try {
        if (!adapter.validateData(finalFields)) {
          logger.warn(`Validation failed for adapter: ${moduleId}. Skipping write.`);
          writes.push({
            moduleId,
            canonicalCollection: reg.canonicalCollection,
            recordIds: [],
            status: 'SKIPPED',
            error: 'Validation failed',
            executionTimeMs: Date.now() - startTime,
          });
          continue;
        }

        const recordIds = await adapter.populate(finalFields, kr, upload, personId, session, reviewer, ModulePopulationLog);

        writes.push({
          moduleId,
          canonicalCollection: reg.canonicalCollection,
          recordIds,
          status: 'SUCCESS',
          executionTimeMs: Date.now() - startTime,
        });
      } catch (err: any) {
        logger.error(`Population failed for module: ${moduleId}`, {
          processingId: kr.processingId,
          error: err.message,
        });
        writes.push({
          moduleId,
          canonicalCollection: reg.canonicalCollection,
          recordIds: [],
          status: 'FAILED',
          error: err.message,
          executionTimeMs: Date.now() - startTime,
        });
      }
    }

    // Determine primary collection and recordIds
    let primaryCollection = 'NONE';
    let primaryRecordIds: string[] = [];

    const primaryWrite = writes.find(w => w.moduleId === routingDecision.primaryModule && w.status === 'SUCCESS');
    if (primaryWrite) {
      primaryCollection = primaryWrite.canonicalCollection;
      primaryRecordIds = primaryWrite.recordIds;
    }

    return {
      primaryCollection,
      primaryRecordIds,
      writes,
    };
  }

  static async rollback(params: {
    processingId: string;
    organizationId: string;
    personId: string;
    session: mongoose.ClientSession;
    routingDecision: TargetModuleRoutingDecision;
  }): Promise<RoutingExecutionWrite[]> {
    const { processingId, organizationId, personId, session, routingDecision } = params;
    const targetModuleIds = [routingDecision.primaryModule, ...routingDecision.secondaryModules].filter(Boolean);
    const writes: RoutingExecutionWrite[] = [];

    logger.info('Executing routing rollback', {
      processingId,
      targetModules: targetModuleIds,
    });

    for (const moduleId of targetModuleIds) {
      const adapter = adaptersMap[moduleId];
      if (!adapter) {
        logger.warn(`No adapter found for moduleId: ${moduleId} during rollback. Skipping.`);
        continue;
      }

      const startTime = Date.now();
      try {
        const recordIds = await adapter.rollback(processingId, organizationId, personId, session, ModulePopulationLog);
        writes.push({
          moduleId,
          canonicalCollection: (adapter.constructor as any).CANONICAL_COLLECTION,
          recordIds,
          status: 'SUCCESS',
          executionTimeMs: Date.now() - startTime,
        });
      } catch (err: any) {
        logger.error(`Rollback failed for module: ${moduleId}`, {
          processingId,
          error: err.message,
        });
        writes.push({
          moduleId,
          canonicalCollection: (adapter.constructor as any).CANONICAL_COLLECTION,
          recordIds: [],
          status: 'FAILED',
          error: err.message,
          executionTimeMs: Date.now() - startTime,
        });
      }
    }

    return writes;
  }

  static async healthCheck(): Promise<Record<string, { healthy: boolean; message?: string }>> {
    const results: Record<string, { healthy: boolean; message?: string }> = {};
    for (const [moduleId, adapter] of Object.entries(adaptersMap)) {
      try {
        results[moduleId] = await adapter.healthCheck();
      } catch (err: any) {
        results[moduleId] = { healthy: false, message: err.message };
      }
    }
    return results;
  }
}

export { adaptersMap };

export class ModuleRoutingEngine {
  static getFormattedModuleRegistry(): string {
    return moduleRegistry
      .map(m => `- id: "${m.moduleId}", name: "${m.moduleName}", categories: [${m.acceptedDocumentCategories.join(', ')}]`)
      .join('\n');
  }

  static async determineRouting(params: {
    processingId: string;
    rawContent: string;
    extractedEntities: Record<string, any>;
    candidateFields: Record<string, any>;
  }): Promise<TargetModuleRoutingDecision> {
    const { processingId, rawContent, extractedEntities, candidateFields } = params;

    const moduleList = moduleRegistry
      .map(m => `- id: "${m.moduleId}", name: "${m.moduleName}", categories: [${m.acceptedDocumentCategories.join(', ')}]`)
      .join('\n');

    const prompt = `You are an Academic Universe module router.

Available modules:
${moduleList}

Document content (first 50000 chars):
${rawContent.slice(0, 50000)}

Extracted entities: ${JSON.stringify(extractedEntities)}
Candidate fields: ${JSON.stringify(candidateFields)}

Return JSON:
{
  "documentType": "TRANSCRIPT|MARKSHEET|CERTIFICATE|RESUME|...",
  "targetModules": [
    { "moduleId": "growth_hub", "confidence": 0.95, "reason": "..." },
    { "moduleId": "academic_records", "confidence": 0.8, "reason": "..." }
  ]
}`;

    try {
      const aiResponse = await aiProvider.generateJSON<any>(prompt, {
        systemInstruction: 'Return only valid JSON. No markdown. No explanation.',
        temperature: 0.2,
      });

      const docType = aiResponse.documentType || 'UNKNOWN';
      const targetModules = Array.isArray(aiResponse.targetModules) ? aiResponse.targetModules : [];

      let confidence = Number(aiResponse.confidence ?? 0);
      if (confidence === 0 && targetModules.length > 0) {
        const maxConf = targetModules.reduce((max: number, m: any) => Math.max(max, Number(m.confidence ?? 0)), 0);
        const avgConf = targetModules.reduce((sum: number, m: any) => sum + Number(m.confidence ?? 0), 0) / targetModules.length;
        confidence = Number((maxConf * 0.7 + avgConf * 0.3).toFixed(2));
      }

      let primaryModule = '';
      const secondaryModules: string[] = [];

      const sortedModules = targetModules
        .filter((m: any) => m && m.moduleId)
        .sort((a: any, b: any) => {
          const confDiff = (b.confidence ?? 0) - (a.confidence ?? 0);
          if (Math.abs(confDiff) > 0.01) return confDiff;
          const regA = moduleRegistry.find(r => r.moduleId === a.moduleId);
          const regB = moduleRegistry.find(r => r.moduleId === b.moduleId);
          return (regA?.priority ?? 99) - (regB?.priority ?? 99);
        });

      if (sortedModules.length > 0) {
        primaryModule = sortedModules[0].moduleId;
        for (let i = 1; i < sortedModules.length; i++) {
          secondaryModules.push(sortedModules[i].moduleId);
        }
      }

      const reasoning = sortedModules.map((m: any) => `${m.moduleId}: ${m.reason ?? ''}`).join('; ') || 'No matching destination modules found.';

      return {
        documentType: docType,
        primaryModule,
        secondaryModules,
        routingConfidence: confidence,
        reasoning,
      };
    } catch (err: any) {
      logger.error('Routing determination failed, using fallback', { error: err.message });
      return {
        documentType: 'UNKNOWN',
        primaryModule: '',
        secondaryModules: [],
        routingConfidence: 0.0,
        reasoning: `Routing recommendation failed: ${err.message}`,
      };
    }
  }
}

