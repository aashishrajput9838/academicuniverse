import { Schema, model, Document, Types } from 'mongoose';

/**
 * AcademicSchedule — canonical collection for AI-extracted and human-approved
 * academic timetable data (ACADEMIC_TIMETABLE documents).
 */
export interface IScheduleEvent {
  timeSlot: string;
  courseCode: string;
  courseName: string;
  room: string;
  instructor: string;
  type?: string;
}

export interface IScheduleDay {
  date: string;
  events: IScheduleEvent[];
}

export interface IAcademicSchedule extends Document {
  organizationId: Types.ObjectId;
  personId: Types.ObjectId;
  sourceProcessingId: string;
  rawConfidence: number;
  schedule: IScheduleDay[];
  approvedBy: string;
  approvedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduleEventSchema = new Schema(
  {
    timeSlot: { type: String, default: '' },
    courseCode: { type: String, default: '' },
    courseName: { type: String, default: '' },
    room: { type: String, default: '' },
    instructor: { type: String, default: '' },
    type: { type: String },
  },
  { _id: false }
);

const ScheduleDaySchema = new Schema(
  {
    date: { type: String, required: true },
    events: { type: [ScheduleEventSchema], default: [] },
  },
  { _id: false }
);

const AcademicScheduleSchema = new Schema<IAcademicSchedule>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true, ref: 'Organization' } as any,
    personId: { type: Schema.Types.ObjectId, required: true, ref: 'Person' } as any,
    sourceProcessingId: { type: String, required: true },
    rawConfidence: { type: Number, required: true },
    schedule: { type: [ScheduleDaySchema], default: [] } as any,
    approvedBy: { type: String, required: true },
    approvedAt: { type: Date, required: true },
  } as any,
  { timestamps: true }
);

AcademicScheduleSchema.index(
  { organizationId: 1, personId: 1 },
  { unique: true, name: 'uniqueAcademicSchedulePerPerson' } as any
);

export const AcademicSchedule = model<IAcademicSchedule>('AcademicSchedule', AcademicScheduleSchema);
