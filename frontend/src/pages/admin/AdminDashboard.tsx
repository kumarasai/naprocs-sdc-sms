import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '../../services/api';
import { DEFAULT_AVATAR } from '../../utils/avatar';

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [showTrainerModal, setShowTrainerModal] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [alertBanner, setAlertBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Student Form State
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    password: 'Student@12345',
    phone: '',
    studentId: '',
    college: '',
    qualification: '',
    batchId: '',
    courseId: '',
  });

  // New Trainer Form State
  const [newTrainer, setNewTrainer] = useState({
    name: '',
    email: '',
    password: 'Trainer@12345',
    phone: '',
    trainerId: '',
    designation: '',
    bio: '',
    specialization: '',
    experienceYears: 0,
  });

  const fetchData = async () => {
    try {
      const [dashRes, studentsRes, batchesRes, coursesRes] = await Promise.all([
        api.get(`/admin/dashboard?_t=${Date.now()}`),
        api.get(`/admin/students?_t=${Date.now()}`),
        api.get('/courses/batches'),
        api.get('/courses/courses'),
      ]);

      if (dashRes.data.success) setData(dashRes.data.data);
      if (studentsRes.data.success) setStudents(studentsRes.data.students);
      if (batchesRes.data.success) {
        setBatches(batchesRes.data.batches);
        if (batchesRes.data.batches.length > 0) {
          setNewStudent((prev) => ({
            ...prev,
            batchId: batchesRes.data.batches[0]._id,
            courseId: batchesRes.data.batches[0].course?._id || '',
          }));
        }
      }
      if (coursesRes.data.success) setCourses(coursesRes.data.courses);
    } catch (err) {
      console.error('Failed to load admin portal:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/students', newStudent);
      if (res.data.success) {
        alert(`Student profile for "${newStudent.name}" created successfully! Generated Student ID: ${newStudent.studentId}`);
        setShowRegisterModal(false);
        setNewStudent({
          name: '',
          email: '',
          password: 'Student@12345',
          phone: '',
          studentId: '',
          college: '',
          qualification: '',
          batchId: batches[0]?._id || '',
          courseId: courses[0]?._id || '',
        });
        fetchData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to register student.');
    }
  };

  const handleRegisterTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/trainers', newTrainer);
      if (res.data.success) {
        alert(`Trainer profile for "${newTrainer.name}" created successfully! Trainer ID: ${newTrainer.trainerId}`);
        setShowTrainerModal(false);
        setNewTrainer({
          name: '',
          email: '',
          password: 'Trainer@12345',
          phone: '',
          trainerId: '',
          designation: '',
          bio: '',
          specialization: '',
          experienceYears: 0,
        });
        fetchData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create trainer profile.');
    }
  };

  const handleToggleStatus = async (studentId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await api.patch(`/admin/students/${studentId}/status`, { status: newStatus });
      if (res.data.success) {
        fetchData();
      }
    } catch (err: any) {
      setAlertBanner({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update student account status.',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const targetId = deleteTarget.id;
    const targetName = deleteTarget.name;

    // Optimistically remove from state
    setStudents((prev) => prev.filter((s) => s.id !== targetId));

    try {
      const res = await api.delete(`/admin/students/${targetId}`);
      if (res.data.success) {
        setAlertBanner({
          type: 'success',
          message: `Student profile for "${targetName}" was permanently deleted from the database.`,
        });
        setDeleteTarget(null);
        await fetchData();
      } else {
        throw new Error(res.data.message || 'Deletion failed');
      }
    } catch (err: any) {
      setAlertBanner({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to delete student.',
      });
      setDeleteTarget(null);
      await fetchData();
    } finally {
      setIsDeleting(false);
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
            Loading administrative matrices...
          </span>
        </div>
      </div>
    );
  }

  const filteredStudents = students.filter(
    (s) =>
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full pb-16 pt-6 gap-6">
      {/* Title & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider">
              Institute Administration
            </span>
            <span className="text-[12px] text-outline">• Exclusive User Creation Authority</span>
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface font-bold mt-1">
            Institute Management Command Center
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Create and manage student &amp; trainer accounts, monitor attendance health, and manage batch allocations
          </p>
        </div>

        {/* Both Action Buttons Prominently in Header */}
        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => setShowRegisterModal(true)}
            type="button"
            className="px-4 py-2.5 rounded-xl bg-primary text-on-primary font-body-sm font-semibold hover:bg-primary-container shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">school</span>
            <span>+ Create Student Profile</span>
          </button>

          <button
            onClick={() => setShowTrainerModal(true)}
            type="button"
            className="px-4 py-2.5 rounded-xl bg-secondary text-on-secondary font-body-sm font-semibold hover:opacity-90 shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">badge</span>
            <span>+ Create Trainer Profile</span>
          </button>
        </div>
      </div>

      {/* Alert / Notification Banner */}
      {alertBanner && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between border shadow-xs animate-in fade-in duration-200 ${
            alertBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`material-symbols-outlined text-[22px] ${
                alertBanner.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {alertBanner.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span className="font-medium text-body-sm">{alertBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlertBanner(null)}
            className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* KPI Matrix Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <NavLink
          to="/admin/students"
          className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex items-center justify-between hover:border-primary/50 transition-colors"
        >
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
              Total Enrolled Students
            </span>
            <span className="font-display-lg text-display-lg font-bold text-on-surface mt-1 tabular-nums">
              {data?.stats?.totalStudents || students.length}
            </span>
            <span className="font-label-sm text-label-sm text-primary font-medium mt-1 flex items-center gap-1">
              <span>Manage directory</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </span>
          </div>
          <div className="p-3 rounded-xl bg-primary-fixed text-primary">
            <span className="material-symbols-outlined text-[24px]">school</span>
          </div>
        </NavLink>

        <NavLink
          to="/admin/trainers"
          className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex items-center justify-between hover:border-secondary/50 transition-colors"
        >
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
              Faculty Trainers
            </span>
            <span className="font-display-lg text-display-lg font-bold text-on-surface mt-1 tabular-nums">
              {data?.stats?.totalTrainers ?? 0}
            </span>
            <span className="font-label-sm text-label-sm text-secondary font-medium mt-1 flex items-center gap-1">
              <span>Manage faculty</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </span>
          </div>
          <div className="p-3 rounded-xl bg-secondary-fixed text-secondary">
            <span className="material-symbols-outlined text-[24px]">badge</span>
          </div>
        </NavLink>

        <NavLink
          to="/admin/reports"
          className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex items-center justify-between hover:border-emerald-500/50 transition-colors"
        >
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
              Today's Attendance Rate
            </span>
            <span className="font-display-lg text-display-lg font-bold text-emerald-700 mt-1 tabular-nums">
              {data?.stats?.todayAttendanceRate ?? 0}%
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-1">
              Across active cohorts
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800">
            <span className="material-symbols-outlined text-[24px]">fact_check</span>
          </div>
        </NavLink>

        <NavLink
          to="/admin/batches"
          className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex items-center justify-between hover:border-primary/50 transition-colors"
        >
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
              Active Cohort Batches
            </span>
            <span className="font-display-lg text-display-lg font-bold text-on-surface mt-1 tabular-nums">
              {data?.stats?.activeBatches ?? batches.length}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-1">
              Campus Classroom Allocations
            </span>
          </div>
          <div className="p-3 rounded-xl bg-surface-container text-on-surface">
            <span className="material-symbols-outlined text-[24px]">groups</span>
          </div>
        </NavLink>
      </div>

      {/* Quick Admin Actions Banner */}
      <div className="p-6 rounded-3xl bg-surface-container-lowest border border-surface-container-high/60 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/40">
          <div className="flex items-center gap-2">
            <span className="font-headline-sm text-[16px] text-on-surface font-bold">
              User Creation &amp; Management Hub
            </span>
            <span className="text-[12px] text-outline">• Admin Authority Actions</span>
          </div>
          <span className="text-[12px] text-primary font-semibold">
            Public Self-Signup Disabled
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => setShowRegisterModal(true)}
            className="p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all cursor-pointer border border-surface-container-high/40 flex flex-col justify-between gap-3 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary text-on-primary group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[20px]">person_add</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-on-surface text-[14px]">Create New Student</span>
                <span className="text-[11px] text-outline">Issue credentials &amp; enroll</span>
              </div>
            </div>
            <span className="text-[12px] text-primary font-semibold flex items-center gap-1">
              <span>Open registration modal</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </span>
          </div>

          <div
            onClick={() => setShowTrainerModal(true)}
            className="p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all cursor-pointer border border-surface-container-high/40 flex flex-col justify-between gap-3 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-secondary text-on-secondary group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[20px]">badge</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-on-surface text-[14px]">Create New Trainer</span>
                <span className="text-[11px] text-outline">Issue faculty credentials</span>
              </div>
            </div>
            <span className="text-[12px] text-secondary font-semibold flex items-center gap-1">
              <span>Open registration modal</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </span>
          </div>

          <NavLink
            to="/admin/batches"
            className="p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all cursor-pointer border border-surface-container-high/40 flex flex-col justify-between gap-3 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary-fixed text-primary group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[20px]">add_business</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-on-surface text-[14px]">Configure Batches</span>
                <span className="text-[11px] text-outline">Room &amp; timing slots</span>
              </div>
            </div>
            <span className="text-[12px] text-primary font-semibold flex items-center gap-1">
              <span>Go to batches</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </span>
          </NavLink>

          <NavLink
            to="/admin/reports"
            className="p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all cursor-pointer border border-surface-container-high/40 flex flex-col justify-between gap-3 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[20px]">file_download</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-on-surface text-[14px]">Export Registers</span>
                <span className="text-[11px] text-outline">Download Excel (.xlsx)</span>
              </div>
            </div>
            <span className="text-[12px] text-emerald-700 font-semibold flex items-center gap-1">
              <span>Generate report</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </span>
          </NavLink>
        </div>
      </div>

      {/* Main Student Directory Table */}
      <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-container-high/40">
          <div className="flex items-center gap-3">
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Student Directory &amp; Credentials Roster ({filteredStudents.length})
            </h3>
            <NavLink
              to="/admin/students"
              className="text-[12px] text-primary font-semibold hover:underline"
            >
              View Full Directory →
            </NavLink>
          </div>
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search student, ID, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-container-low rounded-xl border border-surface-container-high text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-container-high text-outline text-label-sm">
                <th className="py-3 px-3">Student</th>
                <th className="py-3 px-3">Student Roll ID</th>
                <th className="py-3 px-3">Cohort Batch</th>
                <th className="py-3 px-3">Attendance Health</th>
                <th className="py-3 px-3">Classes Attended</th>
                <th className="py-3 px-3">Account Status</th>
                <th className="py-3 px-3 text-right">Admin Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/40 text-body-sm">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-outline">
                    No students registered in database. Click "+ Register New Student" above to create an account.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => (
                <tr key={st.id} className="hover:bg-surface-container-low/40">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={DEFAULT_AVATAR}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full bg-surface-container-high"
                      />
                      <div className="flex flex-col">
                        <span className="font-bold text-on-surface">{st.name}</span>
                        <span className="text-[11px] text-on-surface-variant">{st.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-[12px] text-primary font-bold">
                    {st.studentId}
                  </td>
                  <td className="py-3 px-3 font-medium text-on-surface-variant">
                    {st.batchName}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-surface-container-high h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            st.attendancePercentage >= 75 ? 'bg-emerald-500' : 'bg-error'
                          }`}
                          style={{ width: `${Math.min(100, st.attendancePercentage || 0)}%` }}
                        ></div>
                      </div>
                      <span className="font-mono text-[12px] font-bold">
                        {st.attendancePercentage}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-tabular-data text-[13px]">
                    {st.enrolledClassesAttended}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        st.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {st.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleStatus(st.id, st.status)}
                        className={`px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
                          st.status === 'ACTIVE'
                            ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {st.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: st.id, name: st.name })}
                        className="px-2 py-1 rounded-lg text-[12px] font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer flex items-center gap-1 border border-rose-200"
                        title="Permanently Delete Student Profile"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register New Student Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-surface-container-lowest shadow-2xl p-6 flex flex-col gap-4 border border-surface-container-high">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Admin Authority
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Create New Student Profile
                </h3>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleRegisterStudent} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Full Name <span className="text-error">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh V"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    className="px-3 py-1.5 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Student Roll ID <span className="text-error">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NPC-2025-N01-089"
                    value={newStudent.studentId}
                    onChange={(e) => setNewStudent({ ...newStudent, studentId: e.target.value.toUpperCase() })}
                    className="px-3 py-1.5 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Email Address <span className="text-error">*</span></label>
                  <input
                    type="email"
                    required
                    placeholder="student@naprocs.com"
                    value={newStudent.email}
                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                    className="px-3 py-1.5 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Initial Password <span className="text-error">*</span></label>
                  <input
                    type="text"
                    required
                    value={newStudent.password}
                    onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                    className="px-3 py-1.5 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">College / University</label>
                  <input
                    type="text"
                    placeholder="JNTU Hyderabad"
                    value={newStudent.college}
                    onChange={(e) => setNewStudent({ ...newStudent, college: e.target.value })}
                    className="px-3 py-1.5 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Enroll in Batch <span className="text-error">*</span></label>
                  <select
                    value={newStudent.batchId}
                    onChange={(e) => {
                      const sel = batches.find((b) => b._id === e.target.value);
                      setNewStudent({
                        ...newStudent,
                        batchId: e.target.value,
                        courseId: sel?.course?._id || newStudent.courseId,
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {batches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name} ({b.timing})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-surface-container-high/40">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-medium text-body-sm hover:bg-primary-container transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>Create &amp; Enroll Student</span>
                </button>
                <button
                  onClick={() => setShowRegisterModal(false)}
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

      {/* Register New Trainer Modal */}
      {showTrainerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-surface-container-lowest shadow-2xl p-6 flex flex-col gap-4 border border-surface-container-high">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                  Admin Authority
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Create New Trainer Profile
                </h3>
              </div>
              <button
                onClick={() => setShowTrainerModal(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleRegisterTrainer} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Faculty Full Name <span className="text-error">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Rajesh Khanna"
                    value={newTrainer.name}
                    onChange={(e) => setNewTrainer({ ...newTrainer, name: e.target.value })}
                    className="px-3 py-1.5 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Trainer ID <span className="text-error">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TR-2025-055"
                    value={newTrainer.trainerId}
                    onChange={(e) => setNewTrainer({ ...newTrainer, trainerId: e.target.value.toUpperCase() })}
                    className="px-3 py-1.5 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-secondary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Email Address <span className="text-error">*</span></label>
                  <input
                    type="email"
                    required
                    placeholder="trainer@naprocs.com"
                    value={newTrainer.email}
                    onChange={(e) => setNewTrainer({ ...newTrainer, email: e.target.value })}
                    className="px-3 py-1.5 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Initial Password <span className="text-error">*</span></label>
                  <input
                    type="text"
                    required
                    value={newTrainer.password}
                    onChange={(e) => setNewTrainer({ ...newTrainer, password: e.target.value })}
                    className="px-3 py-1.5 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm font-mono focus:outline-none focus:ring-1 focus:ring-secondary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Designation</label>
                  <input
                    type="text"
                    value={newTrainer.designation}
                    onChange={(e) => setNewTrainer({ ...newTrainer, designation: e.target.value })}
                    className="px-3 py-1.5 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Experience (Years)</label>
                  <input
                    type="number"
                    value={newTrainer.experienceYears}
                    onChange={(e) => setNewTrainer({ ...newTrainer, experienceYears: Number(e.target.value) })}
                    className="px-3 py-1.5 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">Specializations (comma-separated)</label>
                <input
                  type="text"
                  value={newTrainer.specialization}
                  onChange={(e) => setNewTrainer({ ...newTrainer, specialization: e.target.value })}
                  placeholder="Node.js, Express, MongoDB, TypeScript, Docker"
                  className="px-3 py-1.5 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                />
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-surface-container-high/40">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-on-secondary font-medium text-body-sm hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>Create &amp; Activate Trainer</span>
                </button>
                <button
                  onClick={() => setShowTrainerModal(false)}
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

      {/* In-App Delete Confirmation Modal (Replaces native blocked window.confirm) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-surface-container-lowest shadow-2xl p-6 flex flex-col gap-4 border border-rose-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[26px]">delete_forever</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                  Permanent Database Removal
                </span>
                <h3 className="font-headline-sm text-[18px] text-on-surface font-bold">
                  Delete Student Profile?
                </h3>
              </div>
            </div>

            <p className="text-body-sm text-on-surface-variant leading-relaxed">
              Are you sure you want to permanently delete the profile for <strong className="text-on-surface font-semibold">{deleteTarget.name}</strong>?
              This will completely wipe their account credentials and enrollments from the database. <span className="text-rose-700 font-medium">This action cannot be undone.</span>
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container-high">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-body-sm font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    <span>Yes, Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
