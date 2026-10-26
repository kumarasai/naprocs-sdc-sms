import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('Connected to Atlas');
  const user = await mongoose.connection.collection('users').findOne({ email: 'test@naprocs.in' });
  if (user) {
    const student = await mongoose.connection.collection('studentprofiles').findOne({ user: user._id });
    if (student) {
      const delRes = await mongoose.connection.collection('attendancerecords').deleteMany({ student: student._id });
      console.log(`Deleted ${delRes.deletedCount} attendance records for test@naprocs.in`);
    }
  }
  await mongoose.disconnect();
  console.log('Done');
}

main().catch(console.error);
