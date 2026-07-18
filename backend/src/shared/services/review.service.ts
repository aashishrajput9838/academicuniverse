/**
 * ReviewService
 *
 * Implements the complete Human-in-the-Loop approval workflow:
 *
 *   saveDraft   → Stores edited candidateFields; keeps status PENDING_REVIEW.
 *   reject      → Marks KnowledgeRecord as REJECTED; logs reason.
 *   approve     → Validates, runs DB transaction to write canonical collections,
 *                 publishes events for Growth Hub / Module refresh.
 *   rollback    → Admin-only: reverts canonical records to pre-approval state.
 *   getHistory  → Returns full immutable audit trail for a processingId.
 *
 * AI NEVER writes canonical collections.
 * Only APPROVED candidate data may become canonical.
 * No cross-tenant access — every operation enforces organizationId.
 */

import mongoose from 'mongoose';
import { KnowledgeRecordModel } from '../../models/KnowledgeRecord';
import { ReviewHistory } from '../../models/ReviewHistory';
import { AcademicRecord } from '../../models/AcademicRecord';
import { CertificateRecord } from '../../models/CertificateRecord';
import { ExperienceRecord } from '../../models/ExperienceRecord';
import { Person } from '../../models/Person';
import { AcademicSchedule } from '../../models/AcademicSchedule';
import { UaipUpload } from '../../models/UaipUpload';
import { eventBus } from '../../events/EventBus';
import { UaipEvent } from '../../events/UaipEvents';
import { normalizeScheduleDates, normalizeDate } from '../utils/dateNormalizer';
import { toObjectId } from '../../utils/mongooseHelpers';
import { RoutingExecutor, RoutingExecutionWrite } from '../../shared/application/routingEngine';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReviewerContext {
  userId: string;
  role: string;
  organizationId: string;
}

export interface SaveDraftParams {
  processingId: string;
  editedFields: Record<string, any>;
  reviewer: ReviewerContext;
}

export interface RejectParams {
  processingId: string;
  reason: string;
  reviewer: ReviewerContext;
}

export interface ApproveParams {
  processingId: string;
  editedFields?: Record<string, any>;
  reviewer: ReviewerContext;
  routingDecisionOverride?: {
    primaryModule: string;
    secondaryModules: string[];
  };
}

export interface RollbackParams {
  processingId: string;
  reviewer: ReviewerContext;
}

export interface ReviewHistoryResult {
  entries: {
    _id: string;
    action: string;
    reviewerId: string;
    reviewerRole: string;
    version: number;
    timestamp: string;
    rejectionReason?: string;
    canonicalCollection?: string;
    canonicalRecordIds?: string[];
    candidateFieldsBefore?: Record<string, any>;
    candidateFieldsAfter?: Record<string, any>;
  }[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function assertOwnership(processingId: string, organizationId: string) {
  const upload = await UaipUpload.findOne({ processingId }).lean();
  if (!upload || (upload as any).status === 'DELETED') throw new Error('Document not found');
  if ((upload as any).organizationId !== organizationId) {
    throw new Error('Forbidden: cross-tenant access denied');
  }
  return upload as any;
}

async function resolveOrCreatePerson(
  userId: string,
  organizationId: string,
  session: mongoose.ClientSession
): Promise<mongoose.Types.ObjectId> {
  const orgOid = toObjectId(organizationId);
  const userOid = toObjectId(userId);

  const existing = await (Person as any).findOne({
    organizationId: orgOid,
    userIds: userOid,
  }).session(session);

  if (existing) return existing._id as mongoose.Types.ObjectId;

  const created = await Person.create(
    [
      {
        organizationId: orgOid,
        primaryName: 'Unknown',
        primaryEmail: 'unknown@placeholder.local',
        userIds: [userOid],
      },
    ],
    { session }
  );
  return (created[0] as any)._id as mongoose.Types.ObjectId;
}

// ── Canonical Writers ─────────────────────────────────────────────────────────

async function writeAcademicRecords(
  fields: Record<string, any>,
  upload: any,
  kr: any,
  personId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession,
  reviewer: ReviewerContext
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
      },
    };
    const result = await (AcademicRecord as any).findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      session,
    });
    ids.push(String(result._id));
  }
  return ids;
}

