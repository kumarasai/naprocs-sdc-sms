import mongoose, { Document, Model, Schema } from 'mongoose';

// --- ASSIGNMENTS ---
export interface IAssignment extends Document {
  title: string;
  description: string;
  course: mongoose.Types.ObjectId;
  batch: mongoose.Types.ObjectId;
  trainer: mongoose.Types.ObjectId;
  moduleLabel: string;
  dueDate: Date;
  totalPoints: number;
  githubTemplateUrl?: string;
  instructions: string;
  status: 'PUBLISHED' | 'DRAFT' | 'CLOSED';
}

export interface IAssignmentSubmission extends Document {
  assignment: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  githubRepoUrl: string;
  liveDemoUrl?: string;
  notes?: string;
  submittedAt: Date;
  status: 'SUBMITTED' | 'GRADED' | 'RESUBMISSION_REQUESTED';
  score?: number;
  mentorFeedback?: string;
  gradedBy?: mongoose.Types.ObjectId;
  gradedAt?: Date;
}

// --- QUIZZES ---
export interface IQuizQuestion extends Document {
  quiz: mongoose.Types.ObjectId;
  questionNumber: number;
  prompt: string;
  codeSnippet?: string;
  options: string[];
  correctOptionIndex: number;
  points: number;
  explanation?: string;
}

export interface IQuiz extends Document {
  title: string;
  description: string;
  course: mongoose.Types.ObjectId;
  batch: mongoose.Types.ObjectId;
  trainer: mongoose.Types.ObjectId;
  durationMinutes: number;
  totalQuestions: number;
  totalPoints: number;
  passingScore: number;
  scheduledAt: Date;
  deadline: Date;
  isPublished: boolean;
}

export interface IQuizAttempt extends Document {
  quiz: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  startedAt: Date;
  submittedAt: Date;
  answers: {
    questionId: mongoose.Types.ObjectId;
    selectedOptionIndex: number;
    isCorrect: boolean;
    pointsAwarded: number;
  }[];
  totalScore: number;
  percentage: number;
  passed: boolean;
}

// --- STUDY MATERIALS ---
export interface IStudyMaterial extends Document {
  title: string;
  description: string;
  course: mongoose.Types.ObjectId;
  moduleLabel: string;
  fileType: 'PDF' | 'ZIP' | 'CODE' | 'LINK' | 'VIDEO';
  fileUrl: string;
  fileSizeBytes: number;
  fileSizeFormatted: string; // e.g. "4.8 MB"
  category: string; // e.g. "Lecture Notes", "Code Starter", "Cheatsheet"
  uploadedBy: mongoose.Types.ObjectId;
  downloadsCount: number;
}

// --- STUDENT LESSON PROGRESS ---
export interface IStudentLessonProgress extends Document {
  student: mongoose.Types.ObjectId;
  lesson: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  isCompleted: boolean;
  completedAt?: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    trainer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    moduleLabel: { type: String, default: '' },
    dueDate: { type: Date, required: true },
    totalPoints: { type: Number, default: 100 },
    githubTemplateUrl: { type: String },
    instructions: { type: String },
    status: { type: String, enum: ['PUBLISHED', 'DRAFT', 'CLOSED'], default: 'PUBLISHED' },
  },
  { timestamps: true }
);

const AssignmentSubmissionSchema = new Schema<IAssignmentSubmission>(
  {
    assignment: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    githubRepoUrl: { type: String, required: true },
    liveDemoUrl: { type: String },
    notes: { type: String },
    submittedAt: { type: Date, default: () => new Date() },
    status: {
      type: String,
      enum: ['SUBMITTED', 'GRADED', 'RESUBMISSION_REQUESTED'],
      default: 'SUBMITTED',
      index: true,
    },
    score: { type: Number },
    mentorFeedback: { type: String },
    gradedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    gradedAt: { type: Date },
  },
  { timestamps: true }
);

AssignmentSubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

const QuizQuestionSchema = new Schema<IQuizQuestion>(
  {
    quiz: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    questionNumber: { type: Number, required: true },
    prompt: { type: String, required: true },
    codeSnippet: { type: String },
    options: [{ type: String, required: true }],
    correctOptionIndex: { type: Number, required: true, select: false }, // Never expose answers by default
    points: { type: Number, default: 1 },
    explanation: { type: String },
  },
  { timestamps: true }
);

const QuizSchema = new Schema<IQuiz>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    trainer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    durationMinutes: { type: Number, default: 20 },
    totalQuestions: { type: Number, default: 20 },
    totalPoints: { type: Number, default: 20 },
    passingScore: { type: Number, default: 14 },
    scheduledAt: { type: Date, default: () => new Date() },
    deadline: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const QuizAttemptSchema = new Schema<IQuizAttempt>(
  {
    quiz: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startedAt: { type: Date, default: () => new Date() },
    submittedAt: { type: Date, default: () => new Date() },
    answers: [
      {
        questionId: { type: Schema.Types.ObjectId, ref: 'QuizQuestion' },
        selectedOptionIndex: { type: Number, required: true },
        isCorrect: { type: Boolean, required: true },
        pointsAwarded: { type: Number, default: 0 },
      },
    ],
    totalScore: { type: Number, required: true },
    percentage: { type: Number, required: true },
    passed: { type: Boolean, required: true },
  },
  { timestamps: true }
);

const StudyMaterialSchema = new Schema<IStudyMaterial>(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    moduleLabel: { type: String, default: '' },
    fileType: { type: String, enum: ['PDF', 'ZIP', 'CODE', 'LINK', 'VIDEO'], default: 'PDF' },
    fileUrl: { type: String, required: true },
    fileSizeBytes: { type: Number, default: 0 },
    fileSizeFormatted: { type: String, default: '0 KB' },
    category: { type: String, default: 'Study Material' },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    downloadsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const StudentLessonProgressSchema = new Schema<IStudentLessonProgress>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true, index: true },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

StudentLessonProgressSchema.index({ student: 1, lesson: 1 }, { unique: true });

export const Assignment: Model<IAssignment> =
  mongoose.models.Assignment || mongoose.model<IAssignment>('Assignment', AssignmentSchema);
export const AssignmentSubmission: Model<IAssignmentSubmission> =
  mongoose.models.AssignmentSubmission ||
  mongoose.model<IAssignmentSubmission>('AssignmentSubmission', AssignmentSubmissionSchema);
export const Quiz: Model<IQuiz> = mongoose.models.Quiz || mongoose.model<IQuiz>('Quiz', QuizSchema);
export const QuizQuestion: Model<IQuizQuestion> =
  mongoose.models.QuizQuestion || mongoose.model<IQuizQuestion>('QuizQuestion', QuizQuestionSchema);
export const QuizAttempt: Model<IQuizAttempt> =
  mongoose.models.QuizAttempt || mongoose.model<IQuizAttempt>('QuizAttempt', QuizAttemptSchema);
export const StudyMaterial: Model<IStudyMaterial> =
  mongoose.models.StudyMaterial || mongoose.model<IStudyMaterial>('StudyMaterial', StudyMaterialSchema);
export const StudentLessonProgress: Model<IStudentLessonProgress> =
  mongoose.models.StudentLessonProgress ||
  mongoose.model<IStudentLessonProgress>('StudentLessonProgress', StudentLessonProgressSchema);
