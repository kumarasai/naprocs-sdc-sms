import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Course, CourseModule, Lesson } from '../models/Course';
import { Batch } from '../models/Batch';
import { ClassSession } from '../models/ClassSession';

export async function getAllCourses(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const courses = await Course.find()
      .populate({
        path: 'modules',
        populate: { path: 'lessons' },
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: courses.length, courses });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getCourseDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).populate({
      path: 'modules',
      populate: { path: 'lessons' },
    });

    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found.' });
      return;
    }

    res.json({ success: true, course });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createCourse(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { courseCode, title, description, durationWeeks, level } = req.body;
    const course = await Course.create({
      courseCode: courseCode.toUpperCase().trim(),
      title,
      description,
      durationWeeks: durationWeeks || 12,
      level: level || 'COMPREHENSIVE',
      status: 'ACTIVE',
    });
    res.status(201).json({ success: true, message: 'Course created successfully.', course });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getAllBatches(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const batches = await Batch.find()
      .populate('course')
      .populate('trainer', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: batches.length, batches });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getClassSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { batchId } = req.query;
    const query: any = {};
    if (batchId) query.batch = batchId;

    const sessions = await ClassSession.find(query)
      .populate('batch')
      .populate('course')
      .populate('trainer', 'name email avatar')
      .sort({ sessionDate: 1 });

    res.json({ success: true, count: sessions.length, sessions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function scheduleClassSession(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { batchId, courseId, topicTitle, moduleLabel, description, sessionDate, startTime, endTime, classroom, roomNumber } = req.body;

    const sessionCode = `SESS-${Date.now().toString().slice(-6)}`;
    const session = await ClassSession.create({
      sessionCode,
      batch: batchId,
      course: courseId,
      trainer: req.userId,
      topicTitle,
      moduleLabel: moduleLabel || 'Upcoming Curriculum Session',
      description: description || 'Tomorrow\'s class plan & syllabus objectives.',
      sessionDate: sessionDate ? new Date(sessionDate) : new Date(Date.now() + 24 * 60 * 60 * 1000),
      startTime: startTime || '10:30 AM',
      endTime: endTime || '12:00 PM',
      classroom: classroom || 'Lab 2, 2nd Floor',
      roomNumber: roomNumber || 'Room 204',
      status: 'SCHEDULED',
    });

    res.status(201).json({ success: true, message: 'Class session scheduled and tomorrow plan published.', session });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteClassSession(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;
    await ClassSession.findByIdAndDelete(sessionId);
    res.json({ success: true, message: 'Class session removed successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
