import { User } from '../models/User';
import { TrainerProfile, StudentProfile } from '../models/Profiles';
import { Batch, Enrollment } from '../models/Batch';

/**
 * Self-healing sync for single-trainer institute setups:
 * Ensures all active batches and students are connected to the active trainer,
 * eliminating orphaned records and ensuring real-time dashboard visibility.
 */
export async function syncSingleTrainerAndStudents(): Promise<{ success: boolean; message: string }> {
  try {
    const trainers = await User.find({ role: 'TRAINER', status: 'ACTIVE' });
    if (trainers.length === 0) {
      return { success: false, message: 'No active trainer found in system.' };
    }

    const primaryTrainer = trainers[0];
    const validTrainerUserIds = trainers.map((t) => t._id);

    // If there is only 1 trainer, or unassigned batches exist, link them to the primary trainer
    if (trainers.length === 1) {
      await Batch.updateMany(
        { status: 'ACTIVE' },
        { $set: { trainer: primaryTrainer._id } }
      );
    } else {
      await Batch.updateMany(
        {
          $or: [
            { trainer: { $exists: false } },
            { trainer: null },
            { trainer: { $nin: validTrainerUserIds } },
          ],
        },
        { $set: { trainer: primaryTrainer._id } }
      );
    }

    // Synchronize TrainerProfile.assignedBatches
    const allTrainerBatches = await Batch.find({ trainer: primaryTrainer._id });
    const batchIds = allTrainerBatches.map((b) => b._id);
    await TrainerProfile.updateOne(
      { user: primaryTrainer._id },
      { $addToSet: { assignedBatches: { $each: batchIds } } }
    );

    // Auto-enroll any students with missing batch into the primary active batch
    const activeBatch = allTrainerBatches.find((b) => b.status === 'ACTIVE') || allTrainerBatches[0];
    if (activeBatch) {
      const allStudents = await StudentProfile.find({});
      for (const st of allStudents) {
        const existingEnr = await Enrollment.findOne({ student: st._id });
        if (!existingEnr || !existingEnr.batch) {
          await Enrollment.findOneAndUpdate(
            { student: st._id },
            {
              $set: {
                student: st._id,
                user: st.user,
                batch: activeBatch._id,
                course: activeBatch.course,
                status: 'ACTIVE',
              },
            },
            { upsert: true }
          );
        }
      }
    }

    return {
      success: true,
      message: `Single trainer setup synced: ${primaryTrainer.name} (${primaryTrainer.email}) linked to ${allTrainerBatches.length} batch(es).`,
    };
  } catch (err: any) {
    console.error('Error during trainer sync:', err);
    return { success: false, message: err.message };
  }
}
