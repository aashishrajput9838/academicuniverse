import mongoose, { Schema, Document } from 'mongoose';

export interface IEzoneProfile extends Document {
    organizationId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    ezoneStudentId: string;
    fullName: string;
    attendance: number;
    cgpa: number;
    semester: number;
    department: string;
    subjects: any[];
    attendanceRecords: any[];
    lastSyncedAt: Date;
    syncStatus: 'SUCCESS' | 'FAILED' | 'PENDING';
    rawSnapshot?: any;
}

const ezoneProfileSchema = new Schema<IEzoneProfile>(
    {
        organizationId: {
            type: Schema.Types.ObjectId,
            ref: 'Organization',
            required: [true, 'Organization ID is required'],
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User ID is required'],
            index: true,
        },
        ezoneStudentId: {
            type: String,
            required: [true, 'Ezone Student ID is required'],
        },
        fullName: {
            type: String,
            required: [true, 'Full name is required'],
        },
        attendance: {
            type: Number,
            default: 0,
        },
        cgpa: {
            type: Number,
            default: 0,
        },
        semester: {
            type: Number,
            default: 1,
        },
        department: {
            type: String,
        },
        subjects: {
            type: [Schema.Types.Mixed],
            default: [],
        },
        attendanceRecords: {
            type: [Schema.Types.Mixed],
            default: [],
        },
        lastSyncedAt: {
            type: Date,
            default: Date.now,
        },
        syncStatus: {
            type: String,
            enum: ['SUCCESS', 'FAILED', 'PENDING'],
            default: 'PENDING',
        },
        rawSnapshot: {
            type: Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
    }
);

// Enforce organizationId isolation
ezoneProfileSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

export const EzoneProfile = mongoose.model<IEzoneProfile>('EzoneProfile', ezoneProfileSchema);
