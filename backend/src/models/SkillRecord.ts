import { Schema, model, Document, Types } from 'mongoose';
import {
  SkillCategory,
  ProficiencyLevel,
  SkillVerificationStatus,
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

  scoringModelVersion: string;
  proficiencyLevel: ProficiencyLevel;
  proficiencyScore: number;
  confidenceScore: number; // 0.0 to 1.0
  verificationStatus: SkillVerificationStatus;

  scoreBreakdown: {
    volume: number;
    recency: number;
    ownership: number;
    complexity: number;
    dominance: number;
  };

  recruiterExplanation: string;
  evidenceCount: number;
  evidenceSources: string[];

  timelineData: Array<{
    year: number;
    evidenceCount: number;
    proficiencyScore: number;
  }>;

  relatedSkillIds: string[];

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

    scoringModelVersion: { type: String, required: true, default: 'SIE-1.0' },
    proficiencyLevel: { type: String, required: true, enum: Object.values(ProficiencyLevel) },
    proficiencyScore: { type: Number, required: true, min: 0, max: 100 },
    confidenceScore: { type: Number, required: true, min: 0, max: 1, default: 0.5 },
    verificationStatus: {
      type: String,
      required: true,
      enum: Object.values(SkillVerificationStatus),
      default: SkillVerificationStatus.PENDING_EVIDENCE,
    },

    scoreBreakdown: {
      volume: { type: Number, default: 0 },
      recency: { type: Number, default: 0 },
      ownership: { type: Number, default: 0 },
      complexity: { type: Number, default: 0 },
      dominance: { type: Number, default: 0 },
    },

    recruiterExplanation: { type: String, default: '' },
    evidenceCount: { type: Number, required: true, min: 0, default: 0 },
    evidenceSources: { type: [String], default: [] } as any,

    timelineData: [
      {
        year: { type: Number, required: true },
        evidenceCount: { type: Number, required: true },
        proficiencyScore: { type: Number, required: true },
      },
    ],

    relatedSkillIds: { type: [String], default: [] } as any,

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
