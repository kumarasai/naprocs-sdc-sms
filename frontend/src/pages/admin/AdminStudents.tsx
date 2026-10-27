import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { DEFAULT_AVATAR } from '../../utils/avatar';

export const AdminStudents: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [alertBanner, setAlertBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: 'Student@12345',
    phone: '',
    studentId: '',
    college: '',
    qualification: '',
    graduationYear: new Date().getFullYear(),
    batchId: '',
    courseId: '',
  });

  const fetchData = async () => {
    try {
      const [studentsRes, batchesRes, coursesRes] = await Promise.all([
        api.get(`/admin/students?_t=${Date.now()}`),
        api.get('/courses/batches'),
        api.get('/courses/courses'),
      ]);

      if (studentsRes.data.success) setStudents(studentsRes.data.students);
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
      console.error('Failed to load students:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.post('/admin/students', form);
      if (res.data.success) {
        setAlertBanner({
          type: 'success',
          message: `Student profile for ${form.name} created successfully! Generated Student ID: ${form.studentId}`,
        });
        setShowModal(false);
        setForm({
          name: '',
          email: '',
          password: 'Student@12345',
          phone: '',
          studentId: '',
          college: '',
          qualification: '',
          graduationYear: new Date().getFullYear(),
          batchId: batches[0]?._id || '',
          courseId: courses[0]?._id || '',
        });
        fetchData();
      }
    } catch (err: any) {
      setAlertBanner({
        type: 'error',
        message: err.response?.data?.message || 'Failed to register student.',
      });
    } finally {
      setIsSubmitting(false);
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

    // Optimistically remove from state for instant response
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

  const filteredStudents = students.filter((st) => {
    const matchesSearch =
      st.name?.toLowerCase().includes(search.toLowerCase()) ||
      st.email?.toLowerCase().includes(search.toLowerCase()) ||
      st.studentId?.toLowerCase().includes(search.toLowerCase()) ||
      st.college?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || st.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[36px] animate-spin">
            progress_activity
          </span>
          <span className="font-body-md text-on-surface-variant font-medium">
            Loading student directory...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-16 pt-6 gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider">
              Admin Exclusive Authority
            </span>
            <span className="text-[12px] text-outline">• Self-signup disabled</span>
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface font-bold mt-1">
            Student Profiles &amp; Registration
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Create student credentials, manage institute admissions, batch allocations and account statuses
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          type="button"
          className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-body-sm font-semibold hover:bg-primary-container shadow-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>Register New Student</span>
        </button>
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

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high/40 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-label-sm text-outline font-semibold">Total Registered</span>
            <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
              {students.length}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-primary-fixed/30 text-primary">
            <span className="material-symbols-outlined text-[24px]">school</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high/40 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-label-sm text-outline font-semibold">Active Enrollment</span>
            <span className="font-headline-sm text-headline-sm font-bold text-emerald-700">
              {students.filter((s) => s.status === 'ACTIVE').length}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800">
            <span className="material-symbols-outlined text-[24px]">verified_user</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high/40 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-label-sm text-outline font-semibold">Deactivated Accounts</span>
            <span className="font-headline-sm text-headline-sm font-bold text-rose-700">
              {students.filter((s) => s.status === 'INACTIVE').length}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-rose-100 text-rose-800">
            <span className="material-symbols-outlined text-[24px]">person_off</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[18px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, roll ID, email, college..."
            className="w-full pl-9 pr-4 py-2 bg-surface-container-low rounded-xl border-0 text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="text-label-sm text-outline font-semibold">Status:</span>
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-label-sm font-semibold cursor-pointer transition-colors ${
                statusFilter === st
                  ? 'bg-primary-container text-on-primary-container shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Students Directory Table */}
      <div className="rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-container-high/60 bg-surface-container-low/40">
                <th className="py-3.5 px-4 font-label-sm text-outline font-bold uppercase tracking-wider text-[11px]">
                  Student Details
                </th>
                <th className="py-3.5 px-4 font-label-sm text-outline font-bold uppercase tracking-wider text-[11px]">
                  Student Roll ID
                </th>
                <th className="py-3.5 px-4 font-label-sm text-outline font-bold uppercase tracking-wider text-[11px]">
                  College &amp; Qualification
                </th>
                <th className="py-3.5 px-4 font-label-sm text-outline font-bold uppercase tracking-wider text-[11px]">
                  Batch Enrolled
                </th>
                <th className="py-3.5 px-4 font-label-sm text-outline font-bold uppercase tracking-wider text-[11px]">
                  Attendance %
                </th>
                <th className="py-3.5 px-4 font-label-sm text-outline font-bold uppercase tracking-wider text-[11px]">
                  Account Status
                </th>
                <th className="py-3.5 px-4 font-label-sm text-outline font-bold uppercase tracking-wider text-[11px] text-right">
                  Admin Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/40 text-body-sm">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-on-surface-variant">
                    No students match your query. Click "+ Register New Student" to issue credentials.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => {
                  const isHealthy = st.attendancePercentage >= 75;
                  const isActive = st.status === 'ACTIVE';

                  return (
                    <tr key={st.id} className="hover:bg-surface-container-low/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={DEFAULT_AVATAR}
                            alt={st.name}
                            className="w-10 h-10 rounded-full object-cover bg-surface-container-high"
                          />
                          <div className="flex flex-col">
                            <span className="font-bold text-on-surface">{st.name}</span>
                            <span className="text-[12px] text-on-surface-variant">{st.email}</span>
                            {st.phone && (
                              <span className="text-[11px] text-outline font-mono">{st.phone}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-[12px] text-primary">
                        {st.studentId}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-on-surface">{st.college || '—'}</span>
                          <span className="text-[11px] text-on-surface-variant">
                            {st.qualification || '—'}{st.graduationYear ? ` (${st.graduationYear})` : ''}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-surface-container-low font-medium text-[12px] text-on-surface border border-surface-container-high/50">
                          {st.batchName || 'Unassigned'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-surface-container-high h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isHealthy ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(100, st.attendancePercentage || 0)}%` }}
                            ></div>
                          </div>
                          <span
                            className={`font-mono text-[12px] font-bold ${
                              isHealthy ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {st.attendancePercentage ?? 0}%
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          ></span>
                          <span>{st.status}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleStatus(st.id, st.status)}
                            type="button"
                            className={`px-3 py-1.5 rounded-lg text-label-sm font-semibold transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ id: st.id, name: st.name })}
                            type="button"
                            className="px-2.5 py-1.5 rounded-lg text-label-sm font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer flex items-center gap-1 border border-rose-200"
                            title="Permanently Delete Student Profile & Account"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registration Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/50 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-2xl bg-surface-container-lowest shadow-2xl p-6 flex flex-col gap-5 border border-surface-container-high max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Admin Authority • Student Registration
                </span>
                <h3 className="font-headline-sm text-[18px] text-on-surface font-bold">
                  Create Student Profile &amp; Login Credentials
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleRegisterStudent} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Student Full Name <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aditi Sharma"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Student Roll / ID <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NPC-2025-N01-095"
                    value={form.studentId}
                    onChange={(e) => setForm({ ...form, studentId: e.target.value.toUpperCase() })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Official Email <span className="text-error">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="aditi@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-label-sm font-semibold text-on-surface">
                      Temporary Password <span className="text-error">*</span>
                    </label>
                    <span className="text-[10px] text-primary font-bold">1st login password change</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="text-[11px] text-on-surface-variant">
                    Student will immediately be prompted to create their private password upon first sign-in.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Graduation Year
                  </label>
                  <input
                    type="number"
                    value={form.graduationYear}
                    onChange={(e) => setForm({ ...form, graduationYear: parseInt(e.target.value) || 2025 })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    College / University
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. JNTU Hyderabad"
                    value={form.college}
                    onChange={(e) => setForm({ ...form, college: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Degree / Qualification
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. B.Tech Computer Science"
                    value={form.qualification}
                    onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-surface-container-high/40">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Assign Batch <span className="text-error">*</span>
                  </label>
                  <select
                    value={form.batchId}
                    onChange={(e) => {
                      const selected = batches.find((b) => b._id === e.target.value);
                      setForm({
                        ...form,
                        batchId: e.target.value,
                        courseId: selected?.course?._id || form.courseId,
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
                    Course Curriculum
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
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>{isSubmitting ? 'Registering...' : 'Issue Credentials & Save'}</span>
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
