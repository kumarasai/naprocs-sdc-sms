import { Router } from 'express';
import { login, getMe, logout, changePassword, firstTimeChangePassword } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/login', authLimiter, login);
router.get('/me', authenticateToken, getMe);
router.post('/logout', logout);
router.post('/first-time-password', authenticateToken, firstTimeChangePassword);
router.post('/change-password', authenticateToken, changePassword);

export default router;
