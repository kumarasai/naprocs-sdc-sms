import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export const AssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeModal, setActiveModal] = useState<any | null>(null);
  const [githubUrl, setGithubUrl] = useState<string>('');
  const [demoUrl, setDemoUrl] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchAssignments = async () => {
    try {
      const res = await api.get('/assignments');
      if (res.data.success) {
        setAssignments(res.data.assignments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleOpenSubmit = (assignment: any) => {
    setActiveModal(assignment);
    setGithubUrl(assignment.submission?.githubRepoUrl || '');
    setDemoUrl(assignment.submission?.liveDemoUrl || '');
    setNotes(assignment.submission?.notes || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModal || !githubUrl) return;

    setIsSubmitting(true);
    try {
      const res = await api.post(`/assignments/${activeModal.id}/submit`, {
        githubRepoUrl: githubUrl,
        liveDemoUrl: demoUrl,
        notes,
      });

      if (res.data.success) {
        alert('Assignment successfully submitted for mentor grading!');
        setActiveModal(null);
        fetchAssignments();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit assignment.');
    } finally {
      setIsSubmitting(false);
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
            Loading practical evaluations...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-16 pt-6 gap-6">
      <div>
        <h1 className="font-headline-md text-headline-md text-on-surface font-bold">
          Assignments &amp; Hands-on Tasks
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Continuous evaluations • Submit GitHub repositories and view mentor feedback
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {assignments.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-surface-container-lowest border border-surface-container-high/40 shadow-xs flex flex-col items-center justify-center gap-3">
            <div className="p-4 rounded-full bg-surface-container text-outline">
              <span className="material-symbols-outlined text-[36px]">assignment_turned_in</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">No Assignments Posted</h3>
            <p className="text-body-sm text-outline max-w-md">
              There are currently no active assignments or homework exercises published for your cohort.
            </p>
          </div>
        ) : (
          assignments.map((item) => {
          const sub = item.submission;
          const isGraded = sub?.status === 'GRADED';
          const isPending = !sub;

          return (
            <div
              key={item.id}
              className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`p-3 rounded-xl shrink-0 ${
                    isGraded
                      ? 'bg-emerald-100 text-emerald-700'
                      : isPending
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-primary-fixed text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[24px]">
                    {isGraded ? 'check_circle' : isPending ? 'pending_actions' : 'cloud_done'}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline-sm text-[17px] font-bold text-on-surface">
                      {item.title}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-md font-label-sm text-[11px] font-bold ${
                        isGraded
                          ? 'bg-emerald-100 text-emerald-800'
                          : isPending
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-primary-fixed text-primary'
                      }`}
                    >
                      {sub?.status || 'Pending'}
                    </span>
                  </div>

                  <p className="text-body-sm text-on-surface-variant leading-relaxed">
                    {item.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[12px] text-on-surface-variant">
                    <span className="font-semibold text-primary">{item.moduleLabel}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-outline">
                      <span className="material-symbols-outlined text-[16px]">event</span>
                      <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                    </span>
                    <span>•</span>
                    <span className="font-bold text-on-surface">Max: {item.totalPoints} pts</span>
                  </div>

                  {/* Mentor Feedback Box if Graded */}
                  {isGraded && sub.mentorFeedback && (
                    <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-body-sm text-emerald-900">
                      <span className="font-bold">Mentor Feedback: </span>
                      <span className="italic">"{sub.mentorFeedback}"</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                {isGraded && (
                  <div className="px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-tabular-data text-[15px] font-bold">
                    {sub.score} / {item.totalPoints} pts
                  </div>
                )}

                {item.githubTemplateUrl && (
                  <a
                    href={item.githubTemplateUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-body-sm font-semibold transition-colors flex items-center gap-1.5 border border-surface-container-high/40"
                  >
                    <span className="material-symbols-outlined text-[16px]">terminal</span>
                    <span>Starter Repo</span>
                  </a>
                )}

                <button
                  onClick={() => handleOpenSubmit(item)}
                  type="button"
                  className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-body-sm font-semibold hover:bg-primary-container shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {sub ? 'update' : 'cloud_upload'}
                  </span>
                  <span>{sub ? 'Update Work' : 'Submit Work'}</span>
                </button>
              </div>
            </div>
          );
        })
      )}
      </div>

      {/* Submission Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-surface-container-lowest shadow-2xl p-6 flex flex-col gap-4 border border-surface-container-high">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
              <h4 className="font-headline-sm text-[18px] text-on-surface font-bold">
                Submit Practical Assignment
              </h4>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-body-sm text-on-surface-variant font-medium">
              {activeModal.title}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">
                  GitHub Repository URL <span className="text-error">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://github.com/username/project"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">
                  Live Hosted URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://my-app.render.com"
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">
                  Implementation Notes for Trainer
                </label>
                <textarea
                  rows={3}
                  placeholder="Mention tested edge cases, performance benchmarks, or questions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !githubUrl}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-medium text-body-sm hover:bg-primary-container transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Submitting...' : 'Confirm Submission'}
                </button>
                <button
                  onClick={() => setActiveModal(null)}
                  type="button"
                  className="px-4 py-2.5 rounded-xl bg-surface-container text-on-surface text-body-sm hover:bg-surface-container-high cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
