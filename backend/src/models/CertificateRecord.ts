import { Schema, model, Document, Types } from 'mongoose';

export interface ICertificateRecord extends Document {
  organizationId: Types.ObjectId; // tenant
  personId: Types.ObjectId;       // canonical person
  sourceDocumentId: Types.ObjectId; // the uploaded document that generated this record
  rawConfidence: number;          // 0‑1 confidence from AI extraction
  title: string;                  // Certificate title
  issuer: string;                 // Issuing authority
  issuedDate?: Date;              // Date of issuance (optional — many certificates omit this)
  credentialId?: string;          // Optional credential/certificate ID
  createdAt: Date;
  updatedAt: Date;
}

const CertificateRecordSchema = new Schema<ICertificateRecord>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true, ref: 'Organization' },
    personId: { type: Schema.Types.ObjectId, required: true, ref: 'Person' },
    sourceDocumentId: { type: Schema.Types.ObjectId, required: true, ref: 'Document' },
    rawConfidence: { type: Number, required: true },
    title: { type: String, required: true },
    issuer: { type: String, required: true },
    issuedDate: { type: Date, required: false },  // optional — many certificates omit issue date
    credentialId: { type: String, required: false }, // optional credential/cert ID
  } as any,
  { timestamps: true }
);

// Ensure a person cannot have duplicate certificates with same title and issuer
CertificateRecordSchema.index(
  { organizationId: 1, personId: 1, title: 1, issuer: 1 },
  { unique: true, name: 'uniqueCertificate' } as any
);

export const CertificateRecord = model<ICertificateRecord>('CertificateRecord', CertificateRecordSchema);