async function writeCertificateRecord(
  fields: Record<string, any>,
  upload: any,
  kr: any,
  personId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession,
  reviewer: ReviewerContext
): Promise<string[]> {
  const orgOid = toObjectId(reviewer.organizationId);
  const sourceOid = upload._id;
  const filter = {
    organizationId: orgOid,
    personId,
    title: fields.title ?? fields.certificateName ?? 'Unknown Certificate',
    issuer: fields.issuer ?? fields.issuingOrganization ?? 'Unknown',
  };
  const update = {
    $set: {
      issuedDate: fields.issueDate ? new Date(normalizeDate(fields.issueDate).isoDateTime) : new Date(),
      rawConfidence: Number(kr.confidenceScore ?? 0),
      sourceDocumentId: sourceOid,
    },
  };
  const result = await (CertificateRecord as any).findOneAndUpdate(filter, update, {
    upsert: true,
    new: true,
    session,
  });
  return [String(result._id)];
}

async function writeExperienceRecords(
  fields: Record<string, any>,
  upload: any,
  kr: any,
  personId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession,
  reviewer: ReviewerContext
): Promise<string[]> {
  const orgOid = toObjectId(reviewer.organizationId);
  const sourceOid = upload._id;
  const experiences: any[] = fields.experience ?? fields.experiences ?? [];
  const ids: string[] = [];

  for (const exp of experiences) {
    const filter = {
      organizationId: orgOid,
      personId,
      title: exp.role ?? exp.title ?? 'Unknown Role',
      company: exp.company ?? exp.organization ?? 'Unknown',
    };
    const update = {
      $set: {
        startDate: exp.startDate ? new Date(normalizeDate(exp.startDate).isoDateTime) : new Date(0),
        endDate: exp.endDate ? new Date(normalizeDate(exp.endDate).isoDateTime) : undefined,
        rawConfidence: Number(kr.confidenceScore ?? 0),
        sourceDocumentId: sourceOid,
      },
    };
    const result = await (ExperienceRecord as any).findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      session,
    });
    ids.push(String(result._id));
  }
  return ids;
}

async function writeAcademicSchedule(
  fields: Record<string, any>,
  _upload: any,
  kr: any,
  personId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession,
  reviewer: ReviewerContext,
  processingId: string
): Promise<string[]> {
  const orgOid = toObjectId(reviewer.organizationId);
  const schedule = normalizeScheduleDates(fields.schedule ?? []);

  const result = await (AcademicSchedule as any).findOneAndUpdate(
    { organizationId: orgOid, personId },
    {
      $set: {
        sourceProcessingId: processingId,
        rawConfidence: Number(kr.confidenceScore ?? 0),
        schedule,
        approvedBy: reviewer.userId,
        approvedAt: new Date(),
      },
    },
    { upsert: true, new: true, session }
  );
  return [String(result._id)];
}

// ── ReviewService ─────────────────────────────────────────────────────────────

export class ReviewService {

  async saveDraft(params: SaveDraftParams): Promise<{ version: number }> {
    const { processingId, editedFields, reviewer } = params;

    await assertOwnership(processingId, reviewer.organizationId);

    const kr = await KnowledgeRecordModel.findOne({ processingId });
    if (!kr) throw new Error('KnowledgeRecord not found for processingId: ' + processingId);

    const before = kr.candidateFields ? JSON.parse(JSON.stringify(kr.candidateFields)) : {};
    const newVersion = ((kr as any).version ?? 1) + 1;

    kr.candidateFields = { ...before, ...editedFields };
    (kr as any).version = newVersion;
    await kr.save();

    await ReviewHistory.create({
      processingId,
      organizationId: reviewer.organizationId,
      reviewerId: reviewer.userId,
      reviewerRole: reviewer.role,
      action: 'DRAFT_SAVED',
      version: newVersion,
      candidateFieldsBefore: before,
      candidateFieldsAfter: kr.candidateFields,
      timestamp: new Date(),
    });

    void eventBus.publish(UaipEvent.CandidateDraftSaved, {
      processingId,
      userId: reviewer.userId,
      organizationId: reviewer.organizationId,
      reviewerId: reviewer.userId,
      reviewAction: 'draft',
      version: newVersion,
    });

    return { version: newVersion };
  }

