import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Batch, Enrollment } from '../models/Batch';
import { ClassSession } from '../models/ClassSession';
import { AttendanceSession, AttendanceRecord } from '../models/Attendance';
import { Assignment, AssignmentSubmission, StudyMaterial } from '../models/Learning';

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
        stats: {
          batchesCount: batches.length,
          assignmentsCount,
          pendingSubmissionsCount: pendingSubmissions.length,
          materialsCount,
        },
        kpis: {
          batchesCount: batches.length,
          assignmentsCount,
          pendingSubmissionsCount: pendingSubmissions.length,
          materialsCount,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
