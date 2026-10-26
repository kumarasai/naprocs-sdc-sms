import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IStudentProfile extends Document {
  user: mongoose.Types.ObjectId;
  studentId: string; // e.g. "NPC-2025-N01-084"
  college?: string;
  qualification?: string;
  graduationYear?: number;
  githubUrl?: string;
  linkedInUrl?: string;
  rfidTag?: string;
  emergencyContact?: string;
  address?: string;
  attendanceHealthPercentage: number;
  storageUsedBytes: number;
}

export interface ITrainerProfile extends Document {
  user: mongoose.Types.ObjectId;
  trainerId: string; // e.g. "NPC-TR-001"
  designation: string; // e.g. "Chief Technical Trainer & Lead Mentor"
  bio?: string;
  specialization: string[];
  experienceYears?: number;
  assignedBatches: mongoose.Types.ObjectId[];
}

const StudentProfileSchema = new Schema<IStudentProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    studentId: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    college: { type: String, default: '' },
    qualification: { type: String, default: '' },
    graduationYear: { type: Number },
    githubUrl: { type: String, default: '' },
    linkedInUrl: { type: String, default: '' },
    rfidTag: { type: String },
    emergencyContact: { type: String },
    address: { type: String },
    attendanceHealthPercentage: { type: Number, default: 0 },
    storageUsedBytes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const TrainerProfileSchema = new Schema<ITrainerProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    trainerId: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    designation: { type: String, default: 'Faculty Trainer' },
    bio: { type: String, default: '' },
    specialization: [{ type: String }],
    experienceYears: { type: Number, default: 0 },
    assignedBatches: [{ type: Schema.Types.ObjectId, ref: 'Batch' }],
  },
  { timestamps: true }
);

export const StudentProfile: Model<IStudentProfile> =
  mongoose.models.StudentProfile || mongoose.model<IStudentProfile>('StudentProfile', StudentProfileSchema);

export const TrainerProfile: Model<ITrainerProfile> =
  mongoose.models.TrainerProfile || mongoose.model<ITrainerProfile>('TrainerProfile', TrainerProfileSchema);
