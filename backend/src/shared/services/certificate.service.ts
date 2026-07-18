import { Types } from 'mongoose';
import { CertificateRecordRepository } from '../repositories/certificateRecord.repository';
import { AuditEntry } from '../../models/AuditEntry';
import { ICertificateRecord } from '../../models/CertificateRecord';
import { normalizeDate } from '../../shared/utils/dateNormalizer';
import { toObjectId } from '../../utils/mongooseHelpers';
import { eventBus } from '../../events/EventBus';
import { UaipEvent } from '../../events/UaipEvents';

export class CertificateService {
  private repo = new CertificateRecordRepository();

  /** Merge (upsert) a certificate record */
  async merge(payload: {
    organizationId: string;
    personId: string;
    sourceDocumentId: string;
    rawConfidence: number;
    title: string;
    issuer: string;
    issuedDate: string; // ISO string
    correlationId?: string;
  }): Promise<ICertificateRecord> {
    const { organizationId, personId, sourceDocumentId, rawConfidence, title, issuer, issuedDate, correlationId } = payload;

    const { doc, action } = await this.repo.upsert(
      {
        organizationId: toObjectId(organizationId),
        personId: toObjectId(personId),
        sourceDocumentId: toObjectId(sourceDocumentId),
        rawConfidence,
        title,
        issuer,
        issuedDate: new Date(normalizeDate(issuedDate).isoDateTime),
      },
      organizationId,
    );

    await AuditEntry.create({
      organizationId,
      recordId: doc._id.toString(),
      collectionName: 'certificate_records',
      action,
      performedBy: 'dispatcher',
      metadata: { domain: 'certificate', rawConfidence, correlationId },
    });

    void eventBus.publish(UaipEvent.CertificateApproved, {
      processingId: doc._id.toString(),
      organizationId,
      personId,
      correlationId: correlationId || doc._id.toString(),
      eventId: doc._id.toString(),
      occurredAt: new Date(),
      source: 'certificates',
      title,
      issuer,
      issuedDate: doc.issuedDate,
      rawConfidence,
    } as any);

    return doc;
  }

  async findByPerson(personId: string) {
    return this.repo.findByPerson(personId);
  }
}
