import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  AttendanceSession,
  AttendanceRecord,
  AttendanceAuditLog,
  AttendanceCorrectionRequest,
  AttendanceStatus,
} from '../models/Attendance';
import { ClassSession } from '../models/ClassSession';
import { Batch, Enrollment } from '../models/Batch';
import { StudentProfile } from '../models/Profiles';
import { InstituteSettings } from '../models/Communication';
import { AttendanceTokenService } from '../services/attendanceTokenService';
import { startRollingQR, stopRollingQR, getIO } from '../sockets/attendanceSocket';
import { config } from '../config/env';

export async function openAttendanceSession(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { classSessionId } = req.body;
    if (!classSessionId) {
      res.status(400).json({ success: false, message: 'Class session ID is required.' });
      return;
    }

    const classSession = await ClassSession.findById(classSessionId);
    if (!classSession) {
      res.status(404).json({ success: false, message: 'Class session not found.' });
      return;
    }

    // Role check: Only assigned trainer or Admin can open attendance
    if (
      req.userRole === 'TRAINER' &&
      classSession.trainer.toString() !== req.userId
    ) {
      res.status(403).json({ success: false, message: 'You are not the designated trainer for this class session.' });
      return;
    }

    // Count eligible students in the batch
    const eligibleCount = await Enrollment.countDocuments({
      batch: classSession.batch,
      status: 'ACTIVE',
    });

    // Check if an existing session exists
    let attendanceSession = await AttendanceSession.findOne({ classSession: classSession._id });

    if (!attendanceSession) {
      attendanceSession = new AttendanceSession({
        classSession: classSession._id,
        batch: classSession.batch,
        trainer: req.userId,
        status: 'ACTIVE',
        openedAt: new Date(),
        totalEligible: eligibleCount,
      });
    } else {
      attendanceSession.status = 'ACTIVE';
      attendanceSession.closedAt = undefined;
      attendanceSession.isFinalized = false;
      attendanceSession.totalEligible = eligibleCount;
    }

    await attendanceSession.save();

    classSession.status = 'LIVE';
    classSession.activeAttendanceSession = attendanceSession._id;
    if (!classSession.startedAt) {
      classSession.startedAt = new Date();
    }
    await classSession.save();

    // Start generating & rolling QR codes every 30 seconds
    startRollingQR(
      attendanceSession._id.toString(),
      classSession._id.toString(),
      classSession.batch.toString()
    );

    // Initial token generation
    const initialToken = AttendanceTokenService.generateToken(
      attendanceSession._id.toString(),
      classSession._id.toString(),
      classSession.batch.toString(),
      1
    );

    attendanceSession.currentRollingToken = initialToken.token;
    attendanceSession.tokenExpiresAt = initialToken.expiresAt;
    attendanceSession.tokenSequence = 1;
    await attendanceSession.save();

    try {
      getIO().to(`session:${classSession._id}`).emit('session_opened', {
        attendanceSessionId: attendanceSession._id,
        classSessionId: classSession._id,
        status: 'ACTIVE',
        token: initialToken.token,
        expiresAt: initialToken.expiresAt,
      });
    } catch (e) {
      // socket io might not have active clients yet
    }

    res.json({
      success: true,
      message: 'Live attendance session opened successfully. QR code rolling active.',
      session: attendanceSession,
      currentRollingToken: initialToken.token,
      expiresAt: initialToken.expiresAt,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function closeAttendanceSession(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;
    const attendanceSession = await AttendanceSession.findById(sessionId);

    if (!attendanceSession) {
      res.status(404).json({ success: false, message: 'Attendance session not found.' });
      return;
    }

    const classSession = await ClassSession.findById(attendanceSession.classSession);
    if (!classSession) {
      res.status(404).json({ success: false, message: 'Associated class session not found.' });
      return;
    }

    // Stop rolling QR
    stopRollingQR(attendanceSession._id.toString());

    attendanceSession.status = 'CLOSED';
    attendanceSession.closedAt = new Date();
    attendanceSession.isFinalized = true;

    // Finalize: Find all active enrolled students in this batch who have NO attendance record
    const enrollments = await Enrollment.find({
      batch: attendanceSession.batch,
      status: 'ACTIVE',
    }).populate('student');

    const existingRecords = await AttendanceRecord.find({
      classSession: classSession._id,
    });
    const markedStudentIds = new Set(existingRecords.map((r) => r.student.toString()));

    let absentCount = 0;
    for (const enrollment of enrollments) {
      if (!markedStudentIds.has(enrollment.student._id.toString())) {
        const absentRecord = await AttendanceRecord.create({
          attendanceSession: attendanceSession._id,
          classSession: classSession._id,
          student: enrollment.student._id,
          user: (enrollment.student as any).user,
          batch: attendanceSession.batch,
          course: classSession.course,
          attendanceDate: classSession.sessionDate,
          status: 'ABSENT',
          verificationMethod: 'SYSTEM_AUTO_ABSENT',
          markedBy: req.userId,
        });

        await AttendanceAuditLog.create({
          attendanceRecord: absentRecord._id,
          classSession: classSession._id,
          performedBy: req.userId,
          action: 'FINALIZED',
          previousStatus: 'UNRECORDED',
          newStatus: 'ABSENT',
          reason: 'Session closed by trainer. Student was not checked in via valid QR.',
          timestamp: new Date(),
        });

        absentCount++;
      }
    }

    attendanceSession.totalAbsent = absentCount;
    await attendanceSession.save();

    classSession.status = 'COMPLETED';
    classSession.endedAt = new Date();
    await classSession.save();

    // Recompute batch attendance percentages for all enrolled students
    for (const enrollment of enrollments) {
      const records = await AttendanceRecord.find({
        student: enrollment.student._id,
        batch: enrollment.batch,
      });

      const totalConducted = records.length;
      const attended = records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
      const late = records.filter((r) => r.status === 'LATE').length;
      const absent = records.filter((r) => r.status === 'ABSENT').length;

      enrollment.totalEligibleClasses = totalConducted;
      enrollment.classesAttended = attended;
      enrollment.classesLate = late;
      enrollment.classesAbsent = absent;
      enrollment.attendancePercentage = totalConducted > 0 ? parseFloat(((attended / totalConducted) * 100).toFixed(1)) : 100;
      await enrollment.save();

      // Update student profile health
      await StudentProfile.findByIdAndUpdate(enrollment.student._id, {
        attendanceHealthPercentage: enrollment.attendancePercentage,
      });
    }

    try {
      getIO().to(`session:${classSession._id}`).emit('session_closed', {
        attendanceSessionId: attendanceSession._id,
        classSessionId: classSession._id,
        status: 'CLOSED',
        isFinalized: true,
        totalPresent: attendanceSession.totalPresent,
        totalLate: attendanceSession.totalLate,
        totalAbsent: attendanceSession.totalAbsent,
      });
    } catch (e) {
      // ignore
    }

    res.json({
      success: true,
      message: 'Attendance session successfully closed and finalized. Absent students marked.',
      session: attendanceSession,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function scanAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { token, wifiBssid, userLocation } = req.body;

    if (!token) {
      res.status(400).json({ success: false, message: 'Attendance QR token is required.' });
      return;
    }

    // Student identity check
    if (req.userRole !== 'STUDENT') {
      res.status(403).json({ success: false, message: 'Only authenticated students can mark attendance via QR scan.' });
      return;
    }

    const studentProfile = await StudentProfile.findOne({ user: req.userId });
    if (!studentProfile) {
      res.status(404).json({ success: false, message: 'Student profile not found.' });
      return;
    }

    // Step 1: Cryptographic signature & expiry verification
    const verification = AttendanceTokenService.verifyToken(token);
    if (!verification.isValid || !verification.payload) {
      res.status(400).json({
        success: false,
        message: verification.reason || 'Invalid or expired attendance QR token.',
      });
      return;
    }

    const { attendanceSessionId, classSessionId, batchId } = verification.payload;

    // Step 2: Validate active session in database
    const attendanceSession = await AttendanceSession.findById(attendanceSessionId);
    if (!attendanceSession || attendanceSession.status !== 'ACTIVE') {
      res.status(400).json({
        success: false,
        message: 'This attendance session is no longer active or has been closed by the trainer.',
      });
      return;
    }

    const classSession = await ClassSession.findById(classSessionId);
    if (!classSession) {
      res.status(404).json({ success: false, message: 'Associated class session not found.' });
      return;
    }

    // Step 3: Check student enrollment in the batch
    const enrollment = await Enrollment.findOne({
      student: studentProfile._id,
      batch: batchId,
      status: 'ACTIVE',
    });

    if (!enrollment) {
      res.status(403).json({
        success: false,
        message: 'You are not enrolled in this batch and cannot mark attendance.',
      });
      return;
    }

    // Step 4: Check duplicate attendance
    const existingRecord = await AttendanceRecord.findOne({
      student: studentProfile._id,
      classSession: classSessionId,
    });

    if (existingRecord) {
      res.status(409).json({
        success: false,
        message: `Attendance is already marked as ${existingRecord.status} for this session at ${existingRecord.checkInTime ? new Date(existingRecord.checkInTime).toLocaleTimeString() : 'earlier'}.`,
        record: existingRecord,
      });
      return;
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Also verify student hasn't already checked out today
    const completedRecord = await AttendanceRecord.findOne({
      student: studentProfile._id,
      attendanceDate: { $gte: startOfDay, $lte: endOfDay },
      checkInTime: { $exists: true, $ne: null },
      checkOutTime: { $exists: true, $ne: null },
    });

    if (completedRecord) {
      res.status(409).json({
        success: false,
        message: 'You have already checked in and checked out for today. Attendance cannot be recorded again.',
        record: completedRecord,
      });
      return;
    }

    // Step 5: Check-in timestamp and threshold (Late vs Present)
    let status: AttendanceStatus = 'PRESENT';

    // Parse class session start time (e.g. 10:30 AM)
    const lateThresholdMinutes = config.attendance.lateThresholdMinutes; // 15 mins
    if (classSession.startedAt) {
      const diffMinutes = (now.getTime() - new Date(classSession.startedAt).getTime()) / (1000 * 60);
      if (diffMinutes > lateThresholdMinutes) {
        status = 'LATE';
      }
    }

    // Step 6: Atomic Database insertion
    const record = await AttendanceRecord.create({
      attendanceSession: attendanceSession._id,
      classSession: classSession._id,
      student: studentProfile._id,
      user: req.userId,
      batch: batchId,
      course: classSession.course,
      attendanceDate: classSession.sessionDate,
      checkInTime: now,
      status,
      verificationMethod: 'QR_SCAN',
      tokenUsed: token.slice(-12), // Store only suffix hash for audit
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      wifiSignalMatched: true,
      flaggedSuspicious: false,
      markedBy: req.userId,
    });

    // Step 7: Update Session Counts
    if (status === 'PRESENT') {
      attendanceSession.totalPresent += 1;
    } else {
      attendanceSession.totalLate += 1;
    }
    await attendanceSession.save();

    // Step 8: Create Audit Log
    await AttendanceAuditLog.create({
      attendanceRecord: record._id,
      classSession: classSession._id,
      performedBy: req.userId,
      action: 'CREATED',
      newStatus: status,
      reason: 'QR scanned and cryptographically validated via student camera portal.',
      metadata: {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        tokenSequence: verification.payload.sequence,
      },
      timestamp: now,
    });

    // Step 9: Real-time broadcast to Trainer dashboard
    try {
      getIO().to(`session:${classSession._id}`).emit('student_attendance_marked', {
        recordId: record._id,
        studentId: studentProfile.studentId,
        studentName: req.user!.name,
        avatar: req.user!.avatar,
        status: record.status,
        checkInTime: record.checkInTime,
        totalPresent: attendanceSession.totalPresent,
        totalLate: attendanceSession.totalLate,
      });
    } catch (e) {
      // ignore
    }

    res.status(201).json({
      success: true,
      message: `Attendance marked successfully as ${status}!`,
      record: {
        id: record._id,
        status: record.status,
        checkInTime: record.checkInTime,
        batchName: (enrollment as any).batchName || 'Node.js Batch 01',
      },
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ success: false, message: 'Attendance already recorded for this session.' });
      return;
    }
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getCurrentActiveSession(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { classSessionId } = req.params;

    const classSession = await ClassSession.findById(classSessionId)
      .populate('batch')
      .populate('course')
      .populate('trainer', 'name email avatar');

    if (!classSession) {
      res.status(404).json({ success: false, message: 'Class session not found.' });
      return;
    }

    const attendanceSession = await AttendanceSession.findOne({ classSession: classSessionId });

    res.json({
      success: true,
      classSession,
      attendanceSession,
      isSessionActive: attendanceSession?.status === 'ACTIVE',
      currentRollingToken: attendanceSession?.currentRollingToken || null,
      tokenExpiresAt: attendanceSession?.tokenExpiresAt || null,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getSessionAttendanceList(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { classSessionId } = req.params;

    const records = await AttendanceRecord.find({ classSession: classSessionId })
      .populate('student')
      .populate('user', 'name email avatar phone')
      .sort({ checkInTime: -1 });

    const classSession = await ClassSession.findById(classSessionId);
    const totalEligible = classSession
      ? await Enrollment.countDocuments({ batch: classSession.batch, status: 'ACTIVE' })
      : 0;

    const presentCount = records.filter((r) => r.status === 'PRESENT').length;
    const lateCount = records.filter((r) => r.status === 'LATE').length;
    const absentCount = records.filter((r) => r.status === 'ABSENT').length;

    res.json({
      success: true,
      records,
      counts: {
        totalEligible,
        presentCount,
        lateCount,
        absentCount,
        pendingCount: Math.max(0, totalEligible - presentCount - lateCount - absentCount),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getStudentAttendanceHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    let studentId = req.query.studentId as string;

    if (req.userRole === 'STUDENT') {
      const studentProfile = await StudentProfile.findOne({ user: req.userId });
      if (!studentProfile) {
        res.status(404).json({ success: false, message: 'Student profile not found.' });
        return;
      }
      studentId = studentProfile._id.toString();
    }

    const records = await AttendanceRecord.find({ student: studentId })
      .populate('classSession')
      .populate('course', 'title courseCode')
      .populate('batch', 'name batchCode')
      .sort({ attendanceDate: -1 });

    const totalConducted = records.length;
    const present = records.filter((r) => r.status === 'PRESENT').length;
    const late = records.filter((r) => r.status === 'LATE').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const rate = totalConducted > 0 ? parseFloat((((present + late) / totalConducted) * 100).toFixed(1)) : 100;

    res.json({
      success: true,
      stats: {
        totalConducted,
        present,
        late,
        absent,
        attendanceRate: rate,
      },
      records,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function submitCorrectionRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { classSessionId, requestedStatus, reason, supportingDocUrl } = req.body;

    const studentProfile = await StudentProfile.findOne({ user: req.userId });
    if (!studentProfile) {
      res.status(404).json({ success: false, message: 'Student profile not found.' });
      return;
    }

    const existingRecord = await AttendanceRecord.findOne({
      student: studentProfile._id,
      classSession: classSessionId,
    });

    const correction = await AttendanceCorrectionRequest.create({
      student: studentProfile._id,
      user: req.userId,
      classSession: classSessionId,
      attendanceRecord: existingRecord?._id,
      requestedStatus: requestedStatus || 'PRESENT',
      reason,
      supportingDocUrl,
      status: 'PENDING',
    });

    res.status(201).json({
      success: true,
      message: 'Correction request submitted to trainer and institute admin for review.',
      correction,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function reviewCorrectionRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { correctionId } = req.params;
    const { action, reviewNote } = req.body; // action: 'APPROVED' | 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      res.status(400).json({ success: false, message: 'Action must be APPROVED or REJECTED.' });
      return;
    }

    const correction = await AttendanceCorrectionRequest.findById(correctionId);
    if (!correction) {
      res.status(404).json({ success: false, message: 'Correction request not found.' });
      return;
    }

    correction.status = action;
    correction.reviewedBy = req.userId as any;
    correction.reviewNote = reviewNote;
    correction.reviewedAt = new Date();
    await correction.save();

    if (action === 'APPROVED') {
      let record = await AttendanceRecord.findOne({
        student: correction.student,
        classSession: correction.classSession,
      });

      const prevStatus = record ? record.status : 'NONE';

      if (record) {
        record.status = correction.requestedStatus;
        record.verificationMethod = 'CORRECTION_APPROVED';
        record.modifiedBy = req.userId as any;
        record.modificationReason = reviewNote || 'Approved via formal correction request';
        await record.save();
      } else {
        const classSession = await ClassSession.findById(correction.classSession);
        record = await AttendanceRecord.create({
          classSession: correction.classSession,
          student: correction.student,
          user: correction.user,
          batch: classSession?.batch,
          course: classSession?.course,
          attendanceDate: classSession?.sessionDate || new Date(),
          status: correction.requestedStatus,
          verificationMethod: 'CORRECTION_APPROVED',
          markedBy: req.userId,
          modificationReason: reviewNote,
        });
      }

      await AttendanceAuditLog.create({
        attendanceRecord: record._id,
        classSession: correction.classSession,
        performedBy: req.userId,
        action: 'CORRECTION_APPROVED',
        previousStatus: prevStatus,
        newStatus: correction.requestedStatus,
        reason: reviewNote || 'Attendance correction approved by authorized staff.',
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      message: `Correction request has been ${action.toLowerCase()}.`,
      correction,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// ==========================================
// 1-CLICK CAMPUS WI-FI ATTENDANCE CONTROLLERS
// ==========================================

export function extractClientIp(req: AuthenticatedRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  let clientIp =
    (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') ||
    req.socket?.remoteAddress ||
    req.ip ||
    '';
  if (clientIp.startsWith('::ffff:')) {
    clientIp = clientIp.replace('::ffff:', '');
  }
  return clientIp;
}

export async function isCampusWifiAllowed(clientIp: string): Promise<{ allowed: boolean; settings: any }> {
  let settings = await InstituteSettings.findOne();
  if (!settings) {
    settings = await InstituteSettings.create({
      instituteName: 'Naprocs Skill Development Center',
      campusWifiEnabled: true,
      campusWifiSsid: 'Naprocs-Campus-5G',
      allowedWifiIps: ['127.0.0.1', '::1', 'localhost', '*'],
      minAttendanceHoursForPresent: 1,
    });
  }

  if (!settings.campusWifiEnabled) {
    return { allowed: true, settings };
  }

  const allowedList = (settings.allowedWifiIps || []).map((ip: string) => ip.trim());

  // Wildcard allows all networks (e.g. initial setup)
  if (allowedList.includes('*')) {
    return { allowed: true, settings };
  }

  // Exact IP, loopback, or subnet prefix match
  const matches = allowedList.some((allowedIp: string) => {
    if (!allowedIp) return false;
    if (allowedIp === clientIp) return true;
    if (allowedIp.endsWith('.*') && clientIp.startsWith(allowedIp.replace('.*', ''))) return true;
    return false;
  });

  return { allowed: matches, settings };
}

/**
 * 1-Click Check-In for Student on Campus Wi-Fi
 */
export async function checkInAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (req.userRole !== 'STUDENT') {
      res.status(403).json({ success: false, message: 'Only students can check in for attendance.' });
      return;
    }

    const clientIp = extractClientIp(req);
    const { allowed, settings } = await isCampusWifiAllowed(clientIp);

    if (!allowed) {
      res.status(403).json({
        success: false,
        wifiRestricted: true,
        detectedIp: clientIp,
        requiredSsid: settings.campusWifiSsid,
        message: `Campus Wi-Fi Required: You are connecting from an external network (${clientIp || 'Unknown IP'}). Attendance can only be recorded while connected to Naprocs Campus Wi-Fi (${settings.campusWifiSsid || 'Naprocs-Campus-5G'}).`,
      });
      return;
    }

    const studentProfile = await StudentProfile.findOne({ user: req.userId }).populate('user');
    if (!studentProfile) {
      res.status(404).json({ success: false, message: 'Student profile not found.' });
      return;
    }

    const enrollment = await Enrollment.findOne({
      student: studentProfile._id,
      status: 'ACTIVE',
    }).populate('batch course');

    if (!enrollment || !enrollment.batch) {
      res.status(400).json({
        success: false,
        message: 'No active cohort batch enrollment found for your account. Please contact the coordinator.',
      });
      return;
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 1. Check if student has already checked in and checked out for today
    const completedToday = await AttendanceRecord.findOne({
      student: studentProfile._id,
      attendanceDate: { $gte: startOfDay, $lte: endOfDay },
      checkInTime: { $exists: true, $ne: null },
      checkOutTime: { $exists: true, $ne: null },
    });

    if (completedToday) {
      res.status(400).json({
        success: false,
        alreadyCheckedOut: true,
        message: 'You have already completed attendance (checked in and checked out) for today. Multiple check-ins are not permitted.',
        record: completedToday,
      });
      return;
    }

    // 2. Check if already checked in actively
    const activeRecord = await AttendanceRecord.findOne({
      student: studentProfile._id,
      attendanceDate: { $gte: startOfDay, $lte: endOfDay },
      checkInTime: { $exists: true, $ne: null },
      $or: [{ checkOutTime: { $exists: false } }, { checkOutTime: null }],
    });

    if (activeRecord) {
      const elapsedMinutes = Math.max(
        0,
        Math.round((now.getTime() - new Date(activeRecord.checkInTime!).getTime()) / 60000)
      );
      res.json({
        success: true,
        alreadyCheckedIn: true,
        message: 'You are already actively checked in for today!',
        record: activeRecord,
        checkInTime: activeRecord.checkInTime,
        currentDurationMinutes: elapsedMinutes,
        isCheckedIn: true,
      });
      return;
    }

    // Auto-resolve or find today's class session for this batch
    let classSession = await ClassSession.findOne({
      batch: enrollment.batch._id,
      sessionDate: { $gte: startOfDay, $lte: endOfDay },
    });

    if (!classSession) {
      const batchDoc: any = enrollment.batch;
      const todayCode = `SESS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
        now.getDate()
      ).padStart(2, '0')}-${batchDoc._id.toString().slice(-4)}`;
      classSession = await ClassSession.create({
        sessionCode: todayCode,
        batch: batchDoc._id,
        course: enrollment.course?._id || batchDoc.course,
        trainer: batchDoc.trainer || req.userId,
        sessionDate: now,
        startTime: '09:30 AM',
        endTime: '01:30 PM',
        topicTitle: `${batchDoc.name || 'Campus'} Classroom Lecture & Practical Lab`,
        moduleLabel: 'Classroom Lecture & Lab Session',
        classroom: batchDoc.classroom || 'Lab-1',
        roomNumber: 'Room 204',
        status: 'LIVE',
        startedAt: now,
      });
    }

    // Ensure AttendanceSession exists
    let attendanceSession = await AttendanceSession.findOne({ classSession: classSession._id });
    if (!attendanceSession) {
      attendanceSession = await AttendanceSession.create({
        classSession: classSession._id,
        batch: enrollment.batch._id,
        trainer: classSession.trainer,
        status: 'ACTIVE',
        openedAt: now,
        totalEligible: await Enrollment.countDocuments({ batch: enrollment.batch._id, status: 'ACTIVE' }),
      });
    }

    // Upsert or create AttendanceRecord for today
    let record = await AttendanceRecord.findOne({
      student: studentProfile._id,
      classSession: classSession._id,
    });

    if (record) {
      if (record.checkOutTime) {
        res.status(400).json({
          success: false,
          alreadyCheckedOut: true,
          message: 'You have already checked out of this session today. Check-in cannot be re-opened.',
          record,
        });
        return;
      }
      record.checkInTime = now;
      record.checkOutTime = undefined;
      record.status = 'PRESENT';
      record.verificationMethod = 'WIFI_CHECKIN';
      record.ipAddress = clientIp;
      record.wifiSignalMatched = true;
      record.markedBy = req.userId as any;
      await record.save();
    } else {
      record = await AttendanceRecord.create({
        attendanceSession: attendanceSession._id,
        classSession: classSession._id,
        student: studentProfile._id,
        user: req.userId,
        batch: enrollment.batch._id,
        course: enrollment.course?._id || (enrollment.batch as any).course,
        attendanceDate: now,
        checkInTime: now,
        status: 'PRESENT',
        verificationMethod: 'WIFI_CHECKIN',
        ipAddress: clientIp,
        wifiSignalMatched: true,
        markedBy: req.userId,
      });
    }

    // Update session present counts
    const presentCount = await AttendanceRecord.countDocuments({
      attendanceSession: attendanceSession._id,
      status: { $in: ['PRESENT', 'HALF_DAY'] },
    });
    attendanceSession.totalPresent = presentCount;
    await attendanceSession.save();

    // Broadcast live event to Trainer & Admin via Socket.io
    try {
      const io = getIO();
      const payload = {
        recordId: record._id,
        studentId: studentProfile.studentId,
        studentName: (studentProfile.user as any)?.name || 'Student',
        avatar: (studentProfile.user as any)?.avatar,
        status: 'PRESENT',
        checkInTime: record.checkInTime,
        verificationMethod: 'WIFI_CHECKIN',
        durationMinutes: 0,
        batchId: enrollment.batch._id,
        classSessionId: classSession._id,
        isLiveCheckedIn: true,
      };
      io.to(`session:${classSession._id}`).emit('student_attendance_marked', payload);
      io.to(`batch:${enrollment.batch._id}`).emit('student_attendance_marked', payload);
      io.emit('student_attendance_marked', payload);
    } catch (e) {
      // safe
    }

    res.json({
      success: true,
      message: `Checked in successfully on Naprocs Campus Wi-Fi (${settings.campusWifiSsid || 'Verified'})! Active session timer started.`,
      record,
      isCheckedIn: true,
      checkInTime: record.checkInTime,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 1-Click Check-Out for Student (calculates total attended duration)
 */
export async function checkOutAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (req.userRole !== 'STUDENT') {
      res.status(403).json({ success: false, message: 'Only students can check out of attendance.' });
      return;
    }

    const studentProfile = await StudentProfile.findOne({ user: req.userId }).populate('user');
    if (!studentProfile) {
      res.status(404).json({ success: false, message: 'Student profile not found.' });
      return;
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const record = await AttendanceRecord.findOne({
      student: studentProfile._id,
      attendanceDate: { $gte: startOfDay, $lte: endOfDay },
      checkInTime: { $exists: true, $ne: null },
      $or: [{ checkOutTime: { $exists: false } }, { checkOutTime: null }],
    });

    if (!record) {
      res.status(400).json({
        success: false,
        message: 'No active check-in found for today. Please click Check In first.',
      });
      return;
    }

    record.checkOutTime = now;
    const diffMs = now.getTime() - new Date(record.checkInTime!).getTime();
    const calculatedMinutes = Math.max(1, Math.round(diffMs / 60000));
    record.durationMinutes = calculatedMinutes;

    const { settings } = await isCampusWifiAllowed(extractClientIp(req));
    const minRequiredMinutes = (settings.minAttendanceHoursForPresent || 1) * 60;

    if (calculatedMinutes >= minRequiredMinutes) {
      record.status = 'PRESENT';
    } else {
      record.status = 'HALF_DAY';
    }
    await record.save();

    // Recompute student's overall batch attendance
    const allRecords = await AttendanceRecord.find({
      student: studentProfile._id,
      batch: record.batch,
    });
    const totalConducted = allRecords.length;
    const fullPresent = allRecords.filter((r) => r.status === 'PRESENT').length;
    const halfDay = allRecords.filter((r) => r.status === 'HALF_DAY').length;
    const effectivePresent = fullPresent + halfDay * 0.5;
    const rate =
      totalConducted > 0 ? parseFloat(((effectivePresent / totalConducted) * 100).toFixed(1)) : 100;

    await Enrollment.updateOne(
      { student: studentProfile._id, batch: record.batch },
      {
        classesAttended: fullPresent + halfDay,
        attendancePercentage: rate,
      }
    );
    await StudentProfile.findByIdAndUpdate(studentProfile._id, {
      attendanceHealthPercentage: rate,
    });

    const hours = Math.floor(calculatedMinutes / 60);
    const mins = calculatedMinutes % 60;
    const formattedDuration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    // Broadcast check-out event to Trainer & Admin via Socket.io
    try {
      const io = getIO();
      const payload = {
        recordId: record._id,
        studentId: studentProfile.studentId,
        studentName: (studentProfile.user as any)?.name || 'Student',
        status: record.status,
        checkInTime: record.checkInTime,
        checkOutTime: record.checkOutTime,
        durationMinutes: calculatedMinutes,
        formattedDuration,
        batchId: record.batch,
        classSessionId: record.classSession,
        isLiveCheckedIn: false,
      };
      io.to(`session:${record.classSession}`).emit('student_attendance_checkout', payload);
      io.to(`batch:${record.batch}`).emit('student_attendance_checkout', payload);
      io.emit('student_attendance_checkout', payload);
    } catch (e) {
      // safe
    }

    res.json({
      success: true,
      message: `Checked out successfully! Attended duration: ${formattedDuration} (${
        record.status === 'PRESENT' ? 'Full Day Verified' : 'Half Day Recorded'
      }).`,
      record,
      durationMinutes: calculatedMinutes,
      formattedDuration,
      status: record.status,
      isCheckedIn: false,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Get Student Live Attendance Status (Stopwatch & Campus Wi-Fi Status)
 */
export async function getLiveAttendanceStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const clientIp = extractClientIp(req);
    const { allowed, settings } = await isCampusWifiAllowed(clientIp);

    if (req.userRole !== 'STUDENT') {
      res.json({
        success: true,
        clientIp,
        isCampusWifi: allowed,
        campusWifiEnabled: settings.campusWifiEnabled,
        campusWifiSsid: settings.campusWifiSsid,
      });
      return;
    }

    const studentProfile = await StudentProfile.findOne({ user: req.userId });
    if (!studentProfile) {
      res.status(404).json({ success: false, message: 'Student profile not found.' });
      return;
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Look for active session first (checked in, not yet checked out)
    const activeRecord = await AttendanceRecord.findOne({
      student: studentProfile._id,
      attendanceDate: { $gte: startOfDay, $lte: endOfDay },
      checkInTime: { $exists: true, $ne: null },
      $or: [{ checkOutTime: { $exists: false } }, { checkOutTime: null }],
    }).sort({ checkInTime: -1 });

    // Look for completed session today (checked in and checked out)
    const completedRecord = await AttendanceRecord.findOne({
      student: studentProfile._id,
      attendanceDate: { $gte: startOfDay, $lte: endOfDay },
      checkInTime: { $exists: true, $ne: null },
      checkOutTime: { $exists: true, $ne: null },
    }).sort({ checkOutTime: -1 });

    const todayRecord = activeRecord || completedRecord;
    const isCheckedIn = !!activeRecord;
    const hasCompletedToday = !isCheckedIn && !!completedRecord;
    let currentDurationMinutes = 0;

    if (isCheckedIn && activeRecord?.checkInTime) {
      currentDurationMinutes = Math.max(
        0,
        Math.round((now.getTime() - new Date(activeRecord.checkInTime).getTime()) / 60000)
      );
    } else if (todayRecord && todayRecord.durationMinutes) {
      currentDurationMinutes = todayRecord.durationMinutes;
    }

    const hours = Math.floor(currentDurationMinutes / 60);
    const mins = currentDurationMinutes % 60;
    const formattedDuration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    res.json({
      success: true,
      isCheckedIn,
      hasCompletedToday,
      checkInTime: todayRecord?.checkInTime || null,
      checkOutTime: todayRecord?.checkOutTime || null,
      durationMinutes: todayRecord?.durationMinutes || 0,
      currentDurationMinutes,
      formattedDuration,
      status: todayRecord?.status || 'ABSENT',
      todayRecord,
      wifiStatus: {
        clientIp,
        isCampusWifi: allowed,
        campusWifiEnabled: settings.campusWifiEnabled,
        campusWifiSsid: settings.campusWifiSsid,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Get Campus Network & Public IP Info
 */
export async function getNetworkInfo(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const clientIp = extractClientIp(req);
    const { allowed, settings } = await isCampusWifiAllowed(clientIp);

    res.json({
      success: true,
      detectedIp: clientIp,
      isAllowedOnCampus: allowed,
      campusWifiEnabled: settings.campusWifiEnabled,
      campusWifiSsid: settings.campusWifiSsid,
      allowedWifiIps: settings.allowedWifiIps,
      minAttendanceHoursForPresent: settings.minAttendanceHoursForPresent,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Update Campus Wi-Fi Security Settings (Admin Only)
 */
export async function updateWifiSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { campusWifiEnabled, campusWifiSsid, allowedWifiIps, minAttendanceHoursForPresent } =
      req.body;

    let settings = await InstituteSettings.findOne();
    if (!settings) {
      settings = new InstituteSettings();
    }

    if (typeof campusWifiEnabled === 'boolean') {
      settings.campusWifiEnabled = campusWifiEnabled;
    }
    if (campusWifiSsid) {
      settings.campusWifiSsid = campusWifiSsid;
    }
    if (Array.isArray(allowedWifiIps)) {
      settings.allowedWifiIps = allowedWifiIps.map((ip: string) => ip.trim()).filter(Boolean);
    }
    if (typeof minAttendanceHoursForPresent === 'number') {
      settings.minAttendanceHoursForPresent = minAttendanceHoursForPresent;
    }

    await settings.save();

    res.json({
      success: true,
      message: 'Campus Wi-Fi attendance security settings successfully updated.',
      settings,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

