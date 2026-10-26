import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Assignment, AssignmentSubmission } from '../models/Learning';
import { StudentProfile } from '../models/Profiles';
import { Enrollment } from '../models/Batch';
import { User } from '../models/User';
import { Notification, Announcement } from '../models/Communication';
import { getIO } from '../sockets/attendanceSocket';

export async function getAssignments(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { batchId } = req.query;
    const query: any = {};
    if (batchId) query.batch = batchId;

    const assignments = await Assignment.find(query).sort({ dueDate: 1 });

    let userSubmissions: any[] = [];
    if (req.userRole === 'STUDENT') {
      const student = await StudentProfile.findOne({ user: req.userId });
      if (student) {
        userSubmissions = await AssignmentSubmission.find({ student: student._id });
      }
    }

    const subMap = new Map(userSubmissions.map((s) => [s.assignment.toString(), s]));

    const result = assignments.map((a) => {
      const sub = subMap.get(a._id.toString());
      return {
        id: a._id,
        title: a.title,
        description: a.description,
        moduleLabel: a.moduleLabel,
        dueDate: a.dueDate,
        totalPoints: a.totalPoints,
        instructions: a.instructions,
        githubTemplateUrl: a.githubTemplateUrl,
        submission: sub
          ? {
              id: sub._id,
              githubRepoUrl: sub.githubRepoUrl,
              liveDemoUrl: sub.liveDemoUrl,
              status: sub.status,
              score: sub.score,
              mentorFeedback: sub.mentorFeedback,
              submittedAt: sub.submittedAt,
            }
          : null,
      };
    });

    res.json({ success: true, count: result.length, assignments: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createAssignment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { title, description, courseId, batchId, moduleLabel, dueDate, totalPoints, instructions, githubTemplateUrl } = req.body;

    if (!title || !description || !batchId) {
      res.status(400).json({ success: false, message: 'Title, description, and batch are required.' });
      return;
    }

    const assignment = await Assignment.create({
      title,
      description,
      course: courseId,
      batch: batchId,
      trainer: req.userId,
      moduleLabel: moduleLabel || 'Module 3: Core HTTP & URL routing',
      dueDate: dueDate || new Date(Date.now() + 24 * 60 * 60 * 1000),
      totalPoints: totalPoints || 20,
      instructions,
      githubTemplateUrl,
      status: 'PUBLISHED',
    });

    // 1. Gather student recipient user IDs
    const enrollments = await Enrollment.find({ batch: batchId });
    let studentUserIds = enrollments.map((e) => e.user).filter(Boolean);
    if (studentUserIds.length === 0) {
      const allStudents = await User.find({ role: 'STUDENT' }).select('_id');
      studentUserIds = allStudents.map((s) => s._id);
    }

    const formattedDueDate = new Date(assignment.dueDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    // 2. Create in-app Notification records for all cohort students
    const notificationsToInsert = studentUserIds.map((userId) => ({
      recipient: userId,
      title: `New Assignment: ${assignment.title}`,
      message: `Trainer assigned "${assignment.title}" (${assignment.moduleLabel || 'Lab Exercise'}). Due: ${formattedDueDate}. Total Points: ${assignment.totalPoints}.`,
      type: 'ASSIGNMENT' as const,
      link: '/assignments',
      metadata: {
        assignmentId: assignment._id,
        batchId: assignment.batch,
        dueDate: assignment.dueDate,
        totalPoints: assignment.totalPoints,
      },
      isRead: false,
    }));

    if (notificationsToInsert.length > 0) {
      await Notification.insertMany(notificationsToInsert);
    }

    // 3. Create an Announcement so it is reflected in campus notices
    await Announcement.create({
      title: `New Practical Assignment: ${assignment.title}`,
      description: `Trainer published practical assignment: "${assignment.title}".\n\nModule: ${assignment.moduleLabel || 'Lab Exercise'}\nDue Date: ${formattedDueDate}\nTotal Points: ${assignment.totalPoints}\n\n${assignment.description}`,
      priority: 'HIGH',
      targetAudience: 'BATCH',
      targetBatch: assignment.batch,
      locationScope: assignment.moduleLabel || 'Batch Assignment',
      publishedBy: req.userId,
      publishDate: new Date(),
      isActive: true,
    });

    // 4. Emit real-time Socket.IO events for live notification bar update
    try {
      const io = getIO();
      // Broadcast to all connected sockets
      io.emit('new_assignment', {
        id: assignment._id,
        title: assignment.title,
        dueDate: assignment.dueDate,
        moduleLabel: assignment.moduleLabel,
      });

      // Send to individual student user rooms
      for (const uid of studentUserIds) {
        io.to(`user:${uid.toString()}`).emit('notification_received', {
          title: `New Assignment: ${assignment.title}`,
          message: `Trainer assigned "${assignment.title}". Due: ${formattedDueDate}.`,
          type: 'ASSIGNMENT',
          link: '/assignments',
          createdAt: new Date(),
        });
      }

      // Trigger notification count refresh across all clients
      io.emit('announcement_created', {
        title: `New Assignment: ${assignment.title}`,
        createdAt: new Date(),
      });
    } catch (socketErr) {
      console.warn('[AssignmentController] Socket emit notification warning:', socketErr);
    }

    res.status(201).json({ success: true, message: 'Assignment published for cohort.', assignment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function submitAssignment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { assignmentId } = req.params;
    const { githubRepoUrl, liveDemoUrl, notes } = req.body;

    if (!githubRepoUrl) {
      res.status(400).json({ success: false, message: 'GitHub repository URL is required.' });
      return;
    }

    const student = await StudentProfile.findOne({ user: req.userId });
    if (!student) {
      res.status(404).json({ success: false, message: 'Student profile not found.' });
      return;
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      res.status(404).json({ success: false, message: 'Assignment not found.' });
      return;
    }

    let submission = await AssignmentSubmission.findOne({
      assignment: assignment._id,
      student: student._id,
    });

    if (submission) {
      submission.githubRepoUrl = githubRepoUrl;
      submission.liveDemoUrl = liveDemoUrl;
      submission.notes = notes;
      submission.submittedAt = new Date();
      submission.status = 'SUBMITTED';
      await submission.save();
    } else {
      submission = await AssignmentSubmission.create({
        assignment: assignment._id,
        student: student._id,
        user: req.userId,
        githubRepoUrl,
        liveDemoUrl,
        notes,
        submittedAt: new Date(),
        status: 'SUBMITTED',
      });
    }

    res.json({
      success: true,
      message: 'Assignment submitted successfully for mentor review.',
      submission,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function gradeSubmission(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { submissionId } = req.params;
    const { score, mentorFeedback } = req.body;

    const submission = await AssignmentSubmission.findById(submissionId);
    if (!submission) {
      res.status(404).json({ success: false, message: 'Submission not found.' });
      return;
    }

    submission.score = score;
    submission.mentorFeedback = mentorFeedback;
    submission.status = 'GRADED';
    submission.gradedBy = req.userId as any;
    submission.gradedAt = new Date();
    await submission.save();

    res.json({ success: true, message: 'Submission graded successfully.', submission });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteAssignment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { assignmentId } = req.params;
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      res.status(404).json({ success: false, message: 'Assignment not found.' });
      return;
    }
    await Assignment.findByIdAndDelete(assignmentId);
    await AssignmentSubmission.deleteMany({ assignment: assignmentId });
    res.json({ success: true, message: 'Assignment deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
