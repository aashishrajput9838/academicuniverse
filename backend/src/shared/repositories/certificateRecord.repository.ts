import { CertificateRecord, ICertificateRecord } from '../../models/CertificateRecord';
import { Types } from 'mongoose';

export class CertificateRecordRepository {
  /**
   * Upsert a certificate record. Duplicate title+issuer per person is prevented by unique index.
   */
  async upsert(record: Partial<ICertificateRecord>, organizationId: string): Promise<{doc: ICertificateRecord; action: 'create' | 'update'}> {
    const filter = {
      organizationId: new Types.ObjectId(organizationId),
      personId: record.personId,
      title: record.title,
      issuer: record.issuer,
    } as any;

    const existing = await CertificateRecord.findOne(filter);
    if (existing) {
      await CertificateRecord.updateOne({ _id: existing._id }, record);
      const updated = await CertificateRecord.findById(existing._id) as ICertificateRecord;
      return { doc: updated, action: 'update' };
    }
    const created = await CertificateRecord.create(record as ICertificateRecord);
    return { doc: created, action: 'create' };
  }

  async findByPerson(personId: string) {
    return CertificateRecord.find({ personId: new Types.ObjectId(personId) });
  }
}
