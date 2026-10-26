import { Router } from 'express';
import authRoutes from './authRoutes';
import attendanceRoutes from './attendanceRoutes';
import studentRoutes from './studentRoutes';
import trainerRoutes from './trainerRoutes';
import adminRoutes from './adminRoutes';
import courseRoutes from './courseRoutes';
import assignmentRoutes from './assignmentRoutes';
import quizRoutes from './quizRoutes';
import reportRoutes from './reportRoutes';
import communicationRoutes from './communicationRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/students', studentRoutes);
router.use('/trainers', trainerRoutes);
router.use('/admin', adminRoutes);
router.use('/courses', courseRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/quizzes', quizRoutes);
router.use('/reports', reportRoutes);
router.use('/attendance/reports', reportRoutes);
router.use('/communication', communicationRoutes);

// System health check
router.get('/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Naprocs LMS & Genuine Attendance Core',
  });
});

export default router;
