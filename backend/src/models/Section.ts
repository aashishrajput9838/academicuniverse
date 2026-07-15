import mongoose, { Schema, Document } from 'mongoose';

export interface ISection extends Document {
    name: string;
    courseId: string;
    organizationId: mongoose.Types.ObjectId;
    representativeId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const sectionSchema = new Schema<ISection>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        courseId: {
            type: String,
            required: true,
            trim: true,
        },
        organizationId: {
            type: Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
        },
        representativeId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    } as any,
    { timestamps: true }
);

// Ensure that a section name is unique within an organization
sectionSchema.index({ name: 1, organizationId: 1 }, { unique: true } as any);

export default mongoose.model<ISection>('Section', sectionSchema);