  async reject(params: RejectParams): Promise<void> {
    const { processingId, reason, reviewer } = params;

    await assertOwnership(processingId, reviewer.organizationId);

    const kr = await KnowledgeRecordModel.findOne({ processingId });
    if (!kr) throw new Error('KnowledgeRecord not found');

    const newVersion = ((kr as any).version ?? 1) + 1;
    (kr as any).reviewStatus = 'REJECTED';
    (kr as any).version = newVersion;
    await kr.save();

    await ReviewHistory.create({
      processingId,
      organizationId: reviewer.organizationId,
      reviewerId: reviewer.userId,
      reviewerRole: reviewer.role,
      action: 'REJECTED',
      version: newVersion,
      rejectionReason: reason,
      candidateFieldsBefore: kr.candidateFields,
      timestamp: new Date(),
    });

    void eventBus.publish(UaipEvent.CandidateRejected, {
      processingId,
      userId: reviewer.userId,
      organizationId: reviewer.organizationId,
      reviewerId: reviewer.userId,
      reviewAction: 'reject',
      version: newVersion,
    });
  }

  async approve(params: ApproveParams): Promise<{ canonicalCollection: string; canonicalRecordIds: string[]; affectedModules: string[] }> {
    const { processingId, editedFields, reviewer, routingDecisionOverride } = params;

    await assertOwnership(processingId, reviewer.organizationId);

    let canonicalCollection = '';
    let canonicalRecordIds: string[] = [];
    let canonicalWrites: any[] = [];
    let newVersion = 1;
    let finalFields: Record<string, any> = {};
    let affectedModuleIds: string[] = [];

    // Detect replica set support for transactions
    let supportsTransactions = false;
    try {
      if (mongoose.connection && mongoose.connection.db) {
        const isMasterResult = await mongoose.connection.db.admin().command({ isMaster: 1 });
        supportsTransactions = !!(isMasterResult.setName || isMasterResult.hosts);
      }
    } catch (err) {
      console.warn('[ReviewService] Failed to query MongoDB isMaster command; assuming standalone mode', err);
    }

    if (supportsTransactions) {
      console.log('[ReviewService] MongoDB transaction mode for approve');
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const kr = await KnowledgeRecordModel.findOne({
          processingId,
          status: { $ne: 'DELETED' },
        }).session(session);
        if (!kr) throw new Error('KnowledgeRecord not found');

        if ((kr as any).reviewStatus === 'APPROVED') {
          throw new Error('Document is already approved');
        }

        const upload = await UaipUpload.findOne({
          processingId,
          status: { $ne: 'DELETED' },
        }).session(session);
        if (!upload) throw new Error('UaipUpload not found');

        finalFields = {
          ...(kr.candidateFields ?? {}),
          ...(editedFields ?? {}),
        };

        newVersion = ((kr as any).version ?? 1) + 1;

        const personId = await resolveOrCreatePerson(reviewer.userId, reviewer.organizationId, session);

        // Determine routing: use override > stored routing > legacy fallback
        const storedRouting = (kr as any).routingDecision;
        const hasRoutingDecision = storedRouting && storedRouting.primaryModule;

        let effectiveRouting: any = null;
        if (hasRoutingDecision || routingDecisionOverride) {
          effectiveRouting = {
            ...(storedRouting ?? {}),
            ...(routingDecisionOverride
              ? {
                  primaryModule: routingDecisionOverride.primaryModule,
                  secondaryModules: routingDecisionOverride.secondaryModules,
                }
              : {}),
          };

          const { RoutingExecutor } = require('../application/routingEngine');

          const result = await RoutingExecutor.execute({
            kr,
            upload,
            personId,
            session,
            reviewer,
            finalFields,
            routingDecision: effectiveRouting,
          });

          canonicalCollection = result.primaryCollection;
          canonicalRecordIds = result.primaryRecordIds;
          canonicalWrites = result.writes;
          affectedModuleIds = result.writes.map((w: any) => w.moduleId);
        } else {
          // ── LEGACY PATH: switch/case (for existing records without routing data) ──
          const category = (kr as any).documentCategory;

          switch (category) {
            case 'TRANSCRIPT':
            case 'MARKSHEET':
              canonicalCollection = 'AcademicRecord';
              canonicalRecordIds = await writeAcademicRecords(finalFields, upload, kr, personId, session, reviewer);
              break;
            case 'CERTIFICATE':
              canonicalCollection = 'CertificateRecord';
              canonicalRecordIds = await writeCertificateRecord(finalFields, upload, kr, personId, session, reviewer);
              break;
            case 'RESUME':
              canonicalCollection = 'ExperienceRecord';
              canonicalRecordIds = await writeExperienceRecords(finalFields, upload, kr, personId, session, reviewer);
              break;
            case 'ACADEMIC_TIMETABLE':
              canonicalCollection = 'AcademicSchedule';
              canonicalRecordIds = await writeAcademicSchedule(finalFields, upload, kr, personId, session, reviewer, processingId);
              break;
            default:
              canonicalCollection = 'NONE';
              canonicalRecordIds = [];
          }

          canonicalWrites = [{
            moduleId: canonicalCollection.toLowerCase(),
            canonicalCollection,
            recordIds: canonicalRecordIds,
          }];
          affectedModuleIds = [canonicalCollection];
        }

        kr.candidateFields = finalFields;
        (kr as any).reviewStatus = 'APPROVED';
        (kr as any).version = newVersion;
        if (effectiveRouting) {
          (kr as any).routingDecision = effectiveRouting;
        }
        await kr.save({ session });

        await ReviewHistory.create(
          [
            {
              processingId,
              organizationId: reviewer.organizationId,
              reviewerId: reviewer.userId,
              reviewerRole: reviewer.role,
              action: 'APPROVED',
              version: newVersion,
              candidateFieldsAfter: finalFields,
              canonicalCollection,
              canonicalRecordIds,
              canonicalWrites,
              timestamp: new Date(),
            },
          ],
          { session }
        );

        await session.commitTransaction();
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        await session.endSession();
      }
    } else {
      console.log('[ReviewService] MongoDB standalone fallback mode for approve');
      // Standalone path: execute sequentially without session
      const kr = await KnowledgeRecordModel.findOne({
        processingId,
        status: { $ne: 'DELETED' },
      });
      if (!kr) throw new Error('KnowledgeRecord not found');

      if ((kr as any).reviewStatus === 'APPROVED') {
        throw new Error('Document is already approved');
      }

      const upload = await UaipUpload.findOne({
        processingId,
        status: { $ne: 'DELETED' },
      });
      if (!upload) throw new Error('UaipUpload not found');

      finalFields = {
        ...(kr.candidateFields ?? {}),
        ...(editedFields ?? {}),
      };

      newVersion = ((kr as any).version ?? 1) + 1;

      const personId = await resolveOrCreatePerson(reviewer.userId, reviewer.organizationId, undefined);

      const storedRouting = (kr as any).routingDecision;
      const hasRoutingDecision = storedRouting && storedRouting.primaryModule;

      let effectiveRouting: any = null;
      if (hasRoutingDecision || routingDecisionOverride) {
        effectiveRouting = {
          ...(storedRouting ?? {}),
          ...(routingDecisionOverride
            ? {
                primaryModule: routingDecisionOverride.primaryModule,
                secondaryModules: routingDecisionOverride.secondaryModules,
              }
            : {}),
        };
      }

      try {
        if (effectiveRouting) {
          const { RoutingExecutor } = require('../application/routingEngine');

          const result = await RoutingExecutor.execute({
            kr,
            upload,
            personId,
            session: undefined as any,
            reviewer,
            finalFields,
            routingDecision: effectiveRouting,
          });

          canonicalCollection = result.primaryCollection;
          canonicalRecordIds = result.primaryRecordIds;
          canonicalWrites = result.writes;
          affectedModuleIds = result.writes.map((w: any) => w.moduleId);
        } else {
          const category = (kr as any).documentCategory;

          switch (category) {
            case 'TRANSCRIPT':
            case 'MARKSHEET':
              canonicalCollection = 'AcademicRecord';
              canonicalRecordIds = await writeAcademicRecords(finalFields, upload, kr, personId, undefined, reviewer);
              break;
            case 'CERTIFICATE':
              canonicalCollection = 'CertificateRecord';
              canonicalRecordIds = await writeCertificateRecord(finalFields, upload, kr, personId, undefined, reviewer);
              break;
            case 'RESUME':
              canonicalCollection = 'ExperienceRecord';
              canonicalRecordIds = await writeExperienceRecords(finalFields, upload, kr, personId, undefined, reviewer);
              break;
            case 'ACADEMIC_TIMETABLE':
              canonicalCollection = 'AcademicSchedule';
              canonicalRecordIds = await writeAcademicSchedule(finalFields, upload, kr, personId, undefined, reviewer, processingId);
              break;
            default:
              canonicalCollection = 'NONE';
              canonicalRecordIds = [];
          }

          canonicalWrites = [{
            moduleId: canonicalCollection.toLowerCase(),
            canonicalCollection,
            recordIds: canonicalRecordIds,
          }];
          affectedModuleIds = [canonicalCollection];
        }

        // Save metadata and update states
        try {
          kr.candidateFields = finalFields;
          (kr as any).reviewStatus = 'APPROVED';
          (kr as any).version = newVersion;
          if (effectiveRouting) {
            (kr as any).routingDecision = effectiveRouting;
          }
          await kr.save();

          await ReviewHistory.create({
            processingId,
            organizationId: reviewer.organizationId,
            reviewerId: reviewer.userId,
            reviewerRole: reviewer.role,
            action: 'APPROVED',
            version: newVersion,
            candidateFieldsAfter: finalFields,
            canonicalCollection,
            canonicalRecordIds,
            canonicalWrites,
            timestamp: new Date(),
          });
        } catch (saveErr) {
          // Rollback canonical writes sequentially on failure
          const { GrowthHubRecord } = require('../../models/GrowthHubRecord');
          const { CareerRecord } = require('../../models/CareerRecord');
          const { ResearchPaperRecord } = require('../../models/ResearchPaperRecord');
          const { GithubRecord } = require('../../models/GithubRecord');
          const StudentResume = require('../../models/StudentResume').default;

          const modelMap: Record<string, any> = {
            AcademicRecord,
            CertificateRecord,
            ExperienceRecord,
            AcademicSchedule,
            GrowthHubRecord,
            CareerRecord,
            ResearchPaperRecord,
            GithubRecord,
            StudentResume,
          };

          for (const write of canonicalWrites) {
            const model = modelMap[write.canonicalCollection];
            if (model && write.recordIds?.length) {
              const ids = write.recordIds.map((id: string) => toObjectId(id));
              await model.deleteMany({ _id: { $in: ids } });
            }
          }
          throw saveErr;
        }
      } catch (err: any) {
        throw new Error(`Sequential document approval failed midway. Rollback performed. Error: ${err.message}`);
      }
    }

