import mongoose, { Document, Model, Schema } from 'mongoose';

export type ClassSessionStatus = 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';

export interface IClassSession extends Document {
  sessionCode: string; // e.g. "SESS-2026-02-14-01"
  batch: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  trainer: mongoose.Types.ObjectId;
  module?: mongoose.Types.ObjectId;
  lesson?: mongoose.Types.ObjectId;
  topicTitle: string; // e.g. "Introduction to Node.js & Event Loop Architecture"
  moduleLabel: string; // e.g. "Module 03 • Core Systems"
  description: string;
  classroom: string;
  roomNumber: string;
  sessionDate: Date; // Date stored in UTC
  startTime: string; // "10:30 AM"
  endTime: string; // "12:00 PM"
  status: ClassSessionStatus;
  startedAt?: Date;
  endedAt?: Date;
  activeAttendanceSession?: mongoose.Types.ObjectId;
}

const ClassSessionSchema = new Schema<IClassSession>(
  {
    sessionCode: { type: String, required: true, unique: true, index: true },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    trainer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    module: { type: Schema.Types.ObjectId, ref: 'CourseModule' },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    topicTitle: { type: String, required: true },
    moduleLabel: { type: String, default: '' },
    description: { type: String, default: '' },
    classroom: { type: String, default: '' },
    roomNumber: { type: String, default: '' },
    sessionDate: { type: Date, required: true, index: true },
    startTime: { type: String, default: '' },
    endTime: { type: String, default: '' },
    status: {
      type: String,
      enum: ['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED', 'RESCHEDULED'],
      default: 'SCHEDULED',
      index: true,
    },
    startedAt: { type: Date },
    endedAt: { type: Date },
    activeAttendanceSession: { type: Schema.Types.ObjectId, ref: 'AttendanceSession' },
  },
  { timestamps: true }
);

export const ClassSession: Model<IClassSession> =
  mongoose.models.ClassSession || mongoose.model<IClassSession>('ClassSession', ClassSessionSchema);
