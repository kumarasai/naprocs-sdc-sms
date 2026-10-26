import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { StudyMaterial } from '../models/Learning';
import { Announcement, Notification, InstituteSettings } from '../models/Communication';

export async function getMaterials(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { courseId } = req.query;
    const query: any = {};
    if (courseId) query.course = courseId;

    const materials = await StudyMaterial.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: materials.length, materials });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getAnnouncements(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const announcements = await Announcement.find({ isActive: true }).sort({
      priority: -1,
      createdAt: -1,
    });
    res.json({ success: true, count: announcements.length, announcements });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const notifications = await Notification.find({ recipient: req.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipient: req.userId,
      isRead: false,
    });

    res.json({ success: true, unreadCount, count: notifications.length, notifications });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function markNotificationsAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { notificationId } = req.body || {};
    if (notificationId) {
      await Notification.updateOne({ _id: notificationId, recipient: req.userId }, { isRead: true });
    } else {
      await Notification.updateMany({ recipient: req.userId, isRead: false }, { isRead: true });
    }
    res.json({ success: true, message: 'Notifications marked as read.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function clearNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    await Notification.deleteMany({ recipient: req.userId });
    res.json({ success: true, message: 'Notifications cleared.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getInstituteSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    let settings = await InstituteSettings.findOne();
    if (!settings) {
      settings = await InstituteSettings.create({});
    }
    res.json({ success: true, settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateInstituteSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    let settings = await InstituteSettings.findOne();
    if (!settings) {
      settings = new InstituteSettings(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    await settings.save();
    res.json({ success: true, message: 'Institute settings updated successfully.', settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createMaterial(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { title, description, courseId, moduleLabel, fileType, fileUrl, downloadUrl, fileSizeFormatted, category } = req.body;
    if (!title || !courseId) {
      res.status(400).json({ success: false, message: 'Title and courseId are required.' });
      return;
    }

    const material = await StudyMaterial.create({
      title,
      description: description || '',
      course: courseId,
      moduleLabel: moduleLabel || 'Course Document',
      fileType: fileType || 'PDF',
      fileUrl: fileUrl || downloadUrl || 'https://storage.googleapis.com/sdc-attendance/materials/sample.pdf',
      fileSizeFormatted: fileSizeFormatted || '2.4 MB',
      category: category || 'Lecture Notes',
      uploadedBy: req.userId,
    });

    res.status(201).json({ success: true, message: 'Study material uploaded successfully.', material });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteMaterial(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await StudyMaterial.findByIdAndDelete(id);
    res.json({ success: true, message: 'Study material deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createAnnouncement(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { title, description, priority, targetAudience, targetBatch, locationScope } = req.body;
    if (!title || !description) {
      res.status(400).json({ success: false, message: 'Title and description are required.' });
      return;
    }

    const announcement = await Announcement.create({
      title,
      description,
      priority: priority || 'NORMAL',
      targetAudience: targetAudience || 'ALL',
      targetBatch: targetBatch || undefined,
      locationScope: locationScope || 'Naprocs Campus',
      publishedBy: req.userId,
      publishDate: new Date(),
      isActive: true,
    });

    res.status(201).json({ success: true, message: 'Announcement broadcasted successfully.', announcement });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteAnnouncement(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await Announcement.findByIdAndDelete(id);
    res.json({ success: true, message: 'Announcement removed successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

