import mongoose, { Document, Model, Schema } from 'mongoose';

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED' | 'PENDING_VERIFICATION' | 'HALF_DAY';
export type VerificationMethod = 'QR_SCAN' | 'MANUAL_TRAINER' | 'SYSTEM_AUTO_ABSENT' | 'CORRECTION_APPROVED' | 'WIFI_CHECKIN';

export interface IAttendanceSession extends Document {
  classSession: mongoose.Types.ObjectId;
  batch: mongoose.Types.ObjectId;
  trainer: mongoose.Types.ObjectId;
  status: 'ACTIVE' | 'CLOSED';
  openedAt: Date;
  closedAt?: Date;
  currentRollingToken: string;
  tokenExpiresAt: Date;
  tokenSequence: number;
  totalEligible: number;
  totalPresent: number;
  totalLate: number;
  totalAbsent: number;
  isFinalized: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAttendanceRecord extends Document {
  attendanceSession?: mongoose.Types.ObjectId;
  classSession: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  batch: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  attendanceDate: Date;
  checkInTime?: Date;
  checkOutTime?: Date;
  durationMinutes?: number;
  status: AttendanceStatus;
  verificationMethod: VerificationMethod;
  tokenUsed?: string;
  ipAddress?: string;
  userAgent?: string;
  wifiSignalMatched?: boolean;
  flaggedSuspicious: boolean;
  markedBy?: mongoose.Types.ObjectId;
  modifiedBy?: mongoose.Types.ObjectId;
  modificationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAttendanceAuditLog extends Document {
  attendanceRecord: mongoose.Types.ObjectId;
  classSession: mongoose.Types.ObjectId;
  performedBy: mongoose.Types.ObjectId;
  action: 'CREATED' | 'FINALIZED' | 'MANUAL_EDIT' | 'CORRECTION_APPROVED' | 'CORRECTION_REJECTED';
  previousStatus?: string;
  newStatus: string;
  reason?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface IAttendanceCorrectionRequest extends Document {
  student: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  classSession: mongoose.Types.ObjectId;
  attendanceRecord?: mongoose.Types.ObjectId;
  requestedStatus: AttendanceStatus;
  reason: string;
  supportingDocUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: mongoose.Types.ObjectId;
  reviewNote?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSessionSchema = new Schema<IAttendanceSession>(
  {
    classSession: { type: Schema.Types.ObjectId, ref: 'ClassSession', required: true, index: true },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    trainer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['ACTIVE', 'CLOSED'], default: 'ACTIVE', index: true },
    openedAt: { type: Date, default: () => new Date() },
    closedAt: { type: Date },
    currentRollingToken: { type: String, default: '' },
    tokenExpiresAt: { type: Date, default: () => new Date() },
    tokenSequence: { type: Number, default: 0 },
    totalEligible: { type: Number, default: 0 },
    totalPresent: { type: Number, default: 0 },
    totalLate: { type: Number, default: 0 },
    totalAbsent: { type: Number, default: 0 },
    isFinalized: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const AttendanceRecordSchema = new Schema<IAttendanceRecord>(
  {
    attendanceSession: { type: Schema.Types.ObjectId, ref: 'AttendanceSession', index: true },
    classSession: { type: Schema.Types.ObjectId, ref: 'ClassSession', required: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    attendanceDate: { type: Date, required: true, index: true },
    checkInTime: { type: Date },
    checkOutTime: { type: Date },
    durationMinutes: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED', 'PENDING_VERIFICATION', 'HALF_DAY'],
      default: 'PENDING_VERIFICATION',
      index: true,
    },
    verificationMethod: {
      type: String,
      enum: ['QR_SCAN', 'MANUAL_TRAINER', 'SYSTEM_AUTO_ABSENT', 'CORRECTION_APPROVED', 'WIFI_CHECKIN'],
      default: 'WIFI_CHECKIN',
    },
    tokenUsed: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    wifiSignalMatched: { type: Boolean, default: true },
    flaggedSuspicious: { type: Boolean, default: false },
    markedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    modificationReason: { type: String },
  },
  { timestamps: true }
);

// Mandatory compound unique index: exactly one attendance record per student per class session
AttendanceRecordSchema.index({ student: 1, classSession: 1 }, { unique: true });

const AttendanceAuditLogSchema = new Schema<IAttendanceAuditLog>(
  {
    attendanceRecord: { type: Schema.Types.ObjectId, ref: 'AttendanceRecord', required: true, index: true },
    classSession: { type: Schema.Types.ObjectId, ref: 'ClassSession', required: true, index: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: {
      type: String,
      enum: ['CREATED', 'FINALIZED', 'MANUAL_EDIT', 'CORRECTION_APPROVED', 'CORRECTION_REJECTED'],
      required: true,
    },
    previousStatus: { type: String },
    newStatus: { type: String, required: true },
    reason: { type: String },
    metadata: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: () => new Date() },
  },
  { timestamps: false }
);

const AttendanceCorrectionRequestSchema = new Schema<IAttendanceCorrectionRequest>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    classSession: { type: Schema.Types.ObjectId, ref: 'ClassSession', required: true, index: true },
    attendanceRecord: { type: Schema.Types.ObjectId, ref: 'AttendanceRecord' },
    requestedStatus: {
      type: String,
      enum: ['PRESENT', 'LATE', 'EXCUSED'],
      default: 'PRESENT',
      required: true,
    },
    reason: { type: String, required: true },
    supportingDocUrl: { type: String },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewNote: { type: String },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

export const AttendanceSession: Model<IAttendanceSession> =
  mongoose.models.AttendanceSession ||
  mongoose.model<IAttendanceSession>('AttendanceSession', AttendanceSessionSchema);

export const AttendanceRecord: Model<IAttendanceRecord> =
  mongoose.models.AttendanceRecord || mongoose.model<IAttendanceRecord>('AttendanceRecord', AttendanceRecordSchema);

export const AttendanceAuditLog: Model<IAttendanceAuditLog> =
  mongoose.models.AttendanceAuditLog ||
  mongoose.model<IAttendanceAuditLog>('AttendanceAuditLog', AttendanceAuditLogSchema);

export const AttendanceCorrectionRequest: Model<IAttendanceCorrectionRequest> =
  mongoose.models.AttendanceCorrectionRequest ||
  mongoose.model<IAttendanceCorrectionRequest>('AttendanceCorrectionRequest', AttendanceCorrectionRequestSchema);
