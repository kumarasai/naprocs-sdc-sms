import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('Connected to Atlas');

  // 1. Delete all static/dummy assignments
  const delAssignments = await mongoose.connection.collection('assignments').deleteMany({});
  console.log(`Deleted ${delAssignments.deletedCount} static assignments.`);

  // 2. Delete all static assignment submissions
  const delSubs = await mongoose.connection.collection('assignmentsubmissions').deleteMany({});
  console.log(`Deleted ${delSubs.deletedCount} assignment submissions.`);

  // 3. Delete all static quizzes and questions
  const delQuizzes = await mongoose.connection.collection('quizzes').deleteMany({});
  const delQuestions = await mongoose.connection.collection('quizquestions').deleteMany({});
  const delAttempts = await mongoose.connection.collection('quizattempts').deleteMany({});
  console.log(`Deleted ${delQuizzes.deletedCount} quizzes, ${delQuestions.deletedCount} questions, ${delAttempts.deletedCount} attempts.`);

  // 4. Delete all static study materials
  const delMaterials = await mongoose.connection.collection('studymaterials').deleteMany({});
  console.log(`Deleted ${delMaterials.deletedCount} static study materials.`);

  // 5. Delete all static announcements
  const delAnnounce = await mongoose.connection.collection('announcements').deleteMany({});
  console.log(`Deleted ${delAnnounce.deletedCount} static announcements.`);

  // 6. Delete all old static class sessions
  const delSessions = await mongoose.connection.collection('classsessions').deleteMany({});
  console.log(`Deleted ${delSessions.deletedCount} static class sessions.`);

  // 7. Delete all old attendance sessions
  const delAttSessions = await mongoose.connection.collection('attendancesessions').deleteMany({});
  console.log(`Deleted ${delAttSessions.deletedCount} attendance sessions.`);

  // 8. Link Node.js Batch 01 to the actual active trainer (test_trainer)
  const trainer = await mongoose.connection.collection('users').findOne({ email: 'trainertest@naprocs.in' });
  if (trainer) {
    const updateBatch = await mongoose.connection.collection('batches').updateMany(
      {},
      { $set: { trainer: trainer._id } }
    );
    console.log(`Updated ${updateBatch.modifiedCount} batches with trainer ${trainer.name} (${trainer.email}).`);
  }

  await mongoose.disconnect();
  console.log('--- ALL STATIC DATA SUCCESSFULLY PURGED ---');
}

main().catch(console.error);
