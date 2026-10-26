import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const batches = await mongoose.connection.collection('batches').find({}).toArray();
  console.log('Batches in DB:', batches.length);
  for (const b of batches) {
    console.log({ id: b._id, name: b.name, code: b.batchCode, trainer: b.trainer });
  }

  const trainers = await mongoose.connection.collection('users').find({ role: 'TRAINER' }).toArray();
  console.log('Trainers in DB:');
  for (const t of trainers) {
    console.log({ id: t._id, name: t.name, email: t.email });
  }

  await mongoose.disconnect();
}
main().catch(console.error);
