import { Types } from 'mongoose';
import { CertificateRecordRepository } from '../repositories/certificateRecord.repository';
import { AuditEntry } from '../../models/AuditEntry';
import { ICertificateRecord } from '../../models/CertificateRecord';

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
        organizationId: new Types.ObjectId(organizationId),
        personId: new Types.ObjectId(personId),
        sourceDocumentId: new Types.ObjectId(sourceDocumentId),
        rawConfidence,
        title,
        issuer,
        issuedDate: new Date(issuedDate),
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

    return doc;
  }

  async findByPerson(personId: string) {
    return this.repo.findByPerson(personId);
  }
}
