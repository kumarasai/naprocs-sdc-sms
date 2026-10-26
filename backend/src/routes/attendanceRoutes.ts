import { Router } from 'express';
import {
  openAttendanceSession,
  closeAttendanceSession,
  scanAttendance,
  getCurrentActiveSession,
  getSessionAttendanceList,
  getStudentAttendanceHistory,
  submitCorrectionRequest,
  reviewCorrectionRequest,
  checkInAttendance,
  checkOutAttendance,
  getLiveAttendanceStatus,
  getNetworkInfo,
  updateWifiSettings,
} from '../controllers/attendanceController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { attendanceScanLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(authenticateToken);

// 1-Click Campus Wi-Fi Attendance (Student)
router.post('/check-in', attendanceScanLimiter, requireRole(['STUDENT']), checkInAttendance);
router.post('/check-out', requireRole(['STUDENT']), checkOutAttendance);
router.get('/live-status', getLiveAttendanceStatus);

// Campus Wi-Fi Security & IP Info
router.get('/network-info', getNetworkInfo);
router.post('/wifi-settings', requireRole(['ADMIN']), updateWifiSettings);

// Trainer / Admin controls
router.post('/sessions/open', requireRole(['ADMIN', 'TRAINER']), openAttendanceSession);
router.post('/sessions/:sessionId/close', requireRole(['ADMIN', 'TRAINER']), closeAttendanceSession);
router.get('/sessions/:classSessionId/current', getCurrentActiveSession);
router.get('/sessions/:classSessionId/roster', requireRole(['ADMIN', 'TRAINER']), getSessionAttendanceList);

// Legacy Student Scanner (backward compatible)
router.post('/scan', attendanceScanLimiter, requireRole(['STUDENT']), scanAttendance);

// Attendance History & Calendar
router.get('/history', getStudentAttendanceHistory);

// Correction Workflow
router.post('/corrections', requireRole(['STUDENT']), submitCorrectionRequest);
router.patch('/corrections/:correctionId/review', requireRole(['ADMIN', 'TRAINER']), reviewCorrectionRequest);

export default router;

