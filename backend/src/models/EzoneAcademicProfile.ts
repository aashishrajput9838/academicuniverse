import mongoose, { Schema, Document } from 'mongoose';

export interface IEzoneAcademicProfile extends Document {
    organizationId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    
    studentName: string;
    systemId: string;
    program: string;
    school: string;
    status: string;
    
    attendancePercentage: number;
    totalClasses: number;
    presentClasses: number;
    absentClasses: number;

    caMarks: {
        courseName: string;
        assignmentMarks: string;
        assessmentMarks: string;
        total: string;
    }[];

    timetable: {
        subject: string;
        faculty: string;
        room: string;
        time: string;
    }[];

    holidays: {
        name: string;
        date: string;
    }[];
    
    lastSyncedAt: Date;
}

const ezoneAcademicProfileSchema = new Schema<IEzoneAcademicProfile>(
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
        studentName: {
            type: String,
            required: true,
        },
        systemId: {
            type: String,
            required: true,
            index: true,
        },
        program: {
            type: String,
        },
        school: {
            type: String,
        },
        status: {
            type: String,
        },
        attendancePercentage: {
            type: Number,
            default: 0,
        },
        totalClasses: {
            type: Number,
            default: 0,
        },
        presentClasses: {
            type: Number,
            default: 0,
        },
        absentClasses: {
            type: Number,
            default: 0,
        },
        caMarks: [
            {
                courseName: String,
                assignmentMarks: String,
                assessmentMarks: String,
                total: String,
            },
        ],
        timetable: [
            {
                subject: String,
                faculty: String,
                room: String,
                time: String,
            },
        ],
        holidays: [
            {
                name: String,
                date: String,
            },
        ],
        lastSyncedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Enforce organizationId isolation
ezoneAcademicProfileSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

export const EzoneAcademicProfile = mongoose.model<IEzoneAcademicProfile>('EzoneAcademicProfile', ezoneAcademicProfileSchema);
