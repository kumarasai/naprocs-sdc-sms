import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { AttendanceRecord } from '../models/Attendance';
import { Batch, Enrollment } from '../models/Batch';
import { ClassSession } from '../models/ClassSession';
import ExcelJS from 'exceljs';

export async function getAttendanceReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { batchId, courseId, status, startDate, endDate, studentId } = req.query;

    const filter: any = {};
    if (batchId) filter.batch = batchId;
    if (courseId) filter.course = courseId;
    if (status) filter.status = status;
    if (studentId) filter.student = studentId;

    if (startDate || endDate) {
      filter.attendanceDate = {};
      if (startDate) filter.attendanceDate.$gte = new Date(startDate as string);
      if (endDate) filter.attendanceDate.$lte = new Date(endDate as string);
    }

    const records = await AttendanceRecord.find(filter)
      .populate('student')
      .populate('user', 'name email')
      .populate('batch', 'name batchCode')
      .populate('classSession', 'topicTitle sessionCode')
      .sort({ attendanceDate: -1 });

    const total = records.length;
    const present = records.filter((r) => r.status === 'PRESENT').length;
    const late = records.filter((r) => r.status === 'LATE').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const rate = total > 0 ? parseFloat((((present + late) / total) * 100).toFixed(1)) : 0;

    res.json({
      success: true,
      summary: {
        totalRecords: total,
        presentCount: present,
        lateCount: late,
        absentCount: absent,
        overallAttendanceRate: rate,
      },
      records,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getAttendanceRegister(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { batchId } = req.query;
    if (!batchId) {
      res.status(400).json({ success: false, message: 'Batch ID is required' });
      return;
    }

    const enrollments = await Enrollment.find({ batch: batchId, status: 'ACTIVE' })
      .populate('student')
      .populate('user', 'name email phone avatar');

    const records = await AttendanceRecord.find({ batch: batchId });
    const totalSessionsConducted = await ClassSession.countDocuments({
      batch: batchId,
      status: { $in: ['LIVE', 'COMPLETED'] },
    });

    const roster = enrollments.map((enr) => {
      const studentRecords = records.filter(
        (r) => r.student.toString() === enr.student._id.toString()
      );
      const attended = studentRecords.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
      const pct =
        totalSessionsConducted > 0
          ? parseFloat(((attended / totalSessionsConducted) * 100).toFixed(1))
          : (enr.attendancePercentage ?? 0);

      return {
        studentId: (enr.student as any)?.studentId || 'N/A',
        name: (enr.user as any)?.name || 'N/A',
        email: (enr.user as any)?.email || 'N/A',
        attended,
        totalConducted: totalSessionsConducted,
        percentage: pct,
      };
    });

    const totalCheckIns = records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
    const overallRate =
      roster.length > 0
        ? parseFloat((roster.reduce((acc, curr) => acc + curr.percentage, 0) / roster.length).toFixed(1))
        : 0;

    const studentsAtRisk = roster.filter((r) => r.percentage < 75).length;

    res.json({
      success: true,
      data: {
        summary: {
          overallRate,
          totalSessionsConducted,
          totalPresent: totalCheckIns,
          studentsAtRisk,
        },
        roster,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function exportAttendanceExcel(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { batchId } = req.query;
    const filter: any = {};
    if (batchId) filter.batch = batchId;

    const records = await AttendanceRecord.find(filter)
      .populate('student')
      .populate('user', 'name email phone')
      .populate('batch', 'name batchCode')
      .populate('classSession', 'topicTitle sessionCode')
      .sort({ attendanceDate: -1 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Naprocs Skill Development Center';
    const worksheet = workbook.addWorksheet('Attendance Register');

    worksheet.columns = [
      { header: 'Student ID', key: 'studentId', width: 20 },
      { header: 'Student Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Batch', key: 'batch', width: 22 },
      { header: 'Session Topic', key: 'topic', width: 35 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Check-In Time', key: 'checkIn', width: 16 },
      { header: 'Check-Out Time', key: 'checkOut', width: 16 },
      { header: 'Duration (Mins)', key: 'duration', width: 16 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Verification Method', key: 'method', width: 20 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF004AC6' }, // Naprocs brand primary blue
    };

    records.forEach((r: any) => {
      worksheet.addRow({
        studentId: r.student?.studentId || 'N/A',
        name: r.user?.name || 'N/A',
        email: r.user?.email || 'N/A',
        batch: r.batch?.name || 'N/A',
        topic: r.classSession?.topicTitle || 'N/A',
        date: r.attendanceDate ? new Date(r.attendanceDate).toLocaleDateString() : 'N/A',
        checkIn: r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : 'N/A',
        checkOut: r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : (r.checkInTime ? 'In Class (Active)' : 'N/A'),
        duration: r.durationMinutes || 0,
        status: r.status,
        method: r.verificationMethod,
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + `naprocs_attendance_report_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
