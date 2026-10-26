import { Router } from 'express';
import { getStudentDashboard } from '../controllers/studentController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const router = Router();
router.use(authenticateToken);
router.use(requireRole(['STUDENT', 'ADMIN']));

router.get('/dashboard', getStudentDashboard);

export default router;
