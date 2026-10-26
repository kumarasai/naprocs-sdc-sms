import dotenv from 'dotenv';
import path from 'path';
import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import { User } from '../src/models/User';
import { StudentProfile } from '../src/models/Profiles';
import { AttendanceRecord } from '../src/models/Attendance';

async function resetTestRecords() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to Atlas DB.');

  const testUser = await User.findOne({ email: 'test@naprocs.in' });
  if (testUser) {
    const student = await StudentProfile.findOne({ user: testUser._id });
    if (student) {
      console.log('Found test student profile:', student.studentId);
      // Remove any test attendance records created today
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const del = await AttendanceRecord.deleteMany({
        student: student._id,
        attendanceDate: { $gte: startOfDay, $lte: endOfDay },
      });
      console.log(`Deleted ${del.deletedCount} today test attendance records for test@naprocs.in.`);
    }
  }

  await mongoose.disconnect();
  console.log('Done.');
}

resetTestRecords().catch(console.error);