    // Publish events
    void eventBus.publish(UaipEvent.DocumentApproved, {
      processingId,
      userId: reviewer.userId,
      organizationId: reviewer.organizationId,
      reviewerId: reviewer.userId,
      reviewAction: 'approve',
      version: newVersion,
      canonicalCollection,
      canonicalRecordId: canonicalRecordIds[0],
      targetModules: affectedModuleIds,
    });
    void eventBus.publish(UaipEvent.CandidateApproved, {
      processingId,
      userId: reviewer.userId,
      organizationId: reviewer.organizationId,
      reviewerId: reviewer.userId,
      reviewAction: 'approve',
      version: newVersion,
      canonicalCollection,
      canonicalRecordId: canonicalRecordIds[0],
    });
    void eventBus.publish(UaipEvent.RoutingCompleted, {
      processingId,
      organizationId: reviewer.organizationId,
      targetModules: affectedModuleIds,
    });
    void eventBus.publish(UaipEvent.CanonicalUpdated, {
      processingId,
      organizationId: reviewer.organizationId,
      canonicalCollection,
      canonicalRecordId: canonicalRecordIds[0],
    });
    void eventBus.publish(UaipEvent.GrowthProjectionUpdated, {
      processingId,
      userId: reviewer.userId,
      organizationId: reviewer.organizationId,
    });

