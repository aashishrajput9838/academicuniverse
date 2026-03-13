import mongoose, { Schema, Document } from 'mongoose';

export interface IMark extends Document {
    studentId: mongoose.Types.ObjectId;
    subjectId: string;
    marks: number;
    organizationId: mongoose.Types.ObjectId;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const markSchema = new Schema<IMark>(
    {
        studentId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        subjectId: {
            type: String,
            required: true,
            trim: true,
        },
        marks: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },
        organizationId: {
            type: Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true }
);

// Quick fetch for a specific student's marks
markSchema.index({ studentId: 1, organizationId: 1 });

export default mongoose.model<IMark>('Mark', markSchema);
