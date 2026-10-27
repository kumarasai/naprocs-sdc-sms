import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Batch, Enrollment } from '../models/Batch';
import { ClassSession } from '../models/ClassSession';
import { AttendanceSession, AttendanceRecord } from '../models/Attendance';
import { Assignment, AssignmentSubmission, StudyMaterial, Quiz, QuizAttempt } from '../models/Learning';

export async function getTrainerDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const trainerId = req.userId;

    // Find assigned batches
    const batches = await Batch.find({ trainer: trainerId }).populate('course');
    const batchIds = batches.map((b) => b._id);

    // Today's / active class sessions
    const sessions = await ClassSession.find({
      trainer: trainerId,
    })
      .populate('batch')
      .populate('course')
      .sort({ sessionDate: -1 })
      .limit(10);

    // Submissions pending review
    const pendingSubmissions = await AssignmentSubmission.find({
      status: 'SUBMITTED',
    })
      .populate('assignment')
      .populate('student')
      .populate('user', 'name email avatar')
      .limit(10);

    const assignmentsCount = await Assignment.countDocuments({
      $or: [{ trainer: trainerId }, { batch: { $in: batchIds } }],
    });
    const materialsCount = await StudyMaterial.countDocuments({ uploadedBy: trainerId });

    // Quizzes created by trainer or for trainer's batches
    const trainerQuizzes = await Quiz.find({
      $or: [{ trainer: trainerId }, { batch: { $in: batchIds } }],
    }).select('_id title totalPoints passingScore batch');
    const trainerQuizIds = trainerQuizzes.map((q) => q._id);

    // Recent Quiz Completions with student score & details
    const recentQuizAttempts = await QuizAttempt.find({
      quiz: { $in: trainerQuizIds },
    })
      .populate('quiz', 'title totalPoints passingScore')
      .populate('user', 'name email avatar')
      .populate('student', 'studentId')
      .sort({ submittedAt: -1 })
      .limit(15);

    const recentQuizSubmissions = recentQuizAttempts.map((att: any) => ({
      id: att._id,
      quizId: att.quiz?._id,
      quizTitle: att.quiz?.title || 'Objective Assessment',
      maxPoints: att.quiz?.totalPoints || 20,
      studentName: att.user?.name || 'Student',
      studentEmail: att.user?.email || '',
      studentAvatar: '/default-avatar.svg',
      studentId: att.student?.studentId || 'SDC-STU',
      totalScore: att.totalScore,
      percentage: att.percentage,
      passed: att.passed,
      submittedAt: att.submittedAt,
    }));

    // Find all enrolled students across trainer's batches
    const enrollments = await Enrollment.find({
      batch: { $in: batchIds },
      status: 'ACTIVE',
    })
      .populate('student')
      .populate('user', 'name email avatar')
      .populate('batch', 'name');

    // All assignments for trainer's batches
    const trainerAssignments = await Assignment.find({
      $or: [{ trainer: trainerId }, { batch: { $in: batchIds } }],
    }).select('_id title totalPoints');
    const assignmentIds = trainerAssignments.map((a) => a._id);

    // Submissions and attempts for aggregation
    const allSubmissions = await AssignmentSubmission.find({
      assignment: { $in: assignmentIds },
    });

    const allAttempts = await QuizAttempt.find({
      quiz: { $in: trainerQuizIds },
    });

    const submissionsByStudent = new Map<string, any[]>();
    for (const sub of allSubmissions) {
      const sId = sub.student?.toString();
      if (sId) {
        if (!submissionsByStudent.has(sId)) submissionsByStudent.set(sId, []);
        submissionsByStudent.get(sId)!.push(sub);
      }
    }

    const attemptsByStudent = new Map<string, any[]>();
    for (const att of allAttempts) {
      const sId = att.student?.toString();
      if (sId) {
        if (!attemptsByStudent.has(sId)) attemptsByStudent.set(sId, []);
        attemptsByStudent.get(sId)!.push(att);
      }
    }

    const studentPerformance = enrollments.map((enr: any) => {
      const sId = enr.student?._id?.toString();
      const sSubs = sId ? submissionsByStudent.get(sId) || [] : [];
      const sAtts = sId ? attemptsByStudent.get(sId) || [] : [];

      // Assignment evaluations
      const gradedSubs = sSubs.filter((s: any) => s.status === 'GRADED' && s.score !== undefined);
      const assignmentAvgScore = gradedSubs.length > 0
        ? parseFloat((gradedSubs.reduce((acc: number, s: any) => acc + (s.score || 0), 0) / gradedSubs.length).toFixed(1))
        : 0;

      // Quiz evaluations
      const quizAvgScore = sAtts.length > 0
        ? parseFloat((sAtts.reduce((acc: number, a: any) => acc + (a.percentage || 0), 0) / sAtts.length).toFixed(1))
        : 0;

      // Overall Combined Performance Score (0 - 100%)
      // Combines practical assignment marks (out of 20 normalized to %) and quiz marks %
      let overallScore = 0;
      const normalizedAssignmentPct = Math.min(100, (assignmentAvgScore / 20) * 100);

      if (gradedSubs.length > 0 && sAtts.length > 0) {
        overallScore = parseFloat(((normalizedAssignmentPct * 0.5) + (quizAvgScore * 0.5)).toFixed(1));
      } else if (gradedSubs.length > 0) {
        overallScore = parseFloat(normalizedAssignmentPct.toFixed(1));
      } else if (sAtts.length > 0) {
        overallScore = quizAvgScore;
      }

      let performanceRating: 'Excellent' | 'Good' | 'Average' | 'Needs Improvement' = 'Needs Improvement';
      if (overallScore >= 85) performanceRating = 'Excellent';
      else if (overallScore >= 70) performanceRating = 'Good';
      else if (overallScore >= 50) performanceRating = 'Average';

      return {
        studentProfileId: enr.student?._id,
        studentId: enr.student?.studentId || 'SDC-STU',
        name: enr.user?.name || 'Student',
        email: enr.user?.email || '',
        avatar: '/default-avatar.svg',
        batchName: enr.batch?.name || 'Assigned Cohort',
        assignmentsSubmitted: sSubs.length,
        gradedAssignmentsCount: gradedSubs.length,
        assignmentAvgScore,
        quizzesTaken: sAtts.length,
        quizzesPassed: sAtts.filter((a: any) => a.passed).length,
        quizAvgScore,
        overallPerformanceScore: overallScore,
        performanceRating,
      };
    });

    // Sort students by performance score descending
    studentPerformance.sort((a, b) => b.overallPerformanceScore - a.overallPerformanceScore);

    res.json({
      success: true,
      data: {
        trainer: {
          id: req.user!._id,
          name: req.user!.name,
          email: req.user!.email,
          avatar: req.user!.avatar,
        },
        batches,
        sessions,
        pendingSubmissions,
        recentQuizSubmissions,
        studentPerformance,
        stats: {
          batchesCount: batches.length,
          assignmentsCount,
          pendingSubmissionsCount: pendingSubmissions.length,
          materialsCount,
          quizzesCount: trainerQuizzes.length,
          quizAttemptsCount: allAttempts.length,
        },
        kpis: {
          batchesCount: batches.length,
          assignmentsCount,
          pendingSubmissionsCount: pendingSubmissions.length,
          materialsCount,
          quizzesCount: trainerQuizzes.length,
          quizAttemptsCount: allAttempts.length,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
