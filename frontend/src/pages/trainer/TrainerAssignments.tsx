import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export const TrainerAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [trainerData, setTrainerData] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'assignments' | 'grading'>('assignments');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Grading Modal State
  const [gradingSubmission, setGradingSubmission] = useState<any | null>(null);
  const [gradingScore, setGradingScore] = useState<number>(20);
  const [mentorFeedback, setMentorFeedback] = useState<string>('');
  const [isGrading, setIsGrading] = useState<boolean>(false);

  // New Assignment Form State
  const [form, setForm] = useState({
    title: '',
    moduleLabel: '',
    description: '',
    batchId: '',
    courseId: '',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    totalPoints: 20,
    githubTemplateUrl: '',
  });

  const fetchData = async () => {
    try {
      const [assignRes, trainerRes, batchesRes, coursesRes] = await Promise.all([
        api.get('/assignments'),
        api.get('/trainers/dashboard'),
        api.get('/courses/batches'),
        api.get('/courses/courses'),
      ]);

      if (assignRes.data.success) setAssignments(assignRes.data.assignments);
      if (trainerRes.data.success) setTrainerData(trainerRes.data.data);
      if (batchesRes.data.success) {
        setBatches(batchesRes.data.batches);
        if (batchesRes.data.batches.length > 0) {
          setForm((prev) => ({
            ...prev,
            batchId: batchesRes.data.batches[0]._id,
            courseId: batchesRes.data.batches[0].course?._id || '',
          }));
        }
      }
      if (coursesRes.data.success) setCourses(coursesRes.data.courses);
    } catch (err) {
      console.error('Failed to load trainer assignments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.post('/assignments', form);
      if (res.data.success) {
        alert(`Practical assignment "${form.title}" published!`);
        setShowCreateModal(false);
        setForm({
          title: '',
          moduleLabel: '',
          description: '',
          batchId: batches[0]?._id || '',
          courseId: courses[0]?._id || '',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          totalPoints: 20,
          githubTemplateUrl: '',
        });
        fetchData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete assignment "${title}"? This will also remove student submissions.`)) return;
    try {
      const res = await api.delete(`/assignments/${id}`);
      if (res.data.success) {
        setAssignments((prev) => prev.filter((a) => (a._id || a.id) !== id));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete assignment');
    }
  };

  const handleOpenGrading = (sub: any) => {
    setGradingSubmission(sub);
    setGradingScore(sub.assignment?.totalPoints ? Math.round(sub.assignment.totalPoints * 0.9) : 22);
    setMentorFeedback(
      sub.mentorFeedback ||
        'Excellent modular code architecture and error handling. Good test coverage.'
    );
  };

  const handleSubmitGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission) return;
    setIsGrading(true);
    try {
      const res = await api.patch(`/assignments/submissions/${gradingSubmission._id}/grade`, {
        score: Number(gradingScore),
        mentorFeedback,
      });
      if (res.data.success) {
        alert('Score & Mentor Feedback successfully recorded!');
        setGradingSubmission(null);
        fetchData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to grade submission.');
    } finally {
      setIsGrading(false);
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
            Loading practical evaluations and submissions...
          </span>
        </div>
      </div>
    );
  }

  const submissionsToGrade = trainerData?.pendingSubmissions || [];

  return (
    <div className="flex flex-col w-full pb-16 pt-6 gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed/50 text-secondary text-[11px] font-bold uppercase tracking-wider">
              Trainer Evaluation Authority
            </span>
            <span className="text-[12px] text-outline">• Continuous Assessment</span>
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface font-bold mt-1">
            Practical Assignments &amp; Grading
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Create hands-on lab problems, inspect student GitHub repositories, and assign scores with mentor feedback
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          type="button"
          className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-body-sm font-semibold hover:bg-primary-container shadow-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add_task</span>
          <span>Create Assignment</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-surface-container-high/60">
        <button
          onClick={() => setActiveTab('assignments')}
          className={`pb-3 px-3 text-body-md font-bold transition-all relative cursor-pointer ${
            activeTab === 'assignments'
              ? 'text-primary'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span>Curriculum Assignments ({assignments.length})</span>
          {activeTab === 'assignments' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('grading')}
          className={`pb-3 px-3 text-body-md font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'grading'
              ? 'text-primary'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span>Student Submissions to Grade</span>
          {submissionsToGrade.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
              {submissionsToGrade.length} pending
            </span>
          )}
          {activeTab === 'grading' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"></span>
          )}
        </button>
      </div>

      {/* Tab Content: Assignments List */}
      {activeTab === 'assignments' && (
        <>
          {assignments.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-surface-container-lowest border border-dashed border-outline-variant/60 shadow-xs flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[32px]">assignment_add</span>
              </div>
              <h3 className="font-headline-sm text-[18px] text-on-surface font-bold">
                No Assignments Created Yet
              </h3>
              <p className="text-body-sm text-on-surface-variant max-w-md">
                Your practical lab queue is clean. Create a new problem statement to assign it to your student cohort.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-body-sm font-semibold hover:bg-primary-container shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add_task</span>
                <span>Create First Assignment</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {assignments.map((item) => {
                const assignmentId = item._id || item.id;
                return (
                  <div
                    key={assignmentId}
                    className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-primary-fixed/30 text-primary shrink-0">
                        <span className="material-symbols-outlined text-[24px]">code</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-headline-sm text-[17px] font-bold text-on-surface">
                            {item.title}
                          </h3>
                          {item.moduleLabel && (
                            <span className="px-2 py-0.5 rounded-md font-label-sm text-[11px] font-bold bg-primary-fixed/40 text-primary">
                              {item.moduleLabel}
                            </span>
                          )}
                        </div>
                        <p className="text-body-sm text-on-surface-variant leading-relaxed">
                          {item.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-[12px] text-on-surface-variant font-medium">
                          <span className="flex items-center gap-1 text-outline">
                            <span className="material-symbols-outlined text-[16px]">event</span>
                            <span>Due Date: {new Date(item.dueDate).toLocaleDateString()}</span>
                          </span>
                          <span>•</span>
                          <span className="font-bold text-on-surface">Max Points: {item.totalPoints} pts</span>
                          {item.githubTemplateUrl && (
                            <>
                              <span>•</span>
                              <a
                                href={item.githubTemplateUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[14px]">link</span>
                                <span>Starter Repo</span>
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                      <button
                        onClick={() => setActiveTab('grading')}
                        type="button"
                        className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">rule</span>
                        <span>View Submissions</span>
                      </button>
                      <button
                        onClick={() => handleDeleteAssignment(assignmentId, item.title)}
                        type="button"
                        className="p-2 rounded-xl text-outline hover:text-error hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Assignment"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tab Content: Submissions to Grade */}
      {activeTab === 'grading' && (
        <div className="flex flex-col gap-4">
          {submissionsToGrade.length === 0 ? (
            <div className="p-12 rounded-2xl bg-surface-container-lowest border border-surface-container-high/40 text-center flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-[48px] text-emerald-600">task_alt</span>
              <h4 className="font-headline-sm text-[18px] text-on-surface font-bold">
                All Submissions Graded!
              </h4>
              <p className="text-body-sm text-on-surface-variant max-w-md">
                There are no pending submissions awaiting mentor review at this moment.
              </p>
            </div>
          ) : (
            submissionsToGrade.map((sub: any) => (
              <div
                key={sub._id}
                className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                    <span className="material-symbols-outlined text-[24px]">pending_actions</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-on-surface text-[16px]">
                        {sub.student?.user?.name || 'Student'} ({sub.student?.studentId || 'NPC-2025'})
                      </h4>
                      <span className="px-2 py-0.5 rounded-full font-label-sm text-[10px] font-bold bg-amber-100 text-amber-800">
                        {sub.status}
                      </span>
                    </div>

                    <span className="text-[13px] font-semibold text-primary">
                      Assignment: {sub.assignment?.title || 'Practical Lab'}
                    </span>

                    {sub.notes && (
                      <p className="text-body-sm text-on-surface-variant italic">
                        "{sub.notes}"
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[12px] text-on-surface-variant">
                      <span className="text-outline">
                        Submitted: {new Date(sub.submittedAt).toLocaleString()}
                      </span>
                      {sub.githubRepoUrl && (
                        <>
                          <span>•</span>
                          <a
                            href={sub.githubRepoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary font-bold hover:underline flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[15px]">code</span>
                            <span>Inspect GitHub Code</span>
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 self-end md:self-center">
                  <button
                    onClick={() => handleOpenGrading(sub)}
                    type="button"
                    className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-body-sm font-semibold hover:bg-primary-container shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">grade</span>
                    <span>Grade Work</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/50 backdrop-blur-xs">
          <div className="relative w-full max-w-xl rounded-2xl bg-surface-container-lowest shadow-2xl p-6 flex flex-col gap-5 border border-surface-container-high max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Trainer Authority
                </span>
                <h3 className="font-headline-sm text-[18px] text-on-surface font-bold">
                  Create Practical Lab Assignment
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">
                  Assignment Title <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MongoDB Aggregation Pipeline & JWT Security"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Curriculum Module <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.moduleLabel}
                    onChange={(e) => setForm({ ...form, moduleLabel: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Total Maximum Points <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={form.totalPoints}
                    onChange={(e) => setForm({ ...form, totalPoints: Number(e.target.value) })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">
                  Problem Description &amp; Lab Guidelines <span className="text-error">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide detailed instructions, edge cases to handle, and expected API endpoints..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Due Date <span className="text-error">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Target Cohort Batch <span className="text-error">*</span>
                  </label>
                  <select
                    value={form.batchId}
                    onChange={(e) => {
                      const sel = batches.find((b) => b._id === e.target.value);
                      setForm({
                        ...form,
                        batchId: e.target.value,
                        courseId: sel?.course?._id || form.courseId,
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
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">
                  Starter Template GitHub URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/naprocs-center/starter-repo"
                  value={form.githubTemplateUrl}
                  onChange={(e) => setForm({ ...form, githubTemplateUrl: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-container-high">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-body-sm font-semibold hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">publish</span>
                  <span>{isSubmitting ? 'Publishing...' : 'Publish to Students'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grading Modal */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-surface-container-lowest shadow-2xl p-6 flex flex-col gap-5 border border-surface-container-high">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  Mentor Evaluation
                </span>
                <h3 className="font-headline-sm text-[18px] text-on-surface font-bold">
                  Grade Student Submission
                </h3>
              </div>
              <button
                onClick={() => setGradingSubmission(null)}
                className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-surface-container-low flex flex-col gap-1.5 text-body-sm">
              <span className="font-bold text-on-surface">
                {gradingSubmission.student?.user?.name} ({gradingSubmission.student?.studentId})
              </span>
              <span className="text-[12px] text-primary font-semibold">
                {gradingSubmission.assignment?.title}
              </span>
              {gradingSubmission.githubRepoUrl && (
                <a
                  href={gradingSubmission.githubRepoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[12px] text-primary hover:underline flex items-center gap-1 font-mono pt-1"
                >
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  <span>{gradingSubmission.githubRepoUrl}</span>
                </a>
              )}
            </div>

            <form onSubmit={handleSubmitGrade} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">
                  Score (Max: {gradingSubmission.assignment?.totalPoints || 25} points) <span className="text-error">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max={gradingSubmission.assignment?.totalPoints || 25}
                  value={gradingScore}
                  onChange={(e) => setGradingScore(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">
                  Mentor Feedback &amp; Constructive Remarks <span className="text-error">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide specific feedback on code readability, architectural choices, and test cases..."
                  value={mentorFeedback}
                  onChange={(e) => setMentorFeedback(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-container-high">
                <button
                  type="button"
                  onClick={() => setGradingSubmission(null)}
                  className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-body-sm font-semibold hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGrading}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>{isGrading ? 'Saving Grade...' : 'Submit Grade & Feedback'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
