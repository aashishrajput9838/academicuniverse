import { Types } from 'mongoose';
import { DocumentRegistry, IDocumentRegistry } from '../../models/DocumentRegistry';
import { toObjectId } from '../../utils/mongooseHelpers';

export interface RegistryUpsertDTO {
  organizationId: string; // ObjectId as string
  userId?: string;
  documentType: string;
  sourceExample?: string; // filename to add to examples
}

export class DocumentRegistryRepository {
  /**
   * Upserts a registry entry: creates if not exists, otherwise increments uploadCount, updates lastSeen,
   * and pushes a new source example (kept to last 5 entries).
   */
  async upsert(dto: RegistryUpsertDTO): Promise<IDocumentRegistry> {
    const filter: any = {
      organizationId: toObjectId(dto.organizationId),
      documentType: dto.documentType,
    };
    if (dto.userId) {
      filter.userId = toObjectId(dto.userId);
    } else {
      filter.userId = null;
    }

    const update: any = {
      $inc: { uploadCount: 1 },
      $set: { lastSeen: new Date(), enabled: true },
    };

    if (dto.sourceExample) {
      update.$push = { sourceExamples: { $each: [dto.sourceExample], $slice: -5 } };
    }

    // On insert, set defaults for fields not covered by $inc/$set
    const options = { upsert: true, new: true, setDefaultsOnInsert: true };
    const result = await DocumentRegistry.findOneAndUpdate(filter, update, options).exec();
    // result will never be null because upsert:true
    return result as IDocumentRegistry;
  }

  /** Retrieve all registry entries for an organization (optionally filtered by userId) */
  async list(
    organizationId: string,
    userId?: string,
  ): Promise<IDocumentRegistry[]> {
    const filter: any = { organizationId: toObjectId(organizationId) };
    if (userId) {
      filter.userId = toObjectId(userId);
    } else {
      filter.userId = null;
    }
    return DocumentRegistry.find(filter)
      .sort({ enabled: -1, uploadCount: -1, lastSeen: -1 })
      .exec();
  }
}
