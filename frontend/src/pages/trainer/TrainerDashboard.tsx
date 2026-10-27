import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { DEFAULT_AVATAR } from '../../utils/avatar';

export const TrainerDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals State
  const [showAssignmentModal, setShowAssignmentModal] = useState<boolean>(false);
  const [showPlanModal, setShowPlanModal] = useState<boolean>(false);
  const [showMaterialModal, setShowMaterialModal] = useState<boolean>(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState<boolean>(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);

  // Form States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Assignment Form
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    batchId: '',
    courseId: '',
    moduleLabel: '',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    totalPoints: 20,
    githubTemplateUrl: '',
  });

  // Class Plan Form
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [planForm, setPlanForm] = useState({
    topicTitle: '',
    description: '',
    batchId: '',
    courseId: '',
    moduleLabel: '',
    sessionDate: tomorrowStr,
    startTime: '',
    endTime: '',
    classroom: '',
    roomNumber: '',
  });

  // Material Form
  const [materialForm, setMaterialForm] = useState({
    title: '',
    description: '',
    courseId: '',
    moduleLabel: '',
    fileType: 'PDF',
    fileUrl: '',
    category: 'Lecture Notes',
  });

  // Announcement Form
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    description: '',
    priority: 'NORMAL',
    targetBatch: '',
  });

  // Grading State
  const [gradingScore, setGradingScore] = useState<number>(20);
  const [mentorFeedback, setMentorFeedback] = useState<string>('');

  const fetchTrainerData = async () => {
    try {
      const res = await api.get('/trainers/dashboard');
      if (res.data.success) {
        setData(res.data.data);
        const batches = res.data.data.batches || [];
        if (batches.length > 0) {
          const firstBatch = batches[0];
          setAssignmentForm((prev) => ({
            ...prev,
            batchId: firstBatch._id,
            courseId: firstBatch.course?._id || '',
          }));
          setPlanForm((prev) => ({
            ...prev,
            batchId: firstBatch._id,
            courseId: firstBatch.course?._id || '',
            classroom: firstBatch.classroom || '',
            roomNumber: firstBatch.roomNumber || '',
          }));
          setMaterialForm((prev) => ({
            ...prev,
            courseId: firstBatch.course?._id || '',
          }));
          setAnnouncementForm((prev) => ({
            ...prev,
            targetBatch: firstBatch._id,
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load trainer data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainerData();
  }, []);

  // Handlers
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.post('/assignments', assignmentForm);
      if (res.data.success) {
        alert(`Practical assignment "${assignmentForm.title}" published! It is now available on student dashboards.`);
        setShowAssignmentModal(false);
        setAssignmentForm((prev) => ({ ...prev, title: '', description: '', moduleLabel: '', githubTemplateUrl: '' }));
        fetchTrainerData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.post('/courses/classes', planForm);
      if (res.data.success) {
        alert(`Class session "${planForm.topicTitle}" scheduled! Published to student schedules.`);
        setShowPlanModal(false);
        setPlanForm((prev) => ({ ...prev, topicTitle: '', description: '', moduleLabel: '' }));
        fetchTrainerData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to schedule class session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.post('/communication/materials', materialForm);
      if (res.data.success) {
        alert(`Study material "${materialForm.title}" published to student repository!`);
        setShowMaterialModal(false);
        setMaterialForm((prev) => ({ ...prev, title: '', description: '', fileUrl: '' }));
        fetchTrainerData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload material.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.post('/communication/announcements', announcementForm);
      if (res.data.success) {
        alert(`Announcement "${announcementForm.title}" broadcasted to students!`);
        setShowAnnouncementModal(false);
        setAnnouncementForm((prev) => ({ ...prev, title: '', description: '' }));
        fetchTrainerData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to post announcement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;
    setIsSubmitting(true);
    try {
      const res = await api.patch(`/assignments/submissions/${selectedSubmission._id}/grade`, {
        score: Number(gradingScore),
        mentorFeedback,
      });
      if (res.data.success) {
        alert('Score and mentor feedback recorded!');
        setSelectedSubmission(null);
        fetchTrainerData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to grade submission.');
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
            Loading trainer command portal...
          </span>
        </div>
      </div>
    );
  }

  const batches = data?.batches || [];
  const sessions = data?.sessions || [];
  const pendingSubmissions = data?.pendingSubmissions || [];
  const stats = data?.stats || {
    batchesCount: batches.length,
    assignmentsCount: 0,
    pendingSubmissionsCount: pendingSubmissions.length,
    materialsCount: 0,
  };

  return (
    <div className="flex flex-col w-full pb-16 pt-6 gap-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-surface-container-low via-surface-container to-surface-variant border border-surface-container-high/40 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            alt="Trainer Avatar"
            className="w-16 h-16 rounded-2xl object-cover ring-2 ring-primary/20 shadow-xs bg-surface-container-high"
            src={DEFAULT_AVATAR}
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="font-headline-md text-headline-md text-on-surface font-bold">
                {data?.trainer?.name || 'Faculty Trainer'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[11px] font-bold uppercase tracking-wider">
                TRAINER FACULTY
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              {batches.length > 0
                ? `${batches.map((b: any) => b.name).join(', ')} • ${batches[0]?.classroom || 'Assigned Campus'}`
                : 'No cohort batches assigned yet'}
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowAssignmentModal(true)}
            type="button"
            className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary/90 transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add_task</span>
            <span>+ Assignment</span>
          </button>

          <button
            onClick={() => setShowPlanModal(true)}
            type="button"
            className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-body-sm font-semibold transition-all flex items-center gap-2 cursor-pointer border border-surface-container-high active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">edit_calendar</span>
            <span>+ Class Plan</span>
          </button>

          <button
            onClick={() => setShowMaterialModal(true)}
            type="button"
            className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-body-sm font-semibold transition-all flex items-center gap-2 cursor-pointer border border-surface-container-high active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            <span>+ Material</span>
          </button>

          <button
            onClick={() => setShowAnnouncementModal(true)}
            type="button"
            className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-body-sm font-semibold transition-all flex items-center gap-2 cursor-pointer border border-surface-container-high active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">campaign</span>
            <span>+ Notice</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Assigned Batches</span>
            <span className="text-[28px] font-bold text-on-surface mt-1 tabular-nums">{stats.batchesCount}</span>
            <span className="text-[12px] text-on-surface-variant mt-0.5">Active Cohorts</span>
          </div>
          <div className="p-3 rounded-2xl bg-primary-fixed/40 text-primary">
            <span className="material-symbols-outlined text-[26px]">groups</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Active Assignments</span>
            <span className="text-[28px] font-bold text-on-surface mt-1 tabular-nums">{stats.assignmentsCount}</span>
            <span className="text-[12px] text-on-surface-variant mt-0.5">Issued to students</span>
          </div>
          <div className="p-3 rounded-2xl bg-secondary-container/40 text-secondary">
            <span className="material-symbols-outlined text-[26px]">assignment</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Pending Submissions</span>
            <span className="text-[28px] font-bold text-amber-700 mt-1 tabular-nums">{stats.pendingSubmissionsCount}</span>
            <span className="text-[12px] text-on-surface-variant mt-0.5">Awaiting evaluation</span>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-700">
            <span className="material-symbols-outlined text-[26px]">pending_actions</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Study Materials</span>
            <span className="text-[28px] font-bold text-on-surface mt-1 tabular-nums">{stats.materialsCount}</span>
            <span className="text-[12px] text-on-surface-variant mt-0.5">Uploaded resources</span>
          </div>
          <div className="p-3 rounded-2xl bg-tertiary-container/30 text-tertiary">
            <span className="material-symbols-outlined text-[26px]">folder_special</span>
          </div>
        </div>
      </div>

      {/* Main Content: 8 cols & 4 cols */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Batches & Scheduled Class Plans */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Assigned Cohorts Card */}
          <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-headline-sm text-[18px] text-on-surface font-bold">
                  Assigned Cohort Batches
                </h3>
                <p className="text-body-sm text-on-surface-variant">
                  Cohorts designated to you by the administration
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface font-label-sm text-[11px] font-semibold">
                {batches.length} Active
              </span>
            </div>

            {batches.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center justify-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-outline text-[32px]">school</span>
                <span className="font-body-md font-semibold text-on-surface">No batches assigned yet</span>
                <p className="font-body-sm text-outline max-w-sm">
                  The institute administrator has not assigned any active cohort batch to your account yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {batches.map((b: any) => (
                  <div
                    key={b._id}
                    className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/40 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col">
                        <span className="font-bold text-on-surface text-[15px]">{b.name}</span>
                        <span className="text-[12px] text-primary font-mono">{b.batchCode || 'CODE-TBA'}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-bold">
                        ACTIVE
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 text-[12px] text-on-surface-variant pt-2 border-t border-surface-container-high/40">
                      <div className="flex justify-between">
                        <span>Classroom:</span>
                        <span className="font-semibold text-on-surface">{b.classroom || 'Classroom TBA'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Schedule Timing:</span>
                        <span className="font-semibold text-on-surface">{b.timing || 'Schedule TBA'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Course:</span>
                        <span className="font-semibold text-on-surface">{b.course?.title || 'General Curriculum'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Class Plans Card */}
          <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-headline-sm text-[18px] text-on-surface font-bold">
                  Upcoming Class Topics &amp; Plans
                </h3>
                <p className="text-body-sm text-on-surface-variant">
                  Sessions and lesson objectives visible to enrolled students
                </p>
              </div>
              <Link
                to="/trainer/schedule"
                className="text-primary font-semibold text-label-sm hover:underline flex items-center gap-1"
              >
                <span>View Full Schedule</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>

            {sessions.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center justify-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-outline text-[32px]">calendar_today</span>
                <span className="font-body-md font-semibold text-on-surface">No upcoming class plans published</span>
                <p className="font-body-sm text-outline max-w-sm">
                  Click "+ Class Plan" to schedule tomorrow's lesson plan, topic, and notes for students.
                </p>
                <button
                  onClick={() => setShowPlanModal(true)}
                  type="button"
                  className="mt-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary/90 cursor-pointer"
                >
                  Publish Class Plan
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {sessions.map((sess: any) => (
                  <div
                    key={sess._id}
                    className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 rounded-xl bg-primary text-on-primary shrink-0">
                        <span className="material-symbols-outlined text-[20px]">event_note</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-on-surface text-[15px]">{sess.topicTitle}</span>
                        <div className="flex flex-wrap items-center gap-2 text-[12px] text-on-surface-variant mt-0.5">
                          <span className="font-semibold text-primary">{sess.moduleLabel}</span>
                          <span>•</span>
                          <span>{new Date(sess.sessionDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                          <span>•</span>
                          <span>{sess.startTime} – {sess.endTime}</span>
                          {sess.classroom && (
                            <>
                              <span>•</span>
                              <span>{sess.classroom}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Pending Submissions to Grade */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-700 text-[22px]">pending_actions</span>
                <h3 className="font-headline-sm text-[18px] text-on-surface font-bold">
                  Student Submissions
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold">
                {pendingSubmissions.length} Pending
              </span>
            </div>

            {pendingSubmissions.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-emerald-600 text-[36px]">check_circle</span>
                <span className="font-body-md font-semibold text-on-surface">All caught up!</span>
                <p className="font-body-sm text-outline max-w-xs">
                  There are no student submissions pending your review at this moment.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {pendingSubmissions.map((sub: any) => (
                  <div
                    key={sub._id}
                    className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high/30 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-on-surface text-[14px]">
                        {sub.user?.name || 'Student'}
                      </span>
                      <span className="text-[11px] text-outline font-mono">
                        {sub.student?.studentId || 'STUDENT'}
                      </span>
                    </div>
                    <span className="text-[12px] text-on-surface-variant truncate">
                      {sub.assignment?.title || 'Practical Assignment'}
                    </span>
                    {sub.githubRepoUrl && (
                      <a
                        href={sub.githubRepoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[12px] text-primary hover:underline flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">link</span>
                        <span className="truncate">{sub.githubRepoUrl}</span>
                      </a>
                    )}
                    <button
                      onClick={() => {
                        setSelectedSubmission(sub);
                        setGradingScore(sub.assignment?.totalPoints || 20);
                        setMentorFeedback('');
                      }}
                      type="button"
                      className="mt-1 w-full py-1.5 rounded-lg bg-primary text-on-primary text-[12px] font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
                    >
                      Grade &amp; Feedback
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Shortcuts */}
          <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex flex-col gap-3">
            <span className="text-label-sm font-bold text-outline uppercase tracking-wider">
              Faculty Shortcuts
            </span>
            <div className="flex flex-col gap-1.5 text-body-sm font-medium">
              <Link
                to="/trainer/assignments"
                className="p-2.5 rounded-xl hover:bg-surface-container-low text-on-surface flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary text-[20px]">assignment</span>
                  <span>Assignments &amp; Labs</span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-outline">arrow_forward</span>
              </Link>

              <Link
                to="/trainer/schedule"
                className="p-2.5 rounded-xl hover:bg-surface-container-low text-on-surface flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-secondary text-[20px]">calendar_month</span>
                  <span>Class Timetable &amp; Schedule</span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-outline">arrow_forward</span>
              </Link>

              <Link
                to="/quizzes"
                className="p-2.5 rounded-xl hover:bg-surface-container-low text-on-surface flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-tertiary text-[20px]">quiz</span>
                  <span>Quizzes &amp; Tests</span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-outline">arrow_forward</span>
              </Link>

              <Link
                to="/materials"
                className="p-2.5 rounded-xl hover:bg-surface-container-low text-on-surface flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary text-[20px]">folder_special</span>
                  <span>Course Study Materials</span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-outline">arrow_forward</span>
              </Link>

              <Link
                to="/announcements"
                className="p-2.5 rounded-xl hover:bg-surface-container-low text-on-surface flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-secondary text-[20px]">campaign</span>
                  <span>Circulars &amp; Notices</span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-outline">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE ASSIGNMENT MODAL */}
      {showAssignmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-surface-container-lowest shadow-2xl p-6 flex flex-col gap-4 border border-surface-container-high animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/40">
              <h3 className="font-headline-sm text-[18px] text-on-surface font-bold">
                Publish New Practical Assignment
              </h3>
              <button
                onClick={() => setShowAssignmentModal(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">Assignment Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Build REST API with Express and MongoDB"
                  value={assignmentForm.title}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Target Batch</label>
                  <select
                    required
                    value={assignmentForm.batchId}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, batchId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
                  >
                    {batches.map((b: any) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Module / Topic</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Module 3: REST Architecture"
                    value={assignmentForm.moduleLabel}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, moduleLabel: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">Description &amp; Task Objectives</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the problem statement, expected endpoints, validation criteria..."
                  value={assignmentForm.description}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Due Date</label>
                  <input
                    type="date"
                    required
                    value={assignmentForm.dueDate}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Max Points</label>
                  <input
                    type="number"
                    required
                    min={5}
                    max={100}
                    value={assignmentForm.totalPoints}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, totalPoints: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">Starter GitHub Repository (Optional)</label>
                <input
                  type="url"
                  placeholder="https://github.com/your-org/starter-repo"
                  value={assignmentForm.githubTemplateUrl}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, githubTemplateUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-body-sm hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish to Students'}
                </button>
                <button
                  onClick={() => setShowAssignmentModal(false)}
                  type="button"
                  className="px-4 py-2.5 rounded-xl bg-surface-container text-on-surface text-body-sm font-medium hover:bg-surface-container-high cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PUBLISH CLASS PLAN MODAL */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-surface-container-lowest shadow-2xl p-6 flex flex-col gap-4 border border-surface-container-high animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/40">
              <h3 className="font-headline-sm text-[18px] text-on-surface font-bold">
                Schedule Class Session &amp; Tomorrow's Plan
              </h3>
              <button
                onClick={() => setShowPlanModal(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handlePublishPlan} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">Class Topic Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Asynchronous Node.js, Event Loop & Streams"
                  value={planForm.topicTitle}
                  onChange={(e) => setPlanForm({ ...planForm, topicTitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Target Batch</label>
                  <select
                    required
                    value={planForm.batchId}
                    onChange={(e) => setPlanForm({ ...planForm, batchId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
                  >
                    {batches.map((b: any) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Module Label</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Module 3: Core Architecture"
                    value={planForm.moduleLabel}
                    onChange={(e) => setPlanForm({ ...planForm, moduleLabel: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">Lesson Plan &amp; Objectives</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Outline syllabus topics, hands-on demos, and key concepts..."
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Session Date</label>
                  <input
                    type="date"
                    required
                    value={planForm.sessionDate}
                    onChange={(e) => setPlanForm({ ...planForm, sessionDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Start Time</label>
                  <input
                    type="text"
                    required
                    placeholder="10:30 AM"
                    value={planForm.startTime}
                    onChange={(e) => setPlanForm({ ...planForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">End Time</label>
                  <input
                    type="text"
                    required
                    placeholder="12:00 PM"
                    value={planForm.endTime}
                    onChange={(e) => setPlanForm({ ...planForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Classroom / Lab</label>
                  <input
                    type="text"
                    placeholder="e.g. Lab 2, 2nd Floor or Online"
                    value={planForm.classroom}
                    onChange={(e) => setPlanForm({ ...planForm, classroom: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Room Number</label>
                  <input
                    type="text"
                    placeholder="Room 204"
                    value={planForm.roomNumber}
                    onChange={(e) => setPlanForm({ ...planForm, roomNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-body-sm hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Scheduling...' : 'Publish to Students'}
                </button>
                <button
                  onClick={() => setShowPlanModal(false)}
                  type="button"
                  className="px-4 py-2.5 rounded-xl bg-surface-container text-on-surface text-body-sm font-medium hover:bg-surface-container-high cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD STUDY MATERIAL MODAL */}
      {showMaterialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-surface-container-lowest shadow-2xl p-6 flex flex-col gap-4 border border-surface-container-high animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/40">
              <h3 className="font-headline-sm text-[18px] text-on-surface font-bold">
                Upload Study Material or Notes
              </h3>
              <button
                onClick={() => setShowMaterialModal(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleUploadMaterial} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">Material Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Node.js Event Loop Architecture & Microtasks.pdf"
                  value={materialForm.title}
                  onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">File Type</label>
                  <select
                    value={materialForm.fileType}
                    onChange={(e) => setMaterialForm({ ...materialForm, fileType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
                  >
                    <option value="PDF">PDF Document</option>
                    <option value="ZIP">ZIP Archive (Starter Code)</option>
                    <option value="CODE">Source Code</option>
                    <option value="LINK">Reference Link</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Category</label>
                  <select
                    value={materialForm.category}
                    onChange={(e) => setMaterialForm({ ...materialForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
                  >
                    <option value="Lecture Notes">Lecture Notes</option>
                    <option value="Code Starter">Code Starter</option>
                    <option value="Cheatsheet">Cheatsheet</option>
                    <option value="Assignment Guide">Assignment Guide</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">Description &amp; Key Takeaways</label>
                <textarea
                  rows={2}
                  placeholder="Summary of contents and reading instructions..."
                  value={materialForm.description}
                  onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">File Download / GitHub Link</label>
                <input
                  type="url"
                  placeholder="https://storage.googleapis.com/... or GitHub link"
                  value={materialForm.fileUrl}
                  onChange={(e) => setMaterialForm({ ...materialForm, fileUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-body-sm hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Uploading...' : 'Publish Material'}
                </button>
                <button
                  onClick={() => setShowMaterialModal(false)}
                  type="button"
                  className="px-4 py-2.5 rounded-xl bg-surface-container text-on-surface text-body-sm font-medium hover:bg-surface-container-high cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POST ANNOUNCEMENT MODAL */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-surface-container-lowest shadow-2xl p-6 flex flex-col gap-4 border border-surface-container-high animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/40">
              <h3 className="font-headline-sm text-[18px] text-on-surface font-bold">
                Broadcast Batch Announcement
              </h3>
              <button
                onClick={() => setShowAnnouncementModal(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handlePostAnnouncement} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">Headline / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lab Session venue changed to Room 204 tomorrow"
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Priority</label>
                  <select
                    value={announcementForm.priority}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High Priority</option>
                    <option value="PRIORITY">Urgent Alert</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Target Batch</label>
                  <select
                    value={announcementForm.targetBatch}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, targetBatch: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
                  >
                    <option value="">All My Batches</option>
                    {batches.map((b: any) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">Announcement Message</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Details of the announcement..."
                  value={announcementForm.description}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-body-sm hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Posting...' : 'Broadcast Notice'}
                </button>
                <button
                  onClick={() => setShowAnnouncementModal(false)}
                  type="button"
                  className="px-4 py-2.5 rounded-xl bg-surface-container text-on-surface text-body-sm font-medium hover:bg-surface-container-high cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GRADE SUBMISSION MODAL */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-surface-container-lowest shadow-2xl p-6 flex flex-col gap-4 border border-surface-container-high animate-in zoom-in-95 duration-200">
            <h3 className="font-headline-sm text-[18px] text-on-surface font-bold">
              Grade Practical Submission
            </h3>
            <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high/40 flex flex-col gap-1 text-[13px]">
              <div>
                <span className="text-on-surface-variant">Student: </span>
                <span className="font-bold text-on-surface">{selectedSubmission.user?.name}</span>
              </div>
              <div>
                <span className="text-on-surface-variant">Assignment: </span>
                <span className="font-semibold text-on-surface">{selectedSubmission.assignment?.title}</span>
              </div>
              {selectedSubmission.githubRepoUrl && (
                <a
                  href={selectedSubmission.githubRepoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline text-[12px] flex items-center gap-1 mt-1"
                >
                  <span className="material-symbols-outlined text-[14px]">link</span>
                  <span>Inspect GitHub Repository</span>
                </a>
              )}
            </div>

            <form onSubmit={handleGradeSubmission} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">Score Awarded</label>
                <input
                  type="number"
                  required
                  min={0}
                  max={selectedSubmission.assignment?.totalPoints || 100}
                  value={gradingScore}
                  onChange={(e) => setGradingScore(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">Mentor Feedback &amp; Code Review</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Constructive feedback for the student..."
                  value={mentorFeedback}
                  onChange={(e) => setMentorFeedback(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-body-sm hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording...' : 'Submit Evaluation'}
                </button>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  type="button"
                  className="px-4 py-2.5 rounded-xl bg-surface-container text-on-surface text-body-sm font-medium hover:bg-surface-container-high cursor-pointer"
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
