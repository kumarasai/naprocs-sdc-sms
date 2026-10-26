import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { User } from '../models/User';
import { StudentProfile, TrainerProfile } from '../models/Profiles';
import { Course, CourseModule, Lesson } from '../models/Course';
import { Batch, Enrollment } from '../models/Batch';
import { ClassSession } from '../models/ClassSession';
import { AttendanceRecord, AttendanceAuditLog } from '../models/Attendance';
import { AssignmentSubmission, QuizAttempt } from '../models/Learning';

export async function getAdminDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const totalStudents = await StudentProfile.countDocuments();
    const totalTrainers = await TrainerProfile.countDocuments();
    const activeCourses = await Course.countDocuments({ status: 'ACTIVE' });
    const activeBatches = await Batch.countDocuments({ status: 'ACTIVE' });

    // Today's attendance calculation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRecords = await AttendanceRecord.find({
      attendanceDate: { $gte: today },
    });

    const todayPresent = todayRecords.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
    const todayTotal = todayRecords.length;
    const todayRate = todayTotal > 0 ? parseFloat(((todayPresent / todayTotal) * 100).toFixed(1)) : 0;

    // Low attendance alerts (students with attendance < 75%)
    const lowAttendanceEnrollments = await Enrollment.find({
      attendancePercentage: { $lt: 75 },
      status: 'ACTIVE',
    })
      .populate('user', 'name email avatar phone')
      .populate('batch', 'name')
      .limit(10);

    // Recent Audit Logs
    const recentAuditLogs = await AttendanceAuditLog.find()
      .populate('performedBy', 'name role')
      .sort({ timestamp: -1 })
      .limit(8);

    res.json({
      success: true,
      data: {
        stats: {
          totalStudents,
          totalTrainers,
          activeCourses,
          activeBatches,
          todayAttendanceRate: todayRate,
          todayAttendanceCount: todayPresent,
          todayTotalConducted: todayTotal,
        },
        lowAttendanceAlerts: lowAttendanceEnrollments,
        recentAuditLogs,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// ---------------- STUDENT REGISTRATION (ADMIN ONLY) ----------------
export async function registerStudent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const {
      name,
      email,
      password,
      phone,
      studentId,
      college,
      qualification,
      graduationYear,
      batchId,
      courseId,
    } = req.body;

    if (!name || !email || !password || !studentId) {
      res.status(400).json({ success: false, message: 'Name, email, password, and Student ID are required.' });
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      res.status(409).json({ success: false, message: 'A user with this email already exists.' });
      return;
    }

    const existingStudentId = await StudentProfile.findOne({ studentId: studentId.toUpperCase().trim() });
    if (existingStudentId) {
      res.status(409).json({ success: false, message: 'A student with this Student ID already exists.' });
      return;
    }

    // 1. Create User
    const user = new User({
      name,
      email,
      passwordHash: password,
      phone,
      role: 'STUDENT',
      status: 'ACTIVE',
      mustChangePassword: true,
    });
    await user.save();

    // 2. Create StudentProfile
    const profile = await StudentProfile.create({
      user: user._id,
      studentId: studentId.toUpperCase().trim(),
      college: college ? college.trim() : '—',
      qualification: qualification ? qualification.trim() : '—',
      graduationYear: graduationYear || 2025,
      attendanceHealthPercentage: 100,
    });

    // 3. Optional batch enrollment
    if (batchId && courseId) {
      await Enrollment.create({
        student: profile._id,
        user: user._id,
        batch: batchId,
        course: courseId,
        attendancePercentage: 100,
      });

      await Batch.findByIdAndUpdate(batchId, { $inc: { enrolledStudentsCount: 1 } });
    }

    res.status(201).json({
      success: true,
      message: 'Student registered and enrolled successfully.',
      student: {
        id: profile._id,
        userId: user._id,
        name: user.name,
        email: user.email,
        studentId: profile.studentId,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// ---------------- TRAINER REGISTRATION (ADMIN ONLY) ----------------
export async function registerTrainer(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const {
      name,
      email,
      password,
      phone,
      trainerId,
      designation,
      bio,
      specialization,
      experienceYears,
      assignedBatches,
    } = req.body;

    if (!name || !email || !password || !trainerId) {
      res.status(400).json({ success: false, message: 'Name, email, password, and Trainer ID are required.' });
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      res.status(409).json({ success: false, message: 'A user with this email already exists.' });
      return;
    }

    const existingTrainerId = await TrainerProfile.findOne({ trainerId: trainerId.toUpperCase().trim() });
    if (existingTrainerId) {
      res.status(409).json({ success: false, message: 'A trainer with this Trainer ID already exists.' });
      return;
    }

    const user = new User({
      name,
      email,
      passwordHash: password,
      phone,
      role: 'TRAINER',
      status: 'ACTIVE',
      mustChangePassword: true,
    });
    await user.save();

    const specs = Array.isArray(specialization) ? specialization : specialization ? specialization.split(',').map((s: string) => s.trim()) : ['Node.js', 'Fullstack'];

    const profile = await TrainerProfile.create({
      user: user._id,
      trainerId: trainerId.toUpperCase().trim(),
      designation: designation || 'Technical Trainer & Mentor',
      bio: bio || 'Faculty member at Naprocs Skill Development Center.',
      specialization: specs,
      experienceYears: experienceYears || 5,
      assignedBatches: assignedBatches || [],
    });

    res.status(201).json({
      success: true,
      message: 'Trainer profile successfully created and activated.',
      trainer: {
        id: profile._id,
        userId: user._id,
        name: user.name,
        email: user.email,
        trainerId: profile.trainerId,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getAllStudents(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { search, status } = req.query;

    const students = await StudentProfile.find()
      .populate('user', 'name email phone avatar status')
      .sort({ createdAt: -1 });

    const enrollments = await Enrollment.find().populate('batch', 'name batchCode');
    const enrollmentMap = new Map(enrollments.map((e) => [e.student.toString(), e]));

    let result = students.map((s) => {
      const enr = enrollmentMap.get(s._id.toString());
      return {
        id: s._id,
        studentId: s.studentId,
        name: (s.user as any)?.name,
        email: (s.user as any)?.email,
        phone: (s.user as any)?.phone,
        status: (s.user as any)?.status,
        avatar: (s.user as any)?.avatar,
        college: s.college,
        qualification: s.qualification,
        graduationYear: s.graduationYear,
        batchName: (enr?.batch as any)?.name || 'Unassigned',
        attendancePercentage: enr?.attendancePercentage ?? s.attendanceHealthPercentage,
        enrolledClassesAttended: `${enr?.classesAttended || 0} / ${enr?.totalEligibleClasses || 0}`,
      };
    });

    if (search) {
      const s = (search as string).toLowerCase();
      result = result.filter(
        (st) =>
          st.name?.toLowerCase().includes(s) ||
          st.email?.toLowerCase().includes(s) ||
          st.studentId?.toLowerCase().includes(s)
      );
    }

    res.json({ success: true, count: result.length, students: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getAllTrainers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const trainers = await TrainerProfile.find()
      .populate('user', 'name email phone avatar status')
      .populate('assignedBatches', 'name batchCode')
      .sort({ createdAt: -1 });

    const result = trainers.map((t) => ({
      id: t._id,
      trainerId: t.trainerId,
      name: (t.user as any)?.name,
      email: (t.user as any)?.email,
      phone: (t.user as any)?.phone,
      status: (t.user as any)?.status,
      avatar: (t.user as any)?.avatar,
      designation: t.designation,
      bio: t.bio,
      specialization: t.specialization,
      experienceYears: t.experienceYears,
      assignedBatches: t.assignedBatches,
    }));

    res.json({ success: true, count: result.length, trainers: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateStudentStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { studentId } = req.params;
    const { status } = req.body;

    const student = await StudentProfile.findById(studentId);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student profile not found.' });
      return;
    }

    await User.findByIdAndUpdate(student.user, { status });

    res.json({ success: true, message: `Student status updated to ${status}.` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateTrainerStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { trainerId } = req.params;
    const { status } = req.body;

    const trainer = await TrainerProfile.findById(trainerId);
    if (!trainer) {
      res.status(404).json({ success: false, message: 'Trainer profile not found.' });
      return;
    }

    await User.findByIdAndUpdate(trainer.user, { status });

    res.json({ success: true, message: `Trainer status updated to ${status}.` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// ---------------- DELETE STUDENT (ADMIN ONLY) ----------------
export async function deleteStudent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const studentId = String(req.params.studentId || '');

    let student: any = null;
    if (mongoose.Types.ObjectId.isValid(studentId)) {
      student = await StudentProfile.findById(studentId);
      if (!student) {
        student = await StudentProfile.findOne({ user: studentId });
      }
    }
    if (!student) {
      student = await StudentProfile.findOne({ studentId: studentId.toUpperCase().trim() });
    }

    if (!student) {
      if (mongoose.Types.ObjectId.isValid(studentId)) {
        await User.findByIdAndDelete(studentId);
      }
      res.json({ success: true, message: 'Student records cleared from database.' });
      return;
    }

    const userId = student.user;

    // 1. Decrement batch enrolled counts
    const enrollments = await Enrollment.find({ student: student._id });
    for (const enr of enrollments) {
      if (enr.batch) {
        await Batch.findByIdAndUpdate(enr.batch, { $inc: { enrolledStudentsCount: -1 } });
      }
    }

    // 2. Cascade delete student records
    await Enrollment.deleteMany({ student: student._id });
    await AttendanceRecord.deleteMany({ student: student._id });
    await AssignmentSubmission.deleteMany({ student: student._id });
    await QuizAttempt.deleteMany({ student: student._id });

    // 3. Delete StudentProfile
    await StudentProfile.findByIdAndDelete(student._id);

    // 4. Delete corresponding User credentials account
    if (userId) {
      await User.findByIdAndDelete(userId);
    }

    res.json({
      success: true,
      message: 'Student profile and credentials permanently deleted from database.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// ---------------- DELETE TRAINER (ADMIN ONLY) ----------------
export async function deleteTrainer(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const trainerId = String(req.params.trainerId || '');

    let trainer: any = null;
    if (mongoose.Types.ObjectId.isValid(trainerId)) {
      trainer = await TrainerProfile.findById(trainerId);
      if (!trainer) {
        trainer = await TrainerProfile.findOne({ user: trainerId });
      }
    }
    if (!trainer) {
      trainer = await TrainerProfile.findOne({ trainerId: trainerId.toUpperCase().trim() });
    }

    if (!trainer) {
      if (mongoose.Types.ObjectId.isValid(trainerId)) {
        await User.findByIdAndDelete(trainerId);
      }
      res.json({ success: true, message: 'Trainer records cleared from database.' });
      return;
    }

    const userId = trainer.user;

    // 1. Unassign trainer from any batches
    await Batch.updateMany({ trainer: trainer._id }, { $unset: { trainer: 1 } });

    // 2. Delete TrainerProfile
    await TrainerProfile.findByIdAndDelete(trainer._id);

    // 3. Delete corresponding User credentials account
    if (userId) {
      await User.findByIdAndDelete(userId);
    }

    res.json({
      success: true,
      message: 'Trainer profile and credentials permanently deleted from database.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// ---------------- BATCH CREATION (ADMIN ONLY) ----------------
export async function createBatch(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { batchCode, name, courseId, trainerId, classroom, roomNumber, timing, startTime, endTime, cohortName } = req.body;

    const batch = await Batch.create({
      batchCode: batchCode.toUpperCase().trim(),
      name,
      course: courseId,
      trainer: trainerId,
      classroom: classroom || 'Lab 2, 2nd Floor',
      roomNumber: roomNumber || 'Room 204',
      timing: timing || '10:30 AM - 12:00 PM',
      startTime: startTime || '10:30 AM',
      endTime: endTime || '12:00 PM',
      cohortName: cohortName || 'Spring Semester • Offline Cohort',
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    });

    res.status(201).json({ success: true, message: 'Batch created successfully.', batch });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
