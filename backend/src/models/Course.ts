import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ILesson extends Document {
  module: mongoose.Types.ObjectId;
  lessonNumber: number;
  title: string;
  description: string;
  objectives: string[];
  durationMinutes: number;
  materialsCount: number;
  scheduledDate?: Date;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
}

export interface ICourseModule extends Document {
  course: mongoose.Types.ObjectId;
  moduleNumber: number;
  title: string;
  description: string;
  objectives: string[];
  lessons: mongoose.Types.ObjectId[];
}

export interface ICourse extends Document {
  courseCode: string; // e.g. "NODE-FULLSTACK"
  title: string;
  description: string;
  durationWeeks: number;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'COMPREHENSIVE';
  status: 'ACTIVE' | 'ARCHIVED';
  thumbnail?: string;
  modules: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const LessonSchema = new Schema<ILesson>(
  {
    module: { type: Schema.Types.ObjectId, ref: 'CourseModule', required: true, index: true },
    lessonNumber: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    objectives: [{ type: String }],
    durationMinutes: { type: Number, default: 90 },
    materialsCount: { type: Number, default: 0 },
    scheduledDate: { type: Date },
    status: { type: String, enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

const CourseModuleSchema = new Schema<ICourseModule>(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    moduleNumber: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    objectives: [{ type: String }],
    lessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
  },
  { timestamps: true }
);

const CourseSchema = new Schema<ICourse>(
  {
    courseCode: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    durationWeeks: { type: Number, default: 12 },
    level: { type: String, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'COMPREHENSIVE'], default: 'COMPREHENSIVE' },
    status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE', index: true },
    thumbnail: { type: String },
    modules: [{ type: Schema.Types.ObjectId, ref: 'CourseModule' }],
  },
  { timestamps: true }
);

export const Lesson: Model<ILesson> = mongoose.models.Lesson || mongoose.model<ILesson>('Lesson', LessonSchema);
export const CourseModule: Model<ICourseModule> =
  mongoose.models.CourseModule || mongoose.model<ICourseModule>('CourseModule', CourseModuleSchema);
export const Course: Model<ICourse> = mongoose.models.Course || mongoose.model<ICourse>('Course', CourseSchema);
