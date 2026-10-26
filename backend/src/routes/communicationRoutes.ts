import { Router } from 'express';
import {
  getMaterials,
  createMaterial,
  deleteMaterial,
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  getNotifications,
  markNotificationsAsRead,
  clearNotifications,
  getInstituteSettings,
  updateInstituteSettings,
} from '../controllers/communicationController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const router = Router();
router.use(authenticateToken);

router.get('/materials', getMaterials);
router.post('/materials', requireRole(['TRAINER', 'ADMIN']), createMaterial);
router.delete('/materials/:id', requireRole(['TRAINER', 'ADMIN']), deleteMaterial);

router.get('/announcements', getAnnouncements);
router.post('/announcements', requireRole(['TRAINER', 'ADMIN']), createAnnouncement);
router.delete('/announcements/:id', requireRole(['TRAINER', 'ADMIN']), deleteAnnouncement);

router.get('/notifications', getNotifications);
router.patch('/notifications/read', markNotificationsAsRead);
router.delete('/notifications', clearNotifications);
router.get('/settings', getInstituteSettings);
router.put('/settings', requireRole(['ADMIN']), updateInstituteSettings);

export default router;
