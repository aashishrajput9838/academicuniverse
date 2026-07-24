import { Schema, model, Document, Types } from 'mongoose';

export interface IResumePersonSuggestion extends Document {
  processingId: string;
  organizationId: Types.ObjectId;
  suggestedPersonId?: Types.ObjectId;
  matchConfidence: number;
  matchBasis: ('email' | 'phone' | 'name+jaro' | 'institution' | 'manual')[];
  isNewPerson: boolean;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: Date;
  updatedAt: Date;
}

const ResumePersonSuggestionSchema = new Schema<IResumePersonSuggestion>({
  processingId: { type: String, required: true, unique: true, index: true },
  organizationId: { type: Schema.Types.ObjectId, required: true, ref: 'Organization', index: true } as any,
  suggestedPersonId: { type: Schema.Types.ObjectId, ref: 'Person' },
  matchConfidence: { type: Number, required: true, min: 0, max: 1 },
  matchBasis: [{ type: String, required: true, enum: ['email', 'phone', 'name+jaro', 'institution', 'manual'] }],
  isNewPerson: { type: Boolean, default: true },
  status: { type: String, required: true, enum: ['PENDING', 'ACCEPTED', 'REJECTED'], default: 'PENDING' },
}, { timestamps: true });

ResumePersonSuggestionSchema.index({ organizationId: 1, suggestedPersonId: 1, status: 1 });

export const ResumePersonSuggestion = model<IResumePersonSuggestion>('ResumePersonSuggestion', ResumePersonSuggestionSchema);
