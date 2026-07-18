import { Schema, model, Document, Types } from 'mongoose';
import { SkillCategory } from '../shared/enums/skills.enum';

export interface ISubjectSkillMapping extends Document {
  organizationId: Types.ObjectId;
  subjectCode: string;
  subjectName: string;

  skillId: string;
  skillName: string;
  skillCategory: SkillCategory;

  relevanceWeight: number;
  isCore: boolean;

  effectiveFrom: Date;
  effectiveTo?: Date;

  version: number;
  createdBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

const SubjectSkillMappingSchema = new Schema<ISubjectSkillMapping>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true, ref: 'Organization' } as any,
    subjectCode: { type: String, required: true },
    subjectName: { type: String, required: true },

    skillId: { type: String, required: true },
    skillName: { type: String, required: true },
    skillCategory: { type: String, required: true, enum: Object.values(SkillCategory) },

    relevanceWeight: { type: Number, required: true, min: 0, max: 1 },
    isCore: { type: Boolean, required: true, default: false },

    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date },

    version: { type: Number, required: true, default: 1 },
    createdBy: { type: String },
  },
  { timestamps: true }
);

SubjectSkillMappingSchema.index(
  { organizationId: 1, subjectCode: 1, skillId: 1 },
  { unique: true, name: 'uniqueSubjectSkillMapping' } as any
);
SubjectSkillMappingSchema.index(
  { organizationId: 1, effectiveFrom: 1, effectiveTo: 1 },
  { name: 'mappingValidityWindow' } as any
);

export const SubjectSkillMapping = model<ISubjectSkillMapping>('SubjectSkillMapping', SubjectSkillMappingSchema);
