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

const logger = new Logger('RoutingEngine');

export { ModuleRegistry, ModuleDescriptor } from './moduleRegistry';

export const moduleRegistry: ModuleDescriptor[] = ModuleRegistry.getInstance().getAll();

export interface IModuleAdapter {
  validateData(fields: Record<string, any>): boolean;
  mapCandidateFields(fields: Record<string, any>, kr: any): Record<string, any>;
  writeCanonical(
    fields: Record<string, any>,
    kr: any,
    upload: any,
    personId: Types.ObjectId,
    session: mongoose.ClientSession,
    reviewer: any
  ): Promise<string[]>;
}

// ── Adapters Implementation ──────────────────────────────────────────────────

class GrowthAdapter implements IModuleAdapter {
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
}

class AcademicScheduleAdapter implements IModuleAdapter {
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
    const schedule = fields.schedule ?? [];
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
}

class ResumeAdapter implements IModuleAdapter {
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
}

class ResearchAdapter implements IModuleAdapter {
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
}

class CertificatesAdapter implements IModuleAdapter {
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
          issuedDate: fields.issueDate ? new Date(fields.issueDate) : new Date(),
          rawConfidence: Number(kr.confidenceScore ?? 0),
          sourceDocumentId: upload._id,
        }
      },
      { upsert: true, new: true, session }
    );
    return [String(result._id)];
  }
}

class CareerAdapter implements IModuleAdapter {
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
}

class GithubAdapter implements IModuleAdapter {
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
}

class AcademicRecordsAdapter implements IModuleAdapter {
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
      const update = {
        $set: {
          subjectName: sub.name ?? sub.code ?? 'UNKNOWN',
          grade: sub.grade ?? 'N/A',
          credits: Number(sub.credits ?? 0),
          status: 'APPROVED',
          rawConfidence: Number(kr.confidenceScore ?? 0),
          sourceDocumentId: sourceOid,
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
};

// ── Routing Engine ────────────────────────────────────────────────────────────

export class ModuleRoutingEngine {
  static getFormattedModuleRegistry(): string {
    return moduleRegistry
      .map(
        m => `
- moduleId: "${m.moduleId}"
  moduleName: "${m.moduleName}"
  description: "${m.description}"
  acceptedDocumentCategories: ${JSON.stringify(m.acceptedDocumentCategories)}
  requiredEntities: ${JSON.stringify(m.requiredEntities)}
  requiredCandidateFields: ${JSON.stringify(m.requiredCandidateFields)}
  canonicalCollection: "${m.canonicalCollection}"
  priority: ${m.priority}`
      )
      .join('\n');
  }

  static async determineRouting(params: {
    processingId: string;
    rawContent: string;
    extractedEntities: Record<string, any>;
    candidateFields: Record<string, any>;
  }): Promise<TargetModuleRoutingDecision> {
    const registryString = this.getFormattedModuleRegistry();

    const systemInstruction = `You are the Academic Universe AI Module Routing Engine.
Analyze the document type, content, entities, and candidate fields, and match them against the Module Registry.
Determine which modules can consume this extracted data. Return a valid JSON object only.

Format your response strictly as follows:
{
  "documentType": string (e.g. "ACADEMIC_TIMETABLE", "MARKSHEET", "TRANSCRIPT", "CERTIFICATE", "RESUME", "RESEARCH_PAPER", "UNKNOWN"),
  "confidence": number (float between 0.0 and 1.0 representing routing confidence),
  "targetModules": [
    {
      "moduleId": string (must exactly match a moduleId from the registry),
      "confidence": number (float between 0.0 and 1.0),
      "reason": string (short explanation)
    }
  ]
}
`;

    const prompt = `
=== MODULE REGISTRY ===
${registryString}

=== DOCUMENT ANALYSIS INPUTS ===
1. Extracted Entities:
${JSON.stringify(params.extractedEntities, null, 2)}

2. Candidate Fields:
${JSON.stringify(params.candidateFields, null, 2)}

3. Document Content Snippet:
${params.rawContent.slice(0, 5000)}

Please determine the routing options. If no module matches, return "targetModules" as empty and "confidence" < 0.8.
`;

    try {
      logger.info('Calling AI provider for routing recommendation', { processingId: params.processingId });
      const aiResponse = await aiProvider.generateJSON<any>(prompt, {
        systemInstruction,
        temperature: 0.2,
      });

      const docType = aiResponse.documentType || 'UNKNOWN';
      const confidence = Number(aiResponse.confidence ?? 0);
      const targetModules = Array.isArray(aiResponse.targetModules) ? aiResponse.targetModules : [];

      let primaryModule = '';
      const secondaryModules: string[] = [];

      // Sort by confidence or priority
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

// ── Routing Executor ─────────────────────────────────────────────────────────

export interface RoutingExecutionWrite {
  moduleId: string;
  canonicalCollection: string;
  recordIds: string[];
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
        continue;
      }

      if (!adapter.validateData(finalFields)) {
        logger.warn(`Validation failed for adapter: ${moduleId}. Skipping write.`);
        continue;
      }

      const mapped = adapter.mapCandidateFields(finalFields, kr);
      const recordIds = await adapter.writeCanonical(mapped, kr, upload, personId, session, reviewer);

      writes.push({
        moduleId,
        canonicalCollection: reg.canonicalCollection,
        recordIds,
      });
    }

    // Determine primary collection and recordIds (corresponds to primaryModule)
    let primaryCollection = 'NONE';
    let primaryRecordIds: string[] = [];

    const primaryWrite = writes.find(w => w.moduleId === routingDecision.primaryModule);
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
}

export { adaptersMap };
