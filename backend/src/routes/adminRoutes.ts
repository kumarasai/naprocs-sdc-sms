import { Router } from 'express';
import {
  getAdminDashboard,
  registerStudent,
  registerTrainer,
  getAllStudents,
  getAllTrainers,
  updateStudentStatus,
  updateTrainerStatus,
  deleteStudent,
  deleteTrainer,
  createBatch,
} from '../controllers/adminController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const router = Router();
router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

router.get('/dashboard', getAdminDashboard);
router.post('/students', registerStudent);
router.get('/students', getAllStudents);
router.patch('/students/:studentId/status', updateStudentStatus);
router.delete('/students/:studentId', deleteStudent);

router.post('/trainers', registerTrainer);
router.get('/trainers', getAllTrainers);
router.patch('/trainers/:trainerId/status', updateTrainerStatus);
router.delete('/trainers/:trainerId', deleteTrainer);

router.post('/batches', createBatch);

export default router;
