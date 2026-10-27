import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { StudentProfile } from '../models/Profiles';
import { Enrollment, Batch } from '../models/Batch';
import { ClassSession } from '../models/ClassSession';
import { AttendanceRecord, AttendanceSession } from '../models/Attendance';
import { Assignment, AssignmentSubmission, Quiz, QuizAttempt, StudyMaterial } from '../models/Learning';
import { Announcement } from '../models/Communication';

export async function getStudentDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    const student = await StudentProfile.findOne({ user: userId });

    if (!student) {
      res.status(404).json({ success: false, message: 'Student profile not found.' });
      return;
    }

    // Active enrollment
    const enrollment = await Enrollment.findOne({ student: student._id, status: 'ACTIVE' })
      .populate('batch')
      .populate('course');

    const batch = enrollment?.batch as any;

    // Featured Live or Upcoming Class Session
    let activeClass = await ClassSession.findOne({
      batch: batch?._id,
      status: 'LIVE',
    })
      .populate('trainer', 'name avatar')
      .populate('course');

    if (!activeClass) {
      // Find today's scheduled class or next scheduled class
      activeClass = await ClassSession.findOne({
        batch: batch?._id,
        status: { $in: ['SCHEDULED', 'LIVE'] },
      })
        .populate('trainer', 'name avatar')
        .populate('course')
        .sort({ sessionDate: 1 });
    }

    // Check if live attendance session is active for this class
    let activeAttendanceSession = null;
    let studentAlreadyMarkedToday = false;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (activeClass) {
      activeAttendanceSession = await AttendanceSession.findOne({
        classSession: activeClass._id,
        status: 'ACTIVE',
      });

      const existingRecord = await AttendanceRecord.findOne({
        student: student._id,
        $or: [
          { classSession: activeClass._id },
          { attendanceDate: { $gte: startOfDay, $lte: endOfDay }, checkInTime: { $exists: true, $ne: null } },
        ],
      });
      studentAlreadyMarkedToday = !!existingRecord;
    }

    // Weekly Timeline: get records for the current cohort week
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
    endOfWeek.setHours(23, 59, 59, 999);

    const weeklyRecords = await AttendanceRecord.find({
      student: student._id,
      attendanceDate: { $gte: startOfWeek, $lte: endOfWeek },
    }).populate('classSession');

    // Pending Assignments & Graded Labs
    const assignments = await Assignment.find({
      batch: batch?._id,
    }).sort({ dueDate: 1 }).limit(5);

    const submissions = await AssignmentSubmission.find({
      student: student._id,
    });

    const submissionsMap = new Map(submissions.map((s) => [s.assignment.toString(), s]));

    const formattedAssignments = assignments.map((a) => {
      const sub = submissionsMap.get(a._id.toString());
      return {
        id: a._id,
        title: a.title,
        moduleLabel: a.moduleLabel,
        dueDate: a.dueDate,
        totalPoints: a.totalPoints,
        isSubmitted: !!sub,
        submissionStatus: sub ? sub.status : 'PENDING',
        score: sub?.score,
        mentorFeedback: sub?.mentorFeedback,
        githubRepoUrl: sub?.githubRepoUrl,
      };
    });

    // Upcoming Tests & Quizzes
    const upcomingQuizzes = await Quiz.find({
      batch: batch?._id,
      isPublished: true,
    })
      .sort({ scheduledAt: 1 })
      .limit(5);

    // Completed Quiz Attempts & Performance
    const studentQuizAttempts = await QuizAttempt.find({
      $or: [{ student: student._id }, { user: userId }],
    })
      .populate('quiz', 'title durationMinutes totalPoints passingScore')
      .sort({ submittedAt: -1 });

    const formattedQuizAttempts = studentQuizAttempts.map((qa: any) => ({
      id: qa._id,
      quizId: qa.quiz?._id,
      quizTitle: qa.quiz?.title || 'Objective Assessment',
      totalScore: qa.totalScore,
      maxPoints: qa.quiz?.totalPoints || qa.totalScore || 20,
      percentage: qa.percentage,
      passed: qa.passed || qa.percentage >= 60,
      submittedAt: qa.submittedAt,
    }));

    const quizzesTaken = formattedQuizAttempts.length;
    const quizzesPassed = formattedQuizAttempts.filter((q) => q.passed).length;
    const avgQuizScore = quizzesTaken > 0
      ? parseFloat((formattedQuizAttempts.reduce((acc, q) => acc + q.percentage, 0) / quizzesTaken).toFixed(1))
      : 0;

    // Course Study Materials
    const materials = await StudyMaterial.find({
      course: enrollment?.course?._id,
    }).limit(5);

    // Institute Notices / Announcements
    const notices = await Announcement.find({
      isActive: true,
    })
      .sort({ priority: -1, createdAt: -1 })
      .limit(4);

    // Compute real dynamic attendance metrics from actual DB records
    const conductedClassesCount = batch?._id
      ? await ClassSession.countDocuments({
          batch: batch._id,
          status: { $in: ['LIVE', 'COMPLETED'] },
        })
      : 0;

    const studentRecords = await AttendanceRecord.find({
      student: student._id,
    });
    const classesAttended = studentRecords.filter(
      (r: any) => r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'HALF_DAY'
    ).length;

    const computedAttendanceRate = conductedClassesCount > 0
      ? parseFloat(((classesAttended / conductedClassesCount) * 100).toFixed(1))
      : (classesAttended > 0 ? 100 : 0);

    const courseObj = enrollment?.course as any;
    let computedCurriculumVelocity = 0;
    if (courseObj?.modules && Array.isArray(courseObj.modules) && courseObj.modules.length > 0) {
      const completedCount = courseObj.modules.filter((m: any) => m.isCompleted).length || 0;
      computedCurriculumVelocity = Math.round((completedCount / courseObj.modules.length) * 100);
    }

    res.json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: req.user!.name,
          email: req.user!.email,
          studentId: student.studentId,
          rfidTag: student.rfidTag || '--',
          avatar: req.user!.avatar,
          attendanceHealth: computedAttendanceRate,
          storageUsedFormatted: student.storageUsedBytes > 0
            ? `${(student.storageUsedBytes / (1024 * 1024)).toFixed(1)} MB`
            : '0.0 MB',
        },
        batch: {
          id: batch?._id,
          name: batch?.name || 'Unassigned Cohort',
          code: batch?.batchCode || '',
          timing: batch?.timing || '',
          classroom: batch?.classroom || '',
          roomNumber: batch?.roomNumber || '',
          cohortName: batch?.cohortName || batch?.name || 'Unassigned Cohort',
        },
        kpis: {
          attendanceRate: computedAttendanceRate,
          classesAttended,
          totalEligibleClasses: conductedClassesCount,
          assignmentsSolved: submissions.filter((s) => s.status === 'GRADED' || s.status === 'SUBMITTED').length,
          totalAssignments: assignments.length,
          pendingGrading: submissions.filter((s) => s.status === 'SUBMITTED').length,
          curriculumVelocity: computedCurriculumVelocity,
          currentModuleLabel: (enrollment?.course as any)?.title || 'No Course Enrolled',
        },
        featuredClass: activeClass
          ? {
              id: activeClass._id,
              topicTitle: activeClass.topicTitle,
              moduleLabel: activeClass.moduleLabel,
              description: activeClass.description,
              classroom: activeClass.classroom,
              roomNumber: activeClass.roomNumber,
              startTime: activeClass.startTime,
              endTime: activeClass.endTime,
              status: activeClass.status,
              trainer: {
                name: (activeClass.trainer as any)?.name || 'Designated Trainer',
                designation: (activeClass.trainer as any)?.designation || 'Faculty Mentor',
                mentorRole: 'Naprocs Faculty',
                avatar: (activeClass.trainer as any)?.avatar,
              },
              isAttendanceOpen: !!activeAttendanceSession,
              attendanceSessionId: activeAttendanceSession?._id,
              studentAlreadyMarked: studentAlreadyMarkedToday,
            }
          : null,
        weeklyRecords,
        assignments: formattedAssignments,
        quizzes: upcomingQuizzes,
        quizAttempts: formattedQuizAttempts,
        quizStats: {
          quizzesTaken,
          quizzesPassed,
          avgQuizScore,
          passRate: quizzesTaken > 0 ? parseFloat(((quizzesPassed / quizzesTaken) * 100).toFixed(1)) : 0,
        },
        materials,
        notices,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
