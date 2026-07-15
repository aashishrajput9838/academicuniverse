import mongoose, { Schema, Document } from 'mongoose';

export interface IEzoneAcademicProfile extends Document {
    organizationId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    
    studentName: string;
    systemId: string;
    program: string;
    school: string;
    status: string;
    email?: string;
    department?: string;
    semester?: string;
    
    attendancePercentage: number;
    totalClasses: number;
    presentClasses: number;
    absentClasses: number;

    caMarks: {
        courseCode: string;
        courseName: string;
        assignment1: string;
        assignment2: string;
        assessment1: string;
        assessment2: string;
        total: string;
    }[];

    subjects: {
        courseCode: string;
        courseName: string;
        faculty: string;
        courseType: string;
        credits: number;
        attendancePercentage: number;
    }[];

    timetable: {
        day?: string;
        time: string;
        subject: string;
        courseName?: string;
        faculty: string;
        room: string;
    }[];

    holidays: {
        holidayName?: string;
        name?: string;
        holidayDate?: string;
        date?: string;
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
        email: String,
        department: String,
        program: {
            type: String,
        },
        school: {
            type: String,
        },
        semester: String,
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
                courseCode: String,
                courseName: String,
                assignment1: String,
                assignment2: String,
                assessment1: String,
                assessment2: String,
                total: String,
            },
        ],
        subjects: [
            {
                courseCode: String,
                courseName: String,
                faculty: String,
                courseType: String,
                credits: Number,
                attendancePercentage: Number,
            },
        ],
        timetable: [
            {
                day: String,
                time: String,
                subject: String,
                courseName: String,
                faculty: String,
                room: String,
            },
        ],
        holidays: [
            {
                holidayName: String,
                name: String,
                holidayDate: String,
                date: String,
            },
        ],
        lastSyncedAt: {
            type: Date,
            default: Date.now,
        },
    } as any,
    {
        timestamps: true,
    }
);

// Enforce organizationId isolation
ezoneAcademicProfileSchema.index({ organizationId: 1, userId: 1 }, { unique: true } as any);

export const EzoneAcademicProfile = mongoose.model<IEzoneAcademicProfile>('EzoneAcademicProfile', ezoneAcademicProfileSchema);
