import { SkillEvidence, ISkillEvidence } from '../../models/SkillEvidence';
import { Types } from 'mongoose';
import { toObjectId } from '../../utils/mongooseHelpers';

export class SkillEvidenceRepository {
  async create(evidence: Partial<ISkillEvidence>, organizationId: string): Promise<ISkillEvidence> {
    const doc = await SkillEvidence.create(evidence as ISkillEvidence);
    return doc;
  }

  async findActiveByPersonAndSkill(personId: string, skillId: string, organizationId?: string): Promise<ISkillEvidence[]> {
    const filter: any = {
      personId: toObjectId(personId),
      skillId,
      status: 'ACTIVE',
    };
    if (organizationId) {
      filter.organizationId = toObjectId(organizationId);
    }
    return SkillEvidence.find(filter).sort({ createdAt: -1 });
  }

  async findByPerson(personId: string, organizationId?: string): Promise<ISkillEvidence[]> {
    const filter: any = { personId: toObjectId(personId) };
    if (organizationId) {
      filter.organizationId = toObjectId(organizationId);
    }
    return SkillEvidence.find(filter).sort({ createdAt: -1 });
  }

  async findActiveByPersonAndCanonical(personId: string, canonicalId: string, organizationId?: string): Promise<ISkillEvidence[]> {
    const filter: any = {
      personId: toObjectId(personId),
      'payload.canonicalId': canonicalId,
      status: 'ACTIVE',
    };
    if (organizationId) {
      filter.organizationId = toObjectId(organizationId);
    }
    return SkillEvidence.find(filter).sort({ createdAt: -1 });
  }

  async findByDocument(sourceDocumentId: string, organizationId?: string): Promise<ISkillEvidence[]> {
    const filter: any = { sourceDocumentId: toObjectId(sourceDocumentId) };
    if (organizationId) {
      filter.organizationId = toObjectId(organizationId);
    }
    return SkillEvidence.find(filter).sort({ createdAt: -1 });
  }

  async supersede(evidenceId: string, supersededBy: string, organizationId: string): Promise<void> {
    await SkillEvidence.updateOne(
      { _id: toObjectId(evidenceId), organizationId: toObjectId(organizationId) },
      {
        status: 'SUPERSEDED',
        supersededBy: toObjectId(supersededBy),
      }
    );
  }

  async revoke(evidenceId: string, organizationId: string): Promise<void> {
    await SkillEvidence.updateOne(
      { _id: toObjectId(evidenceId), organizationId: toObjectId(organizationId) },
      { status: 'REVOKED' }
    );
  }

  async findActiveByCorrelationIdAndSkill(
    correlationId: string,
    skillId: string,
    organizationId?: string
  ): Promise<ISkillEvidence | null> {
    const filter: any = {
      correlationId,
      skillId,
      status: 'ACTIVE',
      repositoryId: { $exists: false },
    };
    if (organizationId) {
      filter.organizationId = toObjectId(organizationId);
    }
    return SkillEvidence.findOne(filter).sort({ createdAt: -1 }).lean().exec();
  }

  async findActiveByCorrelationIdAndRepository(
    correlationId: string,
    repositoryId: string,
    organizationId?: string
  ): Promise<ISkillEvidence | null> {
    const filter: any = {
      correlationId,
      repositoryId,
      status: 'ACTIVE',
    };
    if (organizationId) {
      filter.organizationId = toObjectId(organizationId);
    }
    return SkillEvidence.findOne(filter).sort({ createdAt: -1 }).lean().exec();
  }
}
