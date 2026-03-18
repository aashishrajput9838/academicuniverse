import mongoose, { Schema, Document } from 'mongoose';

export interface IParsedSlot {
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    subject: string;
    isFreeSlot?: boolean;
}

export interface ITimetable extends Document {
    sectionId: mongoose.Types.ObjectId;
    fileName: string;
    fileUrl?: string;
    fileData?: Buffer;
    mimeType?: string;
    parsedData?: IParsedSlot[];
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
        fileUrl: {
            type: String,
        },
        fileData: {
            type: Buffer,
            select: false // Exclude by default to save bandwidth, unless explicitly requested
        },
        mimeType: {
            type: String,
        },
        parsedData: [{
            dayOfWeek: String,
            startTime: String,
            endTime: String,
            subject: String,
            isFreeSlot: {
                type: Boolean,
                default: false
            }
        }],
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
