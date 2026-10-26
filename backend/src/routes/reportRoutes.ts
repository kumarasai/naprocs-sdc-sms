import { Router } from 'express';
import { getAttendanceReport, getAttendanceRegister, exportAttendanceExcel } from '../controllers/reportController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const router = Router();
router.use(authenticateToken);
router.use(requireRole(['ADMIN', 'TRAINER']));

router.get('/attendance', getAttendanceReport);
router.get('/attendance/export/excel', exportAttendanceExcel);
router.get('/register', getAttendanceRegister);
router.get('/export', exportAttendanceExcel);

export default router;
