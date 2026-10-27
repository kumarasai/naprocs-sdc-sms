import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import confetti from 'canvas-confetti';

interface QuestionDraft {
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  points: number;
  explanation: string;
}

export const QuizzesPage: React.FC = () => {
  const { role } = useAuth();
  const isTrainerOrAdmin = role === 'TRAINER' || role === 'ADMIN';

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeQuiz, setActiveQuiz] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [quizResult, setQuizResult] = useState<any | null>(null);

  // Create Quiz State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [isCreatingQuiz, setIsCreatingQuiz] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    batchId: '',
    courseId: '',
    durationMinutes: 15,
    totalPoints: 20,
    passingScore: 12,
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const [draftQuestions, setDraftQuestions] = useState<QuestionDraft[]>([
    {
      prompt: '',
      options: ['', '', '', ''],
      correctOptionIndex: 0,
      points: 5,
      explanation: '',
    },
  ]);

  const fetchQuizzes = async () => {
    try {
      const [qRes, batchesRes, coursesRes] = await Promise.all([
        api.get('/quizzes'),
        api.get('/courses/batches'),
        api.get('/courses/courses'),
      ]);

      if (qRes.data.success) {
        setQuizzes(qRes.data.quizzes || []);
      }
      if (batchesRes.data.success) {
        setBatches(batchesRes.data.batches || []);
        if (batchesRes.data.batches.length > 0) {
          setCreateForm((prev) => ({
            ...prev,
            batchId: batchesRes.data.batches[0]._id,
            courseId: batchesRes.data.batches[0].course?._id || '',
          }));
        }
      }
      if (coursesRes.data.success) {
        setCourses(coursesRes.data.courses || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const { socket } = useSocket();

  useEffect(() => {
    fetchQuizzes();
  }, []);

  // Real-time synchronization: quiz deletion & new quizzes
  useEffect(() => {
    if (!socket) return;

    const handleQuizDeleted = ({ quizId }: { quizId: string }) => {
      setQuizzes((prev) => prev.filter((q) => (q.id || q._id) !== quizId));
      if (activeQuiz && (activeQuiz.id === quizId || activeQuiz._id === quizId)) {
        setActiveQuiz(null);
        alert('This assessment was deleted by the instructor.');
      }
    };

    const handleNewQuiz = () => {
      fetchQuizzes();
    };

    socket.on('quiz_deleted', handleQuizDeleted);
    socket.on('new_quiz', handleNewQuiz);

    return () => {
      socket.off('quiz_deleted', handleQuizDeleted);
      socket.off('new_quiz', handleNewQuiz);
    };
  }, [socket, activeQuiz]);

  const handleStartQuiz = async (quiz: any) => {
    if (quiz.attempt && !isTrainerOrAdmin) {
      alert('You have already completed this assessment. Assessments can only be attempted once.');
      return;
    }

    try {
      const res = await api.get(`/quizzes/${quiz.id || quiz._id}/questions`);
      if (res.data.success) {
        setActiveQuiz(quiz);
        setQuestions(res.data.questions);
        setSelectedAnswers({});
        setQuizResult(null);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start quiz.');
    }
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    setIsSubmitting(true);

    const answersPayload = Object.entries(selectedAnswers).map(([questionId, selectedOptionIndex]) => ({
      questionId,
      selectedOptionIndex,
    }));

    try {
      const res = await api.post(`/quizzes/${activeQuiz.id}/submit`, {
        answers: answersPayload,
      });

      if (res.data.success) {
        setQuizResult(res.data.result);
        if (res.data.result.passed) {
          try {
            confetti({ particleCount: 70, spread: 60 });
          } catch (e) {}
        }
        fetchQuizzes();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to evaluate quiz.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add Question Draft
  const handleAddQuestionDraft = () => {
    setDraftQuestions((prev) => [
      ...prev,
      {
        prompt: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        points: 5,
        explanation: '',
      },
    ]);
  };

  // Remove Question Draft
  const handleRemoveQuestionDraft = (index: number) => {
    if (draftQuestions.length <= 1) return;
    setDraftQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  // Update Option in Draft
  const handleOptionChange = (qIndex: number, optIndex: number, value: string) => {
    setDraftQuestions((prev) => {
      const updated = [...prev];
      const opts = [...updated[qIndex].options];
      opts[optIndex] = value;
      updated[qIndex] = { ...updated[qIndex], options: opts };
      return updated;
    });
  };

  // Submit New Quiz Creation
  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingQuiz(true);
    try {
      // Validate that each question has a prompt and options
      for (let i = 0; i < draftQuestions.length; i++) {
        const q = draftQuestions[i];
        if (!q.prompt.trim()) {
          alert(`Question ${i + 1} needs a question text.`);
          setIsCreatingQuiz(false);
          return;
        }
        const filledOpts = q.options.filter((o) => o.trim().length > 0);
        if (filledOpts.length < 2) {
          alert(`Question ${i + 1} must have at least 2 options.`);
          setIsCreatingQuiz(false);
          return;
        }
      }

      const totalQuizPoints = draftQuestions.reduce((acc, q) => acc + (Number(q.points) || 5), 0);
      const safePassingScore = Math.min(Number(createForm.passingScore) || Math.ceil(totalQuizPoints * 0.6), totalQuizPoints);

      const payload = {
        ...createForm,
        totalPoints: totalQuizPoints,
        passingScore: safePassingScore,
        questions: draftQuestions,
      };

      const res = await api.post('/quizzes', payload);
      if (res.data.success) {
        alert(`Quiz "${createForm.title}" published successfully!`);
        setShowCreateModal(false);
        setCreateForm({
          title: '',
          description: '',
          batchId: batches[0]?._id || '',
          courseId: courses[0]?._id || '',
          durationMinutes: 15,
          totalPoints: 20,
          passingScore: 12,
          deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
        setDraftQuestions([
          {
            prompt: '',
            options: ['', '', '', ''],
            correctOptionIndex: 0,
            points: 5,
            explanation: '',
          },
        ]);
        fetchQuizzes();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create quiz');
    } finally {
      setIsCreatingQuiz(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete quiz "${title}"?`)) return;
    try {
      const res = await api.delete(`/quizzes/${quizId}`);
      if (res.data.success) {
        setQuizzes((prev) => prev.filter((q) => q.id !== quizId && q._id !== quizId));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete quiz');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[36px] animate-spin">
            progress_activity
          </span>
          <span className="font-body-md text-on-surface-variant font-medium">
            Loading online assessments...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-16 pt-6 gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface font-bold">
            Quizzes &amp; Automated Assessments
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Server-evaluated objective evaluations with immediate feedback
          </p>
        </div>

        {isTrainerOrAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            type="button"
            className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-body-sm font-semibold hover:bg-primary-container shadow-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add_task</span>
            <span>Create Quiz</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quizzes.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-2xl bg-surface-container-lowest border border-dashed border-outline-variant/60 shadow-xs flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px]">quiz</span>
            </div>
            <h3 className="font-headline-sm text-[18px] text-on-surface font-bold">
              No Quizzes Available
            </h3>
            <p className="text-body-sm text-on-surface-variant max-w-md">
              There are currently no active objective quizzes or examinations assigned.
            </p>
            {isTrainerOrAdmin && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-body-sm font-semibold hover:bg-primary-container shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add_task</span>
                <span>Create First Quiz</span>
              </button>
            )}
          </div>
        ) : (
          quizzes.map((quiz) => {
            const attempt = quiz.attempt;
            const isPassed = attempt?.passed;
            const quizId = quiz.id || quiz._id;

            return (
              <div
                key={quizId}
                className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex flex-col justify-between gap-5"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-[11px] font-bold uppercase tracking-wider">
                      {quiz.durationMinutes} Minutes
                    </span>
                    <div className="flex items-center gap-2">
                      {attempt && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-bold ${
                            isPassed
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          Score: {attempt.totalScore} / {quiz.totalPoints} pts ({attempt.percentage}%)
                        </span>
                      )}
                      {isTrainerOrAdmin && (
                        <button
                          onClick={() => handleDeleteQuiz(quizId, quiz.title)}
                          type="button"
                          className="p-1 text-outline hover:text-error hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Quiz"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="font-headline-sm text-[18px] font-bold text-on-surface">
                    {quiz.title}
                  </h3>
                  <p className="text-body-sm text-on-surface-variant leading-relaxed">
                    {quiz.description}
                  </p>

                  <div className="flex items-center gap-3 text-[12px] text-outline font-medium">
                    <span>Passing: {quiz.passingScore} pts</span>
                    <span>•</span>
                    <span>Total: {quiz.totalPoints} pts</span>
                    <span>•</span>
                    <span>Deadline: {new Date(quiz.deadline).toLocaleDateString()}</span>
                  </div>
                </div>

                {isTrainerOrAdmin ? (
                  <button
                    onClick={() => handleStartQuiz(quiz)}
                    type="button"
                    className="w-full py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm font-semibold border border-surface-container-high transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                    <span>Preview Questions</span>
                  </button>
                ) : attempt ? (
                  <div className="w-full py-3 px-4 rounded-xl bg-surface-container-high/60 border border-outline-variant/40 flex items-center justify-between text-body-sm">
                    <div className="flex items-center gap-2 text-on-surface-variant font-medium">
                      <span className="material-symbols-outlined text-emerald-600 text-[20px]">
                        verified
                      </span>
                      <span>Completed • Single Attempt Used</span>
                    </div>
                    <span className="text-[12px] font-bold text-on-surface">
                      {attempt.totalScore} / {quiz.totalPoints} pts ({attempt.percentage}%)
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleStartQuiz(quiz)}
                    type="button"
                    className="w-full py-3 rounded-xl bg-primary text-on-primary font-body-sm font-semibold hover:bg-primary-container shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                    <span>Start Assessment</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Interactive Exam Modal for Taking Quiz or Previewing for Trainers */}
      {activeQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl bg-surface-container-lowest shadow-2xl p-6 flex flex-col gap-5 overflow-y-auto border border-surface-container-high">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <div className="flex flex-col">
                <h3 className="font-headline-sm text-[18px] font-bold text-on-surface">
                  {activeQuiz.title}
                </h3>
                <span className="text-[12px] text-primary font-semibold">
                  {isTrainerOrAdmin ? 'Faculty Review & Question Inspection (Read-Only Preview)' : 'Server-Timed Assessment Window'}
                </span>
              </div>
              <button
                onClick={() => setActiveQuiz(null)}
                className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {quizResult ? (
              (() => {
                const pct = quizResult.percentage ?? 0;
                let feedbackTitle = quizResult.feedbackTitle || '';
                let feedbackMessage = quizResult.feedbackMessage || '';
                let icon = 'emoji_events';
                let iconColor = 'bg-emerald-100 text-emerald-700';

                if (pct >= 100) {
                  feedbackTitle = 'Outstanding! Perfect Score! 🏆';
                  feedbackMessage = 'Excellent work! You answered every question correctly with 100% accuracy!';
                  icon = 'military_tech';
                  iconColor = 'bg-amber-100 text-amber-800';
                } else if (pct >= 80) {
                  feedbackTitle = 'Great Job! Excellent Performance! 🌟';
                  feedbackMessage = 'Great work! You scored exceptionally well and demonstrated strong understanding.';
                  icon = 'emoji_events';
                  iconColor = 'bg-emerald-100 text-emerald-700';
                } else if (pct >= 60) {
                  feedbackTitle = 'Good Effort! Well Done! 👍';
                  feedbackMessage = 'Good job! You passed the assessment. Keep studying to reach the top tier.';
                  icon = 'thumb_up';
                  iconColor = 'bg-blue-100 text-blue-700';
                } else if (pct >= 40) {
                  feedbackTitle = 'Nice Try! Keep Practicing! 📚';
                  feedbackMessage = 'Nice try! You gave a fair attempt. Review the lecture notes and practice to score higher next time.';
                  icon = 'auto_stories';
                  iconColor = 'bg-amber-100 text-amber-700';
                } else {
                  feedbackTitle = 'Work Hard Next Time! 💪';
                  feedbackMessage = 'Work hard next time! Don’t worry, review the study materials and discuss with your trainer.';
                  icon = 'fitness_center';
                  iconColor = 'bg-rose-100 text-rose-700';
                }

                return (
                  <div className="flex flex-col items-center text-center py-6 gap-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${iconColor}`}>
                      <span className="material-symbols-outlined text-[36px]">{icon}</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <h4 className="font-headline-sm text-[22px] font-bold text-on-surface">
                        {feedbackTitle}
                      </h4>
                      <p className="text-body-md text-on-surface-variant max-w-md">
                        {feedbackMessage}
                      </p>
                      <div className="mt-2 inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-xl bg-surface-container-high/60 text-body-sm font-semibold text-on-surface">
                        <span>Score: <strong>{quizResult.score} / {quizResult.maxPoints} pts</strong></span>
                        <span>•</span>
                        <span className="text-primary font-bold">{pct}%</span>
                        <span>•</span>
                        <span className={pct >= 60 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                          {pct >= 60 ? 'PASSED' : 'NEEDS REVISION'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveQuiz(null)}
                      className="mt-2 px-6 py-2.5 rounded-xl bg-primary text-on-primary font-medium text-body-sm hover:bg-primary-container transition-colors cursor-pointer"
                    >
                      Return to Quizzes
                    </button>
                  </div>
                );
              })()
            ) : (
              <div className="flex flex-col gap-6">
                {questions.map((q, idx) => (
                  <div key={q._id} className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/40 flex flex-col gap-3">
                    <div className="flex items-start gap-2">
                      <span className="w-6 h-6 rounded-md bg-primary-container text-on-primary-container text-[12px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <p className="font-body-md font-semibold text-on-surface leading-snug">
                        {q.prompt}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 pl-8">
                      {q.options.map((opt: string, optIdx: number) => {
                        const isSelected = selectedAnswers[q._id] === optIdx;
                        return (
                          <label
                            key={optIdx}
                            onClick={() => !isTrainerOrAdmin && handleSelectOption(q._id, optIdx)}
                            className={`p-2.5 rounded-lg border text-body-sm flex items-center gap-3 transition-all ${
                              isTrainerOrAdmin
                                ? 'bg-surface-container-lowest border-surface-container-high text-on-surface cursor-default'
                                : isSelected
                                ? 'bg-primary-fixed/30 border-primary text-on-surface font-semibold cursor-pointer'
                                : 'bg-surface-container-lowest border-surface-container-high text-on-surface hover:bg-surface-container cursor-pointer'
                            }`}
                          >
                            {!isTrainerOrAdmin && (
                              <input
                                type="radio"
                                name={`q_${q._id}`}
                                checked={isSelected}
                                onChange={() => handleSelectOption(q._id, optIdx)}
                                className="text-primary focus:ring-primary"
                              />
                            )}
                            <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-surface-container text-outline mr-1">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-3 pt-2">
                  {isTrainerOrAdmin ? (
                    <button
                      onClick={() => setActiveQuiz(null)}
                      type="button"
                      className="w-full py-2.5 rounded-xl bg-surface-container-high text-on-surface font-semibold text-body-sm hover:bg-surface-container-highest transition-colors cursor-pointer"
                    >
                      Close Faculty Preview
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleSubmitQuiz}
                        disabled={isSubmitting || Object.keys(selectedAnswers).length === 0}
                        type="button"
                        className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-medium text-body-sm hover:bg-primary-container transition-colors disabled:opacity-50 cursor-pointer shadow-xs flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">send</span>
                        <span>{isSubmitting ? 'Evaluating Assessment...' : 'Submit Assessment for Grading'}</span>
                      </button>
                      <button
                        onClick={() => setActiveQuiz(null)}
                        type="button"
                        className="px-4 py-3 rounded-xl bg-surface-container text-on-surface text-body-sm hover:bg-surface-container-high cursor-pointer"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trainer Create Quiz Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/50 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-2xl bg-surface-container-lowest shadow-2xl p-6 flex flex-col gap-5 border border-surface-container-high max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Evaluation Authority
                </span>
                <h3 className="font-headline-sm text-[18px] text-on-surface font-bold">
                  Create Objective Quiz / Test
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateQuiz} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">
                  Quiz Title <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Node.js Streams & Event Loop Mastery Quiz"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">
                  Instructions / Description <span className="text-error">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Briefly state topics covered and guidelines..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Duration (Mins)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={createForm.durationMinutes}
                    onChange={(e) => setCreateForm({ ...createForm, durationMinutes: Number(e.target.value) })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Passing Score</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={createForm.passingScore}
                    onChange={(e) => setCreateForm({ ...createForm, passingScore: Number(e.target.value) })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Deadline</label>
                  <input
                    type="date"
                    required
                    value={createForm.deadline}
                    onChange={(e) => setCreateForm({ ...createForm, deadline: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Target Cohort Batch</label>
                  <select
                    value={createForm.batchId}
                    onChange={(e) => {
                      const sel = batches.find((b) => b._id === e.target.value);
                      setCreateForm({
                        ...createForm,
                        batchId: e.target.value,
                        courseId: sel?.course?._id || createForm.courseId,
                      });
                    }}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {batches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name} ({b.batchCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Associated Course</label>
                  <select
                    value={createForm.courseId}
                    onChange={(e) => setCreateForm({ ...createForm, courseId: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {courses.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Questions Section */}
              <div className="flex flex-col gap-3 pt-3 border-t border-surface-container-high">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[14px] text-on-surface">
                    Assessment Questions ({draftQuestions.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddQuestionDraft}
                    className="px-3 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary text-[12px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>Add Question</span>
                  </button>
                </div>

                {draftQuestions.map((dq, qIdx) => (
                  <div key={qIdx} className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high/60 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold text-primary">Question {qIdx + 1}</span>
                      {draftQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestionDraft(qIdx)}
                          className="text-error hover:underline text-[11px] font-semibold cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      required
                      placeholder={`e.g. Which method handles stream backpressure in Node.js?`}
                      value={dq.prompt}
                      onChange={(e) => {
                        const updated = [...draftQuestions];
                        updated[qIdx].prompt = e.target.value;
                        setDraftQuestions(updated);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-surface-container-high bg-surface-container-lowest text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />

                    <span className="text-[11px] text-outline font-semibold">Options &amp; Correct Answer:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {dq.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct_${qIdx}`}
                            checked={dq.correctOptionIndex === optIdx}
                            onChange={() => {
                              const updated = [...draftQuestions];
                              updated[qIdx].correctOptionIndex = optIdx;
                              setDraftQuestions(updated);
                            }}
                            className="text-primary focus:ring-primary cursor-pointer"
                            title="Select as correct option"
                          />
                          <input
                            type="text"
                            required
                            placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                            value={opt}
                            onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                            className="flex-1 px-2.5 py-1 rounded-lg border border-surface-container-high bg-surface-container-lowest text-[12px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container-high">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-body-sm font-semibold hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingQuiz}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">publish</span>
                  <span>{isCreatingQuiz ? 'Publishing...' : 'Publish Quiz'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
