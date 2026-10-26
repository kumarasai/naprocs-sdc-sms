import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export const AdminCourses: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [form, setForm] = useState({
    courseCode: '',
    title: '',
    category: 'Backend & Fullstack Engineering',
    durationWeeks: 12,
    description: '',
  });

  const fetchCourses = async () => {
    try {
      const res = await api.get('/courses/courses');
      if (res.data.success) {
        setCourses(res.data.courses);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.post('/courses/courses', form);
      if (res.data.success) {
        alert(`Course "${form.title}" created successfully!`);
        setShowModal(false);
        setForm({
          courseCode: '',
          title: '',
          category: 'Backend & Fullstack Engineering',
          durationWeeks: 12,
          description: '',
        });
        fetchCourses();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create course.');
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
            Loading courses and curriculum tracks...
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
              Institute Academic Catalog
            </span>
            <span className="text-[12px] text-outline">• Curriculum Authority</span>
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface font-bold mt-1">
            Courses &amp; Curriculum Tracks
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Define official course programs, curriculum modules, syllabus roadmaps, and durations
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          type="button"
          className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-body-sm font-semibold hover:bg-primary-container shadow-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Add New Course</span>
        </button>
      </div>

      {/* Courses Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {courses.map((course) => (
          <div
            key={course._id}
            className="p-6 rounded-3xl bg-surface-container-lowest border border-surface-container-high/40 shadow-xs flex flex-col justify-between gap-5 hover:shadow-md transition-all"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-primary-fixed/30 text-primary font-mono text-[11px] font-bold">
                  {course.courseCode || course.code}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  {course.status || 'ACTIVE'}
                </span>
              </div>

              <div>
                <h3 className="font-headline-sm text-[20px] text-on-surface font-bold">
                  {course.title || course.name}
                </h3>
                <span className="text-[12px] font-semibold text-primary">
                  {course.category || 'Software Engineering'}
                </span>
                <p className="text-body-sm text-on-surface-variant line-clamp-3 mt-2 leading-relaxed">
                  {course.description}
                </p>
              </div>

              <div className="flex items-center gap-4 pt-3 border-t border-surface-container-high/40 text-[13px] text-on-surface-variant font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                  <span>{course.durationWeeks || 12} Weeks</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-secondary">view_module</span>
                  <span>{course.modules?.length || 8} Modules</span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Course Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-surface-container-lowest shadow-2xl p-6 flex flex-col gap-5 border border-surface-container-high">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Admin Authority
                </span>
                <h3 className="font-headline-sm text-[18px] text-on-surface font-bold">
                  Create New Course Curriculum
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Course Code <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. REACT-NATIVE-101"
                    value={form.courseCode}
                    onChange={(e) => setForm({ ...form, courseCode: e.target.value.toUpperCase() })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Duration (Weeks)
                  </label>
                  <input
                    type="number"
                    value={form.durationWeeks}
                    onChange={(e) => setForm({ ...form, durationWeeks: Number(e.target.value) })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">
                  Course Title <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. React Native Mobile App Engineering"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">
                  Category Track
                </label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">
                  Course Description &amp; Objectives
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Summary of skills, tech stacks, and career outcomes..."
                  className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed"
                />
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
                  <span>{isSubmitting ? 'Creating...' : 'Create Course'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
