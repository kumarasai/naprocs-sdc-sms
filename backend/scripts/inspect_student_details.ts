import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const user = await mongoose.connection.collection('users').findOne({ email: 'test@naprocs.in' });
  console.log('User:', user?.name, user?.email);
  const profile = await mongoose.connection.collection('studentprofiles').findOne({ user: user?._id });
  console.log('Profile:', profile);
  const enrollments = await mongoose.connection.collection('enrollments').find({ student: profile?._id }).toArray();
  console.log('Enrollments count:', enrollments.length);
  for (const e of enrollments) {
    const batch = await mongoose.connection.collection('batches').findOne({ _id: e.batch });
    console.log('Enrolled Batch:', batch?.name, 'Code:', batch?.batchCode, 'Classroom:', batch?.classroom);
  }
  const records = await mongoose.connection.collection('attendancerecords').find({ student: profile?._id }).toArray();
  console.log('Attendance records count:', records.length);
  for (const r of records) {
    console.log(r);
  }
  await mongoose.disconnect();
}
main().catch(console.error);
