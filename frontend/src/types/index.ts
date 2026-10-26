export type UserRole = 'ADMIN' | 'TRAINER' | 'STUDENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  status: 'ACTIVE' | 'INACTIVE';
  mustChangePassword?: boolean;
}

export interface StudentProfile {
  _id: string;
  studentId: string;
  college?: string;
  qualification?: string;
  graduationYear?: number;
  githubUrl?: string;
  linkedInUrl?: string;
  rfidTag?: string;
  attendanceHealthPercentage: number;
  storageUsedBytes: number;
}

export interface TrainerProfile {
  _id: string;
  trainerId: string;
  designation: string;
  bio?: string;
  specialization: string[];
}

export interface Enrollment {
  _id: string;
  status: 'ACTIVE' | 'COMPLETED' | 'SUSPENDED';
  totalEligibleClasses: number;
  classesAttended: number;
  classesLate: number;
  classesAbsent: number;
  attendancePercentage: number;
  curriculumProgressPercentage: number;
  batch?: any;
  course?: any;
}

export interface ClassSession {
  id: string;
  topicTitle: string;
  moduleLabel: string;
  description: string;
  classroom: string;
  roomNumber: string;
  startTime: string;
  endTime: string;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  trainer: {
    name: string;
    designation: string;
    mentorRole: string;
    avatar?: string;
  };
  isAttendanceOpen: boolean;
  attendanceSessionId?: string;
  studentAlreadyMarked: boolean;
}

export interface StudentDashboardData {
  student: {
    id: string;
    name: string;
    email: string;
    studentId: string;
    rfidTag?: string;
    avatar?: string;
    attendanceHealth: number;
    storageUsedFormatted: string;
  };
  batch: {
    id: string;
    name: string;
    code: string;
    timing: string;
    classroom: string;
    roomNumber: string;
    cohortName: string;
  };
  kpis: {
    attendanceRate: number;
    classesAttended: number;
    totalEligibleClasses: number;
    assignmentsSolved: number;
    totalAssignments: number;
    pendingGrading: number;
    curriculumVelocity: number;
    currentModuleLabel: string;
  };
  featuredClass: ClassSession | null;
  weeklyRecords: any[];
  assignments: any[];
  quizzes: any[];
  materials: any[];
  notices: any[];
}
