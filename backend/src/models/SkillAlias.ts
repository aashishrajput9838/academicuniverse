import { Schema, model, Document, Types } from 'mongoose';
import { AliasType, AliasStatus } from '../shared/enums/skillAlias.enum';

export interface ISkillAlias extends Document {
  organizationId?: Types.ObjectId;
  canonicalId: string;
  alias: string;
  aliasType: AliasType;
  confidence: number;
  source: string;
  extractedBy: string;
  correlationId?: string;
  status: AliasStatus;
  createdAt: Date;
  updatedAt: Date;
}

const SkillAliasSchema = new Schema<ISkillAlias>({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' } as any,
  canonicalId: { type: String, required: true, ref: 'CanonicalSkill' } as any,
  alias: { type: String, required: true },
  aliasType: { type: String, required: true, enum: Object.values(AliasType) },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  source: { type: String, required: true },
  extractedBy: { type: String, required: true },
  correlationId: { type: String },
  status: { type: String, required: true, enum: Object.values(AliasStatus), default: AliasStatus.ACTIVE },
}, { timestamps: true });

SkillAliasSchema.index(
  { organizationId: 1, alias: 1, aliasType: 1 },
  { unique: true, name: 'uniqueAliasPerOrg' } as any
);
SkillAliasSchema.index(
  { alias: 1, status: 1 },
  { name: 'aliasLookup' } as any
);
SkillAliasSchema.index(
  { canonicalId: 1, status: 1 },
  { name: 'canonicalLookup' } as any
);

export const SkillAlias = model<ISkillAlias>('SkillAlias', SkillAliasSchema);
