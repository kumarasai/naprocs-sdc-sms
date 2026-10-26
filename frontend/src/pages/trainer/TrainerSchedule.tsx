import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export const TrainerSchedule: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showPlanModal, setShowPlanModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Tomorrow Plan Form State
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [planForm, setPlanForm] = useState({
    batchId: '',
    courseId: '',
    topicTitle: '',
    moduleLabel: '',
    description: '',
    sessionDate: tomorrowStr,
    startTime: '',
    endTime: '',
    classroom: '',
    roomNumber: '',
  });

  const fetchData = async () => {
    try {
      const [sessionsRes, batchesRes, coursesRes] = await Promise.all([
        api.get('/courses/classes'),
        api.get('/courses/batches'),
        api.get('/courses/courses'),
      ]);

      if (sessionsRes.data.success) setSessions(sessionsRes.data.sessions);
      if (batchesRes.data.success) {
        setBatches(batchesRes.data.batches);
        if (batchesRes.data.batches.length > 0) {
          setPlanForm((prev) => ({
            ...prev,
            batchId: batchesRes.data.batches[0]._id,
            courseId: batchesRes.data.batches[0].course?._id || '',
          }));
        }
      }
      if (coursesRes.data.success) setCourses(coursesRes.data.courses);
    } catch (err) {
      console.error('Failed to load trainer schedule:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePublishPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.post('/courses/classes', planForm);
      if (res.data.success) {
        alert("Tomorrow's Class Plan published! All enrolled students will now see this on their Timetable & Dashboard.");
        setShowPlanModal(false);
        fetchData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to publish tomorrow's plan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSession = async (id: string, topic: string) => {
    if (!window.confirm(`Are you sure you want to delete session "${topic}"?`)) return;
    try {
      const res = await api.delete(`/courses/classes/${id}`);
      if (res.data.success) {
        setSessions((prev) => prev.filter((s) => s._id !== id));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete class session');
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
            Loading class schedules &amp; lesson plans...
          </span>
        </div>
      </div>
    );
  }

  // Find next scheduled session (Tomorrow's plan)
  const tomorrowPlan = sessions.find((s) => s.status === 'SCHEDULED');

  return (
    <div className="flex flex-col w-full pb-16 pt-6 gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed/50 text-secondary text-[11px] font-bold uppercase tracking-wider">
              Trainer Curriculum Authority
            </span>
            <span className="text-[12px] text-outline">• Lesson &amp; Lab Planner</span>
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface font-bold mt-1">
            Class Schedule &amp; Tomorrow's Plan
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Set upcoming class topics, prep notes, classroom allocations and give tomorrow's lesson plan to students
          </p>
        </div>

        <button
          onClick={() => setShowPlanModal(true)}
          type="button"
          className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-body-sm font-semibold hover:bg-primary-container shadow-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">edit_calendar</span>
          <span>Publish Tomorrow's Plan</span>
        </button>
      </div>

      {/* Tomorrow's Plan Spotlight Card */}
      {tomorrowPlan ? (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-primary-fixed/20 to-surface-container-low border border-primary/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-primary text-on-primary shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[28px]">next_plan</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-primary text-on-primary font-label-sm text-[11px] font-bold tracking-wide">
                  TOMORROW'S PLAN FOR STUDENTS
                </span>
                <span className="text-[12px] font-mono text-outline font-semibold">
                  {new Date(tomorrowPlan.sessionDate).toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <h3 className="font-headline-sm text-[18px] text-on-surface font-bold">
                {tomorrowPlan.topicTitle}
              </h3>
              <p className="text-body-sm text-on-surface-variant max-w-2xl leading-relaxed">
                {tomorrowPlan.description}
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-1 text-[13px] text-on-surface-variant font-medium">
                <span className="flex items-center gap-1.5 text-primary font-bold">
                  <span className="material-symbols-outlined text-[16px]">menu_book</span>
                  <span>{tomorrowPlan.moduleLabel}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                  <span>{tomorrowPlan.startTime} - {tomorrowPlan.endTime}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 text-secondary font-bold">
                  <span className="material-symbols-outlined text-[16px]">meeting_room</span>
                  <span>
                    {tomorrowPlan.roomNumber
                      ? `${tomorrowPlan.roomNumber}${tomorrowPlan.classroom ? ` (${tomorrowPlan.classroom})` : ''}`
                      : (tomorrowPlan.classroom || 'Classroom TBA')}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3 self-end md:self-center">
            <span className="px-3 py-1.5 rounded-xl bg-surface-container-lowest text-on-surface border border-surface-container-high/60 text-[12px] font-semibold flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Published to Students</span>
            </span>
            <button
              onClick={() => handleDeleteSession(tomorrowPlan._id, tomorrowPlan.topicTitle)}
              type="button"
              className="p-1.5 text-outline hover:text-error hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Delete this plan"
            >
              <span className="material-symbols-outlined text-[20px]">delete</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-surface-container-lowest border border-dashed border-outline-variant/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[24px]">calendar_add_on</span>
            </div>
            <div>
              <h4 className="font-bold text-on-surface text-[15px]">No Class Plan Published for Tomorrow</h4>
              <p className="text-body-sm text-on-surface-variant">
                Schedule tomorrow's topic, laboratory agenda, and classroom so your students stay prepared.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPlanModal(true)}
            type="button"
            className="px-4 py-2 rounded-xl bg-primary text-on-primary font-body-sm font-semibold hover:bg-primary-container transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Publish Plan</span>
          </button>
        </div>
      )}

      {/* Cohort Schedule Timetable Grid */}
      <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex flex-col gap-5">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container-high/40">
          <div>
            <h3 className="font-headline-sm text-[17px] text-on-surface font-bold">
              Cohort Timetable &amp; Session History
            </h3>
            <p className="text-body-sm text-on-surface-variant">
              All scheduled, live, and completed class sessions for your assigned cohorts
            </p>
          </div>
          <span className="text-label-sm text-primary font-bold">
            Total Sessions: {sessions.length}
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-surface-container-low/40 border border-surface-container-high/40 flex flex-col items-center justify-center gap-3">
            <div className="p-3.5 rounded-full bg-surface-container text-outline">
              <span className="material-symbols-outlined text-[32px]">calendar_month</span>
            </div>
            <h4 className="font-headline-sm text-[16px] text-on-surface font-bold">No Scheduled Sessions Yet</h4>
            <p className="text-body-sm text-outline max-w-md">
              No class sessions have been scheduled for your batches. Click "+ Publish Tomorrow's Plan" to schedule a session.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((sess) => {
              const isLive = sess.status === 'LIVE';
              const isCompleted = sess.status === 'COMPLETED';
              const isScheduled = sess.status === 'SCHEDULED';

              return (
                <div
                  key={sess._id}
                  className={`p-5 rounded-2xl flex flex-col justify-between gap-4 border transition-all ${
                    isLive
                      ? 'bg-primary-fixed/20 border-primary shadow-xs'
                      : isScheduled
                      ? 'bg-surface-container-lowest border-primary/40 shadow-xs'
                      : 'bg-surface-container-low border-surface-container-high/40 opacity-80'
                  }`}
                >
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[12px] text-outline font-semibold">
                        {new Date(sess.sessionDate).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-bold ${
                          isLive
                            ? 'bg-rose-100 text-rose-800 animate-pulse'
                            : isCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-primary-fixed text-primary'
                        }`}
                      >
                        {isLive ? 'LIVE NOW' : sess.status}
                      </span>
                    </div>

                    <h4 className="text-[16px] font-bold text-on-surface leading-snug">
                      {sess.topicTitle}
                    </h4>
                    <span className="text-[12px] font-semibold text-primary">
                      {sess.moduleLabel}
                    </span>
                    {sess.description && (
                      <p className="text-[12px] text-on-surface-variant line-clamp-2 leading-relaxed">
                        {sess.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-surface-container-high/40 flex items-center justify-between text-[12px] text-on-surface-variant font-medium">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                      <span>{sess.startTime} - {sess.endTime}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-secondary">meeting_room</span>
                        <span>{sess.roomNumber || sess.classroom || 'Classroom TBA'}</span>
                      </span>
                      <button
                        onClick={() => handleDeleteSession(sess._id, sess.topicTitle)}
                        type="button"
                        className="p-1 text-outline hover:text-error hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete session"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Publish Tomorrow's Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/50 backdrop-blur-xs">
          <div className="relative w-full max-w-xl rounded-2xl bg-surface-container-lowest shadow-2xl p-6 flex flex-col gap-5 border border-surface-container-high max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Trainer Authority
                </span>
                <h3 className="font-headline-sm text-[18px] text-on-surface font-bold">
                  Publish Tomorrow's Class Plan
                </h3>
              </div>
              <button
                onClick={() => setShowPlanModal(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handlePublishPlan} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Target Batch <span className="text-error">*</span>
                  </label>
                  <select
                    value={planForm.batchId}
                    onChange={(e) => {
                      const sel = batches.find((b) => b._id === e.target.value);
                      setPlanForm({
                        ...planForm,
                        batchId: e.target.value,
                        courseId: sel?.course?._id || planForm.courseId,
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
                  <label className="text-label-sm font-semibold text-on-surface">
                    Curriculum Module <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={planForm.moduleLabel}
                    onChange={(e) => setPlanForm({ ...planForm, moduleLabel: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">
                  Class Topic Title <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={planForm.topicTitle}
                  onChange={(e) => setPlanForm({ ...planForm, topicTitle: e.target.value })}
                  placeholder="e.g. Express Routing, Middleware Pipeline & REST Best Practices"
                  className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">
                  Learning Objectives &amp; Pre-Class Prep for Students
                </label>
                <textarea
                  rows={3}
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  placeholder="Outline key concepts, hands-on lab exercises, and any required software..."
                  className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Session Date <span className="text-error">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={planForm.sessionDate}
                    onChange={(e) => setPlanForm({ ...planForm, sessionDate: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={planForm.startTime}
                    onChange={(e) => setPlanForm({ ...planForm, startTime: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    End Time
                  </label>
                  <input
                    type="text"
                    value={planForm.endTime}
                    onChange={(e) => setPlanForm({ ...planForm, endTime: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Classroom / Lab Venue
                  </label>
                  <input
                    type="text"
                    value={planForm.classroom}
                    onChange={(e) => setPlanForm({ ...planForm, classroom: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Room Number
                  </label>
                  <input
                    type="text"
                    value={planForm.roomNumber}
                    onChange={(e) => setPlanForm({ ...planForm, roomNumber: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-container-high">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-body-sm font-semibold hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  <span>{isSubmitting ? 'Publishing...' : 'Publish to Students'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
