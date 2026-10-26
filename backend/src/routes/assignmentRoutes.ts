import { Router } from 'express';
import {
  getAssignments,
  createAssignment,
  submitAssignment,
  gradeSubmission,
  deleteAssignment,
} from '../controllers/assignmentController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const router = Router();
router.use(authenticateToken);

router.get('/', getAssignments);
router.post('/', requireRole(['TRAINER', 'ADMIN']), createAssignment);
router.delete('/:assignmentId', requireRole(['TRAINER', 'ADMIN']), deleteAssignment);
router.post('/:assignmentId/submit', requireRole(['STUDENT']), submitAssignment);
router.patch('/submissions/:submissionId/grade', requireRole(['TRAINER', 'ADMIN']), gradeSubmission);

export default router;
