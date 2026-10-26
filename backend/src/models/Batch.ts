import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IBatch extends Document {
  batchCode: string; // e.g. "NODE-B01"
  name: string; // e.g. "Node.js Batch 01"
  course: mongoose.Types.ObjectId;
  trainer: mongoose.Types.ObjectId;
  classroom: string; // e.g. "Lab 2, 2nd Floor • Naprocs Tech Center"
  roomNumber: string; // e.g. "Room 204"
  timing: string; // e.g. "10:30 AM - 12:00 PM"
  startTime: string; // "10:30"
  endTime: string; // "12:00"
  cohortName: string; // e.g. "Spring Semester • Offline Cohort"
  startDate: Date;
  endDate: Date;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  enrolledStudentsCount: number;
  maxCapacity: number;
}

export interface IEnrollment extends Document {
  student: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  batch: mongoose.Types.ObjectId;
  enrollmentDate: Date;
  status: 'ACTIVE' | 'COMPLETED' | 'SUSPENDED' | 'DROPPED';
  totalEligibleClasses: number;
  classesAttended: number;
  classesLate: number;
  classesAbsent: number;
  attendancePercentage: number;
  curriculumProgressPercentage: number;
}

const BatchSchema = new Schema<IBatch>(
  {
    batchCode: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    trainer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    classroom: { type: String, default: '' },
    roomNumber: { type: String, default: '' },
    timing: { type: String, default: '' },
    startTime: { type: String, default: '' },
    endTime: { type: String, default: '' },
    cohortName: { type: String, default: '' },
    startDate: { type: Date, default: () => new Date() },
    endDate: { type: Date, default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
    status: { type: String, enum: ['UPCOMING', 'ACTIVE', 'COMPLETED', 'ARCHIVED'], default: 'ACTIVE', index: true },
    enrolledStudentsCount: { type: Number, default: 0 },
    maxCapacity: { type: Number, default: 40 },
  },
  { timestamps: true }
);

const EnrollmentSchema = new Schema<IEnrollment>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    enrollmentDate: { type: Date, default: () => new Date() },
    status: { type: String, enum: ['ACTIVE', 'COMPLETED', 'SUSPENDED', 'DROPPED'], default: 'ACTIVE', index: true },
    totalEligibleClasses: { type: Number, default: 0 },
    classesAttended: { type: Number, default: 0 },
    classesLate: { type: Number, default: 0 },
    classesAbsent: { type: Number, default: 0 },
    attendancePercentage: { type: Number, default: 0 },
    curriculumProgressPercentage: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Compound index to guarantee one active enrollment per student per batch
EnrollmentSchema.index({ student: 1, batch: 1 }, { unique: true });

export const Batch: Model<IBatch> = mongoose.models.Batch || mongoose.model<IBatch>('Batch', BatchSchema);
export const Enrollment: Model<IEnrollment> =
  mongoose.models.Enrollment || mongoose.model<IEnrollment>('Enrollment', EnrollmentSchema);
