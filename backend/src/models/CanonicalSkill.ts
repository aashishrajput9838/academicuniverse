import { Schema, model, Document, Types } from 'mongoose';
import { SkillCategory, SkillStatus } from '../shared/enums/skills.enum';

export interface ICanonicalSkill extends Document {
  canonicalId: string;
  canonicalName: string;
  canonicalCategory: SkillCategory;
  canonicalSubcategory?: string;
  source: string;
  description?: string;
  status: SkillStatus;
  createdAt: Date;
  updatedAt: Date;
}

const CanonicalSkillSchema = new Schema<ICanonicalSkill>({
  canonicalId: { type: String, required: true, unique: true },
  canonicalName: { type: String, required: true },
  canonicalCategory: { type: String, required: true, enum: Object.values(SkillCategory) },
  canonicalSubcategory: { type: String },
  source: { type: String, required: true },
  description: { type: String },
  status: { type: String, required: true, enum: Object.values(SkillStatus), default: SkillStatus.ACTIVE },
}, { timestamps: true });

CanonicalSkillSchema.index({ canonicalName: 1 }, { unique: true, name: 'uniqueCanonicalName' } as any);
CanonicalSkillSchema.index({ source: 1 }, { name: 'canonicalBySource' } as any);

export const CanonicalSkill = model<ICanonicalSkill>('CanonicalSkill', CanonicalSkillSchema);
