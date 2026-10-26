import { Router } from 'express';
import {
  getAllCourses,
  getCourseDetails,
  createCourse,
  getAllBatches,
  getClassSessions,
  scheduleClassSession,
  deleteClassSession,
} from '../controllers/courseController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const router = Router();
router.use(authenticateToken);

router.get('/courses', getAllCourses);
router.get('/courses/:courseId', getCourseDetails);
router.post('/courses', requireRole(['ADMIN']), createCourse);

router.get('/batches', getAllBatches);

router.get('/classes', getClassSessions);
router.post('/classes', requireRole(['TRAINER', 'ADMIN']), scheduleClassSession);
router.delete('/classes/:sessionId', requireRole(['TRAINER', 'ADMIN']), deleteClassSession);

export default router;
