import { Schema, model, Document, Types } from 'mongoose';
import { SkillSource, EvidenceStatus } from '../shared/enums/skills.enum';

export interface ISkillEvidence extends Document {
  organizationId: Types.ObjectId;
  personId: Types.ObjectId;
  sourceDocumentId?: Types.ObjectId;

  skillId: string;
  skillName: string;
  aliases: string[];

  primarySource: SkillSource;
  sourceType: string;
  sourceSubtype?: string;

  payload: Record<string, any>;

  confidence: number;
  extractedBy: string;
  correlationId?: string;

  effectiveFrom: Date;
  effectiveTo?: Date;

  status: EvidenceStatus;
  supersededBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const SkillEvidenceSchema = new Schema<ISkillEvidence>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true, ref: 'Organization' } as any,
    personId: { type: Schema.Types.ObjectId, required: true, ref: 'Person' } as any,
    sourceDocumentId: { type: Schema.Types.ObjectId, ref: 'Document' },

    skillId: { type: String, required: true },
    skillName: { type: String, required: true },
    aliases: { type: [String], default: [] } as any,

    primarySource: { type: String, required: true, enum: Object.values(SkillSource) },
    sourceType: { type: String, required: true },
    sourceSubtype: { type: String },

    payload: { type: Schema.Types.Mixed, required: true },

    confidence: { type: Number, required: true, min: 0, max: 1 },
    extractedBy: { type: String, required: true },
    correlationId: { type: String },

    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date },

    status: { type: String, required: true, enum: Object.values(EvidenceStatus), default: EvidenceStatus.ACTIVE },
    supersededBy: { type: Schema.Types.ObjectId, ref: 'SkillEvidence' },
  },
  { timestamps: true }
);

SkillEvidenceSchema.index(
  { organizationId: 1, personId: 1, skillId: 1, status: 1, createdAt: -1 },
  { name: 'evidenceByPersonSkill' } as any
);
SkillEvidenceSchema.index(
  { organizationId: 1, skillId: 1, primarySource: 1 },
  { name: 'evidenceByOntologySource' } as any
);
SkillEvidenceSchema.index(
  { organizationId: 1, personId: 1, sourceDocumentId: 1 },
  { sparse: true, name: 'evidenceByDocument' } as any
);

export const SkillEvidence = model<ISkillEvidence>('SkillEvidence', SkillEvidenceSchema);
