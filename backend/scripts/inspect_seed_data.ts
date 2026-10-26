import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const assignments = await mongoose.connection.collection('assignments').find({}).toArray();
  console.log('Assignments in DB:', assignments.length);
  for (const a of assignments) {
    console.log({ id: a._id, title: a.title, batch: a.batch });
  }

  const quizzes = await mongoose.connection.collection('quizzes').find({}).toArray();
  console.log('Quizzes in DB:', quizzes.length);
  for (const q of quizzes) {
    console.log({ id: q._id, title: q.title });
  }

  const materials = await mongoose.connection.collection('studymaterials').find({}).toArray();
  console.log('StudyMaterials in DB:', materials.length);
  for (const m of materials) {
    console.log({ id: m._id, title: m.title });
  }

  const announcements = await mongoose.connection.collection('announcements').find({}).toArray();
  console.log('Announcements in DB:', announcements.length);
  for (const an of announcements) {
    console.log({ id: an._id, title: an.title });
  }

  const sessions = await mongoose.connection.collection('classsessions').find({}).toArray();
  console.log('ClassSessions in DB:', sessions.length);
  for (const s of sessions) {
    console.log({ id: s._id, topicTitle: s.topicTitle, sessionDate: s.sessionDate });
  }

  await mongoose.disconnect();
}
main().catch(console.error);
