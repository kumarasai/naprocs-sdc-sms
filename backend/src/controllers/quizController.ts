import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Quiz, QuizQuestion, QuizAttempt } from '../models/Learning';
import { StudentProfile } from '../models/Profiles';
import { Enrollment } from '../models/Batch';
import { User } from '../models/User';
import { Notification, Announcement } from '../models/Communication';
import { getIO } from '../sockets/attendanceSocket';

export async function getQuizzes(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { batchId } = req.query;
    const query: any = { isPublished: true };
    if (batchId) query.batch = batchId;

    const quizzes = await Quiz.find(query).sort({ scheduledAt: 1 });

    let attempts: any[] = [];
    if (req.userRole === 'STUDENT') {
      const student = await StudentProfile.findOne({ user: req.userId });
      if (student) {
        attempts = await QuizAttempt.find({ student: student._id });
      }
    }

    const attemptMap = new Map(attempts.map((a) => [a.quiz.toString(), a]));

    const result = quizzes.map((q) => {
      const att = attemptMap.get(q._id.toString());
      return {
        id: q._id,
        title: q.title,
        description: q.description,
        durationMinutes: q.durationMinutes,
        totalQuestions: q.totalQuestions,
        totalPoints: q.totalPoints,
        passingScore: q.passingScore,
        deadline: q.deadline,
        scheduledAt: q.scheduledAt,
        attempt: att
          ? {
              totalScore: att.totalScore,
              percentage: att.percentage,
              passed: att.passed,
              submittedAt: att.submittedAt,
            }
          : null,
      };
    });

    res.json({ success: true, count: result.length, quizzes: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getQuizQuestions(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { quizId } = req.params;
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      res.status(404).json({ success: false, message: 'Quiz not found.' });
      return;
    }

    // Check if student already attempted this quiz (retakes are not allowed)
    if (req.userRole === 'STUDENT') {
      const student = await StudentProfile.findOne({ user: req.userId });
      if (student) {
        const existingAttempt = await QuizAttempt.findOne({ quiz: quizId, student: student._id });
        if (existingAttempt) {
          res.status(400).json({
            success: false,
            message: 'You have already completed this quiz. Retakes are not permitted.',
            alreadySubmitted: true,
            attempt: {
              totalScore: existingAttempt.totalScore,
              percentage: existingAttempt.percentage,
              passed: existingAttempt.passed,
              submittedAt: existingAttempt.submittedAt,
            },
          });
          return;
        }
      }
    }

    // Never return correctOptionIndex before student submission
    const questions = await QuizQuestion.find({ quiz: quizId })
      .select('-correctOptionIndex')
      .sort({ questionNumber: 1 });

    res.json({ success: true, quiz, questions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function submitQuiz(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { quizId } = req.params;
    const { answers } = req.body; // array of { questionId, selectedOptionIndex }

    const student = await StudentProfile.findOne({ user: req.userId });
    if (!student) {
      res.status(404).json({ success: false, message: 'Student profile not found.' });
      return;
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      res.status(404).json({ success: false, message: 'Quiz not found.' });
      return;
    }

    // Enforce one-time attempt check
    const existingAttempt = await QuizAttempt.findOne({ quiz: quiz._id, student: student._id });
    if (existingAttempt) {
      res.status(400).json({
        success: false,
        message: 'You have already completed this quiz. Quizzes can only be attempted once.',
        alreadySubmitted: true,
        result: {
          score: existingAttempt.totalScore,
          maxPoints: quiz.totalPoints,
          percentage: existingAttempt.percentage,
          passed: existingAttempt.passed,
          submittedAt: existingAttempt.submittedAt,
        },
      });
      return;
    }

    // Fetch questions with correct answers for server-side evaluation
    const questions = await QuizQuestion.find({ quiz: quizId }).select('+correctOptionIndex');
    const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

    let totalScore = 0;
    const evaluatedAnswers: any[] = [];

    for (const ans of answers || []) {
      const q = questionMap.get(ans.questionId);
      if (q) {
        const isCorrect = q.correctOptionIndex === ans.selectedOptionIndex;
        const points = isCorrect ? q.points : 0;
        totalScore += points;

        evaluatedAnswers.push({
          questionId: q._id,
          selectedOptionIndex: ans.selectedOptionIndex,
          isCorrect,
          pointsAwarded: points,
        });
      }
    }

    const maxPoints = quiz.totalPoints || questions.length || 1;
    const percentage = maxPoints > 0 ? parseFloat(((totalScore / maxPoints) * 100).toFixed(1)) : 100;
    const effectivePassingScore = Math.min(quiz.passingScore || Math.ceil(maxPoints * 0.6), maxPoints);
    const passed = totalScore >= effectivePassingScore || percentage >= 60;

    // Dynamic encouraging feedback based on score percentage
    let feedbackTitle = '';
    let feedbackMessage = '';
    let performanceBadge = '';

    if (percentage >= 100) {
      feedbackTitle = 'Outstanding! Perfect Score! 🏆';
      feedbackMessage = 'Excellent work! You answered every question correctly with 100% accuracy!';
      performanceBadge = 'Excellent';
    } else if (percentage >= 80) {
      feedbackTitle = 'Great Job! Excellent Performance! 🌟';
      feedbackMessage = 'Great work! You scored exceptionally well and demonstrated strong understanding.';
      performanceBadge = 'Good';
    } else if (percentage >= 60) {
      feedbackTitle = 'Good Effort! Well Done! 👍';
      feedbackMessage = 'Good job! You passed the assessment. Keep studying to reach the top tier.';
      performanceBadge = 'Good';
    } else if (percentage >= 40) {
      feedbackTitle = 'Nice Try! Keep Practicing! 📚';
      feedbackMessage = 'Nice try! You gave a fair attempt. Review the lecture notes and practice to score higher next time.';
      performanceBadge = 'Nice try';
    } else {
      feedbackTitle = 'Work Hard Next Time! 💪';
      feedbackMessage = 'Work hard next time! Don’t worry, review the study materials and discuss with your trainer.';
      performanceBadge = 'Work hard';
    }

    const attempt = await QuizAttempt.create({
      quiz: quiz._id,
      student: student._id,
      user: req.userId,
      startedAt: new Date(Date.now() - 15 * 60 * 1000),
      submittedAt: new Date(),
      answers: evaluatedAnswers,
      totalScore,
      percentage,
      passed,
    });

    // Notify trainer and emit real-time event
    try {
      const studentUser = await User.findById(req.userId).select('name email');
      const studentName = studentUser?.name || 'A student';

      if (quiz.trainer) {
        await Notification.create({
          recipient: quiz.trainer,
          title: `Quiz Completed: ${quiz.title}`,
          message: `${studentName} scored ${totalScore}/${maxPoints} (${percentage}%) in "${quiz.title}". Status: ${performanceBadge}.`,
          type: 'QUIZ',
          link: '/trainer',
          metadata: {
            quizId: quiz._id,
            studentId: student._id,
            score: totalScore,
            percentage,
          },
          isRead: false,
        });
      }

      const io = getIO();
      io.emit('quiz_submitted', {
        quizId: quiz._id,
        quizTitle: quiz.title,
        studentId: student.studentId,
        studentName,
        score: totalScore,
        maxPoints,
        percentage,
        passed,
        performanceBadge,
        submittedAt: attempt.submittedAt,
      });

      if (quiz.trainer) {
        io.to(`user:${quiz.trainer.toString()}`).emit('notification_received', {
          title: `Quiz Completed: ${quiz.title}`,
          message: `${studentName} scored ${totalScore}/${maxPoints} (${percentage}%) in "${quiz.title}".`,
          type: 'QUIZ',
          link: '/trainer',
          createdAt: new Date(),
        });
      }
    } catch (sockErr) {
      console.warn('[QuizController] Notification/Socket emit warning:', sockErr);
    }

    res.status(201).json({
      success: true,
      message: feedbackMessage,
      feedbackTitle,
      performanceBadge,
      result: {
        score: totalScore,
        maxPoints,
        percentage,
        passed,
        feedbackTitle,
        feedbackMessage,
        performanceBadge,
        submittedAt: attempt.submittedAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createQuiz(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { title, description, courseId, batchId, durationMinutes, totalPoints, passingScore, deadline, questions } = req.body;
    if (!title || !batchId) {
      res.status(400).json({ success: false, message: 'Title and batchId are required.' });
      return;
    }

    const calculatedPoints = totalPoints || (Array.isArray(questions) && questions.length > 0
      ? questions.reduce((acc: number, q: any) => acc + (Number(q.points) || 1), 0)
      : 20);

    const safePassingScore = passingScore && Number(passingScore) <= calculatedPoints
      ? Number(passingScore)
      : Math.max(1, Math.ceil(calculatedPoints * 0.6));

    const quiz = await Quiz.create({
      title,
      description: description || 'Practical objective assessment.',
      course: courseId,
      batch: batchId,
      trainer: req.userId,
      durationMinutes: durationMinutes || 20,
      totalQuestions: questions?.length || 5,
      totalPoints: calculatedPoints,
      passingScore: safePassingScore,
      deadline: deadline ? new Date(deadline) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isPublished: true,
    });

    if (Array.isArray(questions) && questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await QuizQuestion.create({
          quiz: quiz._id,
          questionNumber: i + 1,
          prompt: q.prompt,
          options: q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
          correctOptionIndex: q.correctOptionIndex ?? 0,
          points: q.points || 1,
          explanation: q.explanation || '',
        });
      }
    }

    // 1. Gather student recipient user IDs
    const enrollments = await Enrollment.find({ batch: batchId });
    let studentUserIds = enrollments.map((e) => e.user).filter(Boolean);
    if (studentUserIds.length === 0) {
      const allStudents = await User.find({ role: 'STUDENT' }).select('_id');
      studentUserIds = allStudents.map((s) => s._id);
    }

    const formattedDeadline = new Date(quiz.deadline).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    // 2. Create in-app Notification records for all cohort students
    const notificationsToInsert = studentUserIds.map((userId) => ({
      recipient: userId,
      title: `New Quiz: ${quiz.title}`,
      message: `Trainer published a new quiz "${quiz.title}". Deadline: ${formattedDeadline}. Total Points: ${quiz.totalPoints}.`,
      type: 'QUIZ' as const,
      link: '/quizzes',
      metadata: {
        quizId: quiz._id,
        batchId: quiz.batch,
        deadline: quiz.deadline,
        totalPoints: quiz.totalPoints,
      },
      isRead: false,
    }));

    if (notificationsToInsert.length > 0) {
      await Notification.insertMany(notificationsToInsert);
    }

    // 3. Create Announcement
    await Announcement.create({
      title: `New Quiz Available: ${quiz.title}`,
      description: `A new assessment "${quiz.title}" has been assigned.\n\nDeadline: ${formattedDeadline} | Duration: ${quiz.durationMinutes} mins | Points: ${quiz.totalPoints}\n\n${quiz.description}`,
      priority: 'HIGH',
      targetAudience: 'BATCH',
      targetBatch: quiz.batch,
      locationScope: 'Online Assessment',
      publishedBy: req.userId,
      publishDate: new Date(),
      isActive: true,
    });

    // 4. Emit Socket.IO events
    try {
      const io = getIO();
      io.emit('new_quiz', {
        id: quiz._id,
        title: quiz.title,
        deadline: quiz.deadline,
      });

      for (const uid of studentUserIds) {
        io.to(`user:${uid.toString()}`).emit('notification_received', {
          title: `New Quiz: ${quiz.title}`,
          message: `Trainer published a new quiz "${quiz.title}".`,
          type: 'QUIZ',
          link: '/quizzes',
          createdAt: new Date(),
        });
      }

      io.emit('announcement_created', {
        title: `New Quiz: ${quiz.title}`,
        createdAt: new Date(),
      });
    } catch (socketErr) {
      console.warn('[QuizController] Socket emit warning:', socketErr);
    }

    res.status(201).json({ success: true, message: 'Quiz published successfully.', quiz });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteQuiz(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { quizId } = req.params;
    await Quiz.findByIdAndDelete(quizId);
    await QuizQuestion.deleteMany({ quiz: quizId });
    await QuizAttempt.deleteMany({ quiz: quizId });
    await Notification.deleteMany({ 'metadata.quizId': quizId });

    // Emit real-time quiz_deleted event so all connected student portals remove it immediately
    try {
      const io = getIO();
      io.emit('quiz_deleted', { quizId });
    } catch (sockErr) {
      console.warn('[QuizController] Socket emit warning on deleteQuiz:', sockErr);
    }

    res.json({ success: true, message: 'Quiz deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

