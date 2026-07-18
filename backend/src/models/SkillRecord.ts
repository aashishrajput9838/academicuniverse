import { Schema, model, Document, Types } from 'mongoose';
import {
  SkillCategory,
  ProficiencyLevel,
  SkillSource,
  SkillStatus,
} from '../shared/enums/skills.enum';

export interface ISkillRecord extends Document {
  organizationId: Types.ObjectId;
  personId: Types.ObjectId;

  skillId: string;
  skillName: string;
  aliases: string[];
  skillCategory: SkillCategory;
  skillSubcategory?: string;

  proficiencyLevel: ProficiencyLevel;
  proficiencyScore: number;
  evidenceCount: number;

  firstSeenAt: Date;
  lastVerifiedAt: Date;

  status: SkillStatus;
  supersededBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const SkillRecordSchema = new Schema<ISkillRecord>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true, ref: 'Organization' } as any,
    personId: { type: Schema.Types.ObjectId, required: true, ref: 'Person' } as any,

    skillId: { type: String, required: true },
    skillName: { type: String, required: true },
    aliases: { type: [String], default: [] } as any,
    skillCategory: { type: String, required: true, enum: Object.values(SkillCategory) },
    skillSubcategory: { type: String },

    proficiencyLevel: { type: String, required: true, enum: Object.values(ProficiencyLevel) },
    proficiencyScore: { type: Number, required: true, min: 0, max: 100 },
    evidenceCount: { type: Number, required: true, min: 0, default: 0 },

    firstSeenAt: { type: Date, required: true },
    lastVerifiedAt: { type: Date, required: true },

    status: { type: String, required: true, enum: Object.values(SkillStatus), default: SkillStatus.ACTIVE },
    supersededBy: { type: Schema.Types.ObjectId, ref: 'SkillRecord' },
  },
  { timestamps: true }
);

SkillRecordSchema.index(
  { organizationId: 1, personId: 1, skillId: 1 },
  { unique: true, name: 'uniqueSkillPerPerson' } as any
);
SkillRecordSchema.index(
  { organizationId: 1, personId: 1, proficiencyScore: -1 },
  { name: 'skillsByProficiency' } as any
);
SkillRecordSchema.index(
  { organizationId: 1, skillCategory: 1, proficiencyScore: -1 },
  { name: 'skillsByCategory' } as any
);
SkillRecordSchema.index(
  { organizationId: 1, skillId: 1 },
  { name: 'skillsByOntology' } as any
);

export const SkillRecord = model<ISkillRecord>('SkillRecord', SkillRecordSchema);
