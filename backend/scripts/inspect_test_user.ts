import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('Connected to Atlas');
  const user = await mongoose.connection.collection('users').findOne({ email: 'test@naprocs.in' });
  console.log('User found:', user?._id, user?.email, user?.role);
  if (user) {
    const student = await mongoose.connection.collection('studentprofiles').findOne({ user: user._id });
    console.log('StudentProfile found:', student?._id, student?.studentId);
    if (student) {
      const records = await mongoose.connection.collection('attendancerecords').find({ student: student._id }).toArray();
      console.log('Total Attendance Records for student:', records.length);
      for (const r of records) {
        console.log({
          _id: r._id,
          date: r.attendanceDate,
          checkIn: r.checkInTime,
          checkOut: r.checkOutTime,
          duration: r.durationMinutes,
          status: r.status,
        });
      }
    }
  }
  await mongoose.disconnect();
}

main().catch(console.error);
