import { Router } from 'express';
import { getTrainerDashboard } from '../controllers/trainerController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const router = Router();
router.use(authenticateToken);
router.use(requireRole(['TRAINER', 'ADMIN']));

router.get('/dashboard', getTrainerDashboard);

export default router;
