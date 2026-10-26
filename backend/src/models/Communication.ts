import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IAnnouncement extends Document {
  title: string;
  description: string;
  priority: 'NORMAL' | 'HIGH' | 'PRIORITY' | 'FACILITY';
  targetAudience: 'ALL' | 'STUDENTS' | 'TRAINERS' | 'BATCH';
  targetBatch?: mongoose.Types.ObjectId;
  locationScope?: string; // e.g. "Mandatory for Batch 01 • Main Auditorium"
  publishedBy: mongoose.Types.ObjectId;
  publishDate: Date;
  expiryDate?: Date;
  isActive: boolean;
}

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: 'ATTENDANCE' | 'ASSIGNMENT' | 'QUIZ' | 'ANNOUNCEMENT' | 'SYSTEM';
  isRead: boolean;
  link?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface IInstituteSettings extends Document {
  instituteName: string;
  portalSubtitle: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  timezone: string;
  qrRefreshIntervalSeconds: number;
  qrLateToleranceMinutes: number;
  qrAbsentToleranceMinutes: number;
  antiProxyStrictness: 'LENIENT' | 'MODERATE' | 'STRICT';
  requireTrainerFinalization: boolean;
  campusWifiEnabled: boolean;
  campusWifiSsid: string;
  allowedWifiIps: string[];
  minAttendanceHoursForPresent: number;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    priority: { type: String, enum: ['NORMAL', 'HIGH', 'PRIORITY', 'FACILITY'], default: 'NORMAL' },
    targetAudience: { type: String, enum: ['ALL', 'STUDENTS', 'TRAINERS', 'BATCH'], default: 'ALL' },
    targetBatch: { type: Schema.Types.ObjectId, ref: 'Batch' },
    locationScope: { type: String, default: '' },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    publishDate: { type: Date, default: () => new Date() },
    expiryDate: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const NotificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['ATTENDANCE', 'ASSIGNMENT', 'QUIZ', 'ANNOUNCEMENT', 'SYSTEM'],
      default: 'SYSTEM',
    },
    isRead: { type: Boolean, default: false, index: true },
    link: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const InstituteSettingsSchema = new Schema<IInstituteSettings>(
  {
    instituteName: { type: String, default: 'Naprocs Skill Development Center' },
    portalSubtitle: { type: String, default: 'Node.js & Software Training Hub' },
    contactEmail: { type: String, default: 'support@naprocs.com' },
    contactPhone: { type: String, default: '+91 98765 43210' },
    address: { type: String, default: 'Naprocs Tech Center, 2nd Floor, Hi-Tech City, Hyderabad' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    qrRefreshIntervalSeconds: { type: Number, default: 30 },
    qrLateToleranceMinutes: { type: Number, default: 15 },
    qrAbsentToleranceMinutes: { type: Number, default: 45 },
    antiProxyStrictness: { type: String, enum: ['LENIENT', 'MODERATE', 'STRICT'], default: 'MODERATE' },
    requireTrainerFinalization: { type: Boolean, default: true },
    campusWifiEnabled: { type: Boolean, default: true },
    campusWifiSsid: { type: String, default: 'Naprocs-Campus-5G' },
    allowedWifiIps: {
      type: [String],
      default: ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost', '*'],
    },
    minAttendanceHoursForPresent: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export const Announcement: Model<IAnnouncement> =
  mongoose.models.Announcement || mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);
export const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
export const InstituteSettings: Model<IInstituteSettings> =
  mongoose.models.InstituteSettings ||
  mongoose.model<IInstituteSettings>('InstituteSettings', InstituteSettingsSchema);
