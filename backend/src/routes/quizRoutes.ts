import { Router } from 'express';
import { getQuizzes, getQuizQuestions, submitQuiz, createQuiz, deleteQuiz } from '../controllers/quizController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const router = Router();
router.use(authenticateToken);

router.get('/', getQuizzes);
router.post('/', requireRole(['TRAINER', 'ADMIN']), createQuiz);
router.delete('/:quizId', requireRole(['TRAINER', 'ADMIN']), deleteQuiz);
router.get('/:quizId/questions', getQuizQuestions);
router.post('/:quizId/submit', requireRole(['STUDENT']), submitQuiz);

export default router;
