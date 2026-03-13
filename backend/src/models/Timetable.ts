import mongoose, { Schema, Document } from 'mongoose';

export interface ITimetable extends Document {
    sectionId: mongoose.Types.ObjectId;
    fileName: string;
    uploadTime: Date;
    organizationId: mongoose.Types.ObjectId;
    uploadedBy: mongoose.Types.ObjectId;
}

const timetableSchema = new Schema<ITimetable>(
    {
        sectionId: {
            type: Schema.Types.ObjectId,
            ref: 'Section',
            required: true,
            unique: true, // Assuming one timetable per section
        },
        fileName: {
            type: String,
            required: true,
            trim: true,
        },
        uploadTime: {
            type: Date,
            default: Date.now,
        },
        organizationId: {
            type: Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
        },
        uploadedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true }
);

// Quick fetch
timetableSchema.index({ organizationId: 1, sectionId: 1 });

export default mongoose.model<ITimetable>('Timetable', timetableSchema);
