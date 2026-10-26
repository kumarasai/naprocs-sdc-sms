import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const users = await mongoose.connection.collection('users').find({}).project({ name: 1, email: 1, role: 1, mustChangePassword: 1 }).toArray();
  console.log('--- ALL USERS IN DATABASE ---');
  for (const u of users) {
    console.log(`${u.role}: ${u.name} (${u.email}) [mustChangePassword: ${u.mustChangePassword}]`);
  }
  await mongoose.disconnect();
}
main().catch(console.error);
