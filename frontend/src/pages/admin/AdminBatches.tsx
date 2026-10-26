import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export const AdminBatches: React.FC = () => {
  const [batches, setBatches] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [form, setForm] = useState({
    batchCode: '',
    name: '',
    courseId: '',
    trainerId: '',
    classroom: '',
    roomNumber: '',
    timing: '',
    startTime: '',
    endTime: '',
    cohortName: '',
  });

  const fetchData = async () => {
    try {
      const [batchesRes, coursesRes, trainersRes] = await Promise.all([
        api.get('/courses/batches'),
        api.get('/courses/courses'),
        api.get('/admin/trainers'),
      ]);

      if (batchesRes.data.success) setBatches(batchesRes.data.batches);
      if (coursesRes.data.success) {
        setCourses(coursesRes.data.courses);
        if (coursesRes.data.courses.length > 0) {
          setForm((prev) => ({ ...prev, courseId: coursesRes.data.courses[0]._id }));
        }
      }
      if (trainersRes.data.success) {
        setTrainers(trainersRes.data.trainers);
        if (trainersRes.data.trainers.length > 0) {
          setForm((prev) => ({ ...prev, trainerId: trainersRes.data.trainers[0].userId || trainersRes.data.trainers[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to load batches:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.post('/admin/batches', form);
      if (res.data.success) {
        alert(`Batch "${form.name}" created successfully!`);
        setShowModal(false);
        setForm({
          batchCode: '',
          name: '',
          courseId: courses[0]?._id || '',
          trainerId: trainers[0]?.userId || trainers[0]?.id || '',
          classroom: '',
          roomNumber: '',
          timing: '',
          startTime: '',
          endTime: '',
          cohortName: '',
        });
        fetchData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create batch.');
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
            Loading cohorts and batches...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-16 pt-6 gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider">
              Institute Operations
            </span>
            <span className="text-[12px] text-outline">• Offline &amp; Hybrid Cohorts</span>
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface font-bold mt-1">
            Batches &amp; Classrooms
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Manage cohort schedules, assigned mentors, physical lab venues, and maximum seat capacities
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          type="button"
          className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-body-sm font-semibold hover:bg-primary-container shadow-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Create New Batch</span>
        </button>
      </div>

      {/* Batches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {batches.map((batch) => (
          <div
            key={batch._id}
            className="p-6 rounded-2xl bg-surface-container-lowest border border-surface-container-high/40 shadow-xs flex flex-col justify-between gap-5 hover:shadow-md transition-all"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-primary-fixed/30 text-primary font-mono text-[11px] font-bold">
                  {batch.batchCode}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  {batch.status || 'ACTIVE'}
                </span>
              </div>

              <div>
                <h3 className="font-headline-sm text-[18px] text-on-surface font-bold">
                  {batch.name}
                </h3>
                <p className="text-body-sm text-on-surface-variant line-clamp-1 mt-0.5">
                  {batch.cohortName || 'Offline Cohort'}
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-surface-container-high/40 text-[13px] text-on-surface-variant">
                {batch.timing && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">schedule</span>
                    <span className="font-medium text-on-surface">{batch.timing}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-secondary">meeting_room</span>
                  <span>{batch.classroom || 'Classroom TBA'}{batch.roomNumber ? ` (${batch.roomNumber})` : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-outline">group</span>
                  <span>Enrolled: <strong className="text-on-surface">{batch.enrolledStudentsCount || 0}</strong> / {batch.maxCapacity || 40} seats</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-surface-container-high/40 flex items-center justify-between">
              <span className="text-[12px] text-outline font-medium">
                {batch.course?.title || batch.course?.name || 'Assigned Course'}
              </span>
              <span className="text-[12px] text-primary font-semibold">
                Lead: {batch.trainer?.name || 'Dr. Sundaram'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Batch Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/50 backdrop-blur-xs">
          <div className="relative w-full max-w-xl rounded-2xl bg-surface-container-lowest shadow-2xl p-6 flex flex-col gap-5 border border-surface-container-high">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Admin Authority
                </span>
                <h3 className="font-headline-sm text-[18px] text-on-surface font-bold">
                  Create New Cohort Batch
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Batch Code <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NPC-NODE-B02"
                    value={form.batchCode}
                    onChange={(e) => setForm({ ...form, batchCode: e.target.value.toUpperCase() })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Batch Display Name <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Node.js Fullstack Batch 02"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Curriculum Course <span className="text-error">*</span>
                  </label>
                  <select
                    value={form.courseId}
                    onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {courses.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Assigned Lead Trainer <span className="text-error">*</span>
                  </label>
                  <select
                    value={form.trainerId}
                    onChange={(e) => setForm({ ...form, trainerId: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {trainers.map((t) => (
                      <option key={t.id} value={t.userId || t.id}>
                        {t.name} ({t.trainerId})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Classroom Venue
                  </label>
                  <input
                    type="text"
                    value={form.classroom}
                    onChange={(e) => setForm({ ...form, classroom: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Room Number
                  </label>
                  <input
                    type="text"
                    value={form.roomNumber}
                    onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Class Timing Slot
                  </label>
                  <input
                    type="text"
                    value={form.timing}
                    onChange={(e) => setForm({ ...form, timing: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Cohort Description
                  </label>
                  <input
                    type="text"
                    value={form.cohortName}
                    onChange={(e) => setForm({ ...form, cohortName: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-container-high">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-body-sm font-semibold hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">done</span>
                  <span>{isSubmitting ? 'Creating...' : 'Create Batch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