    // Publish per-module refresh events only for affected modules
    for (const moduleId of affectedModuleIds) {
      void eventBus.publish(UaipEvent.ModuleUpdated, {
        processingId,
        organizationId: reviewer.organizationId,
        targetModule: moduleId,
      });
    }

    return { canonicalCollection, canonicalRecordIds, affectedModules: affectedModuleIds };
  }

  async rollback(params: RollbackParams): Promise<void> {
    const { processingId, reviewer } = params;

    const upload = await assertOwnership(processingId, reviewer.organizationId);

    const isAdmin = reviewer.role === 'ADMIN' || reviewer.role === 'SUPER_ADMIN';
    const isOwner = upload.userId === reviewer.userId;

    if (!isAdmin && !isOwner) {
      throw new Error('Forbidden: you can only rollback documents that you uploaded');
    }

    const kr = await KnowledgeRecordModel.findOne({ processingId });
    if (!kr) throw new Error('KnowledgeRecord not found');

    if ((kr as any).reviewStatus !== 'APPROVED') {
      throw new Error('Only approved documents can be rolled back');
    }

    const lastApproval = await ReviewHistory.findOne({
      processingId,
      action: 'APPROVED',
    }).sort({ timestamp: -1 }).lean() as any;

    const storedRouting = (kr as any).routingDecision;
    const hasRoutingDecision = storedRouting && storedRouting.primaryModule;

    // Detect replica set support for transactions
    let supportsTransactions = false;
    try {
      if (mongoose.connection && mongoose.connection.db) {
        const isMasterResult = await mongoose.connection.db.admin().command({ isMaster: 1 });
        supportsTransactions = !!(isMasterResult.setName || isMasterResult.hosts);
      }
    } catch (err) {
      console.warn('[ReviewService] Failed to query MongoDB isMaster command; assuming standalone mode', err);
    }

    if (supportsTransactions) {
      console.log('[ReviewService] MongoDB transaction mode for rollback');
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        if (hasRoutingDecision) {
          const routingWrites = await RoutingExecutor.rollback({
            processingId,
            organizationId: reviewer.organizationId,
            personId: String((kr as any).personId ?? (kr as any)._id),
            session,
            routingDecision: storedRouting,
          });

          if (lastApproval) {
            lastApproval.canonicalWrites = routingWrites.map((w: RoutingExecutionWrite) => ({
              moduleId: w.moduleId,
              canonicalCollection: w.canonicalCollection,
              recordIds: w.recordIds,
            }));
          }
        } else {
          // Legacy rollback for non-routing approvals
          if (lastApproval?.canonicalWrites?.length) {
            const { GrowthHubRecord } = require('../../models/GrowthHubRecord');
            const { CareerRecord } = require('../../models/CareerRecord');
            const { ResearchPaperRecord } = require('../../models/ResearchPaperRecord');
            const { GithubRecord } = require('../../models/GithubRecord');
            const StudentResume = require('../../models/StudentResume').default;

            const modelMap: Record<string, any> = {
              AcademicRecord,
              CertificateRecord,
              ExperienceRecord,
              AcademicSchedule,
              GrowthHubRecord,
              CareerRecord,
              ResearchPaperRecord,
              GithubRecord,
              StudentResume,
            };

            for (const write of lastApproval.canonicalWrites) {
              const model = modelMap[write.canonicalCollection];
              if (model && write.recordIds?.length) {
                const ids = write.recordIds.map((id: string) => toObjectId(id));
                await model.deleteMany({ _id: { $in: ids } }, { session });
              }
            }
          } else if (lastApproval?.canonicalRecordIds?.length) {
            const col = lastApproval.canonicalCollection;
            const ids = lastApproval.canonicalRecordIds.map((id: string) => toObjectId(id));
            const modelMap: Record<string, any> = {
              AcademicRecord,
              CertificateRecord,
              ExperienceRecord,
              AcademicSchedule,
            };
            if (modelMap[col]) {
              await modelMap[col].deleteMany({ _id: { $in: ids } }, { session });
            }
          }
        }

        const newVersion = ((kr as any).version ?? 1) + 1;
        (kr as any).reviewStatus = 'PENDING_REVIEW';
        (kr as any).version = newVersion;
        await kr.save({ session });

        await session.commitTransaction();
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        await session.endSession();
      }
    } else {
      console.log('[ReviewService] MongoDB standalone fallback mode for rollback');
      // Standalone path: execute sequentially without session
      try {
        if (hasRoutingDecision) {
          const routingWrites = await RoutingExecutor.rollback({
            processingId,
            organizationId: reviewer.organizationId,
            personId: String((kr as any).personId ?? (kr as any)._id),
            session: undefined as any,
            routingDecision: storedRouting,
          });

          if (lastApproval) {
            lastApproval.canonicalWrites = routingWrites.map((w: RoutingExecutionWrite) => ({
              moduleId: w.moduleId,
              canonicalCollection: w.canonicalCollection,
              recordIds: w.recordIds,
            }));
          }
        } else {
          // Legacy rollback for non-routing approvals
          if (lastApproval?.canonicalWrites?.length) {
            const { GrowthHubRecord } = require('../../models/GrowthHubRecord');
            const { CareerRecord } = require('../../models/CareerRecord');
            const { ResearchPaperRecord } = require('../../models/ResearchPaperRecord');
            const { GithubRecord } = require('../../models/GithubRecord');
            const StudentResume = require('../../models/StudentResume').default;

            const modelMap: Record<string, any> = {
              AcademicRecord,
              CertificateRecord,
              ExperienceRecord,
              AcademicSchedule,
              GrowthHubRecord,
              CareerRecord,
              ResearchPaperRecord,
              GithubRecord,
              StudentResume,
            };

            for (const write of lastApproval.canonicalWrites) {
              const model = modelMap[write.canonicalCollection];
              if (model && write.recordIds?.length) {
                const ids = write.recordIds.map((id: string) => toObjectId(id));
                await model.deleteMany({ _id: { $in: ids } });
              }
            }
          } else if (lastApproval?.canonicalRecordIds?.length) {
            const col = lastApproval.canonicalCollection;
            const ids = lastApproval.canonicalRecordIds.map((id: string) => toObjectId(id));
            const modelMap: Record<string, any> = {
              AcademicRecord,
              CertificateRecord,
              ExperienceRecord,
              AcademicSchedule,
            };
            if (modelMap[col]) {
              await modelMap[col].deleteMany({ _id: { $in: ids } });
            }
          }
        }

        const newVersion = ((kr as any).version ?? 1) + 1;
        (kr as any).reviewStatus = 'PENDING_REVIEW';
        (kr as any).version = newVersion;
        await kr.save();
      } catch (err: any) {
        throw new Error(`Sequential rollback failed. Error: ${err.message}`);
      }
    }

    const finalVersion = (kr as any).version ?? 1;

    await ReviewHistory.create({
      processingId,
      organizationId: reviewer.organizationId,
      reviewerId: reviewer.userId,
      reviewerRole: reviewer.role,
      action: 'ROLLBACK',
      version: finalVersion,
      timestamp: new Date(),
    });

    void eventBus.publish(UaipEvent.GrowthProjectionUpdated, {
      processingId,
      userId: reviewer.userId,
      organizationId: reviewer.organizationId,
    });
  }

  async canRollback(processingId: string, reviewer: ReviewerContext): Promise<{ canRollback: boolean; reason?: string }> {
    const upload = await assertOwnership(processingId, reviewer.organizationId);

    const kr = await KnowledgeRecordModel.findOne({ processingId });
    if (!kr) {
      return { canRollback: false, reason: 'Document not found' };
    }

    if ((kr as any).reviewStatus !== 'APPROVED') {
      return { canRollback: false, reason: 'Only approved documents can be rolled back' };
    }

    const isAdmin = reviewer.role === 'ADMIN' || reviewer.role === 'SUPER_ADMIN';
    const isOwner = upload.userId === reviewer.userId;

    if (isAdmin || isOwner) {
      return { canRollback: true };
    }

    return { canRollback: false, reason: 'You can only rollback documents that you uploaded' };
  }

  async getHistory(processingId: string, organizationId: string): Promise<ReviewHistoryResult> {
    await assertOwnership(processingId, organizationId);

    const entries = await ReviewHistory.find({ processingId })
      .sort({ timestamp: -1 })
      .lean();

    return {
      entries: entries.map((e: any) => ({
        _id: String(e._id),
        action: e.action,
        reviewerId: e.reviewerId,
        reviewerRole: e.reviewerRole,
        version: e.version,
        timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : String(e.timestamp),
        rejectionReason: e.rejectionReason,
        canonicalCollection: e.canonicalCollection,
        canonicalRecordIds: e.canonicalRecordIds,
        candidateFieldsBefore: e.candidateFieldsBefore,
        candidateFieldsAfter: e.candidateFieldsAfter,
      })),
    };
  }

  async getCandidateState(processingId: string, organizationId: string) {
    await assertOwnership(processingId, organizationId);

    const kr = await KnowledgeRecordModel.findOne({ processingId }).lean();
    if (!kr) throw new Error('KnowledgeRecord not found');

    return {
      processingId,
      reviewStatus: (kr as any).reviewStatus,
      version: (kr as any).version ?? 1,
      documentCategory: (kr as any).documentCategory,
      candidateFields: (kr as any).candidateFields ?? {},
      extractedEntities: (kr as any).extractedEntities ?? {},
      summary: (kr as any).summary,
      primaryTargetModule: (kr as any).primaryTargetModule,
      routingDecision: (kr as any).routingDecision ?? null,
      routingStatus: (kr as any).routingStatus ?? null,
    };
  }
}

