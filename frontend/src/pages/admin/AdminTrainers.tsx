import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export const AdminTrainers: React.FC = () => {
  const [trainers, setTrainers] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [alertBanner, setAlertBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: 'Trainer@12345',
    phone: '',
    trainerId: '',
    designation: '',
    bio: '',
    specialization: '',
    experienceYears: 0,
    assignedBatches: [] as string[],
  });

  const fetchData = async () => {
    try {
      const [trainersRes, batchesRes] = await Promise.all([
        api.get(`/admin/trainers?_t=${Date.now()}`),
        api.get('/courses/batches'),
      ]);
      if (trainersRes.data.success) setTrainers(trainersRes.data.trainers);
      if (batchesRes.data.success) setBatches(batchesRes.data.batches);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRegisterTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/trainers', form);
      if (res.data.success) {
        setAlertBanner({
          type: 'success',
          message: `Trainer profile for "${form.name}" successfully created and activated.`,
        });
        setShowModal(false);
        setForm({
          name: '',
          email: '',
          password: 'Trainer@12345',
          phone: '',
          trainerId: '',
          designation: '',
          bio: '',
          specialization: '',
          experienceYears: 0,
          assignedBatches: [],
        });
        fetchData();
      }
    } catch (err: any) {
      setAlertBanner({
        type: 'error',
        message: err.response?.data?.message || 'Failed to create trainer profile.',
      });
    }
  };

  const handleToggleStatus = async (trainerId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await api.patch(`/admin/trainers/${trainerId}/status`, { status: newStatus });
      if (res.data.success) {
        fetchData();
      }
    } catch (err: any) {
      setAlertBanner({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update trainer status.',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const targetId = deleteTarget.id;
    const targetName = deleteTarget.name;

    // Optimistically remove from state
    setTrainers((prev) => prev.filter((t) => t.id !== targetId));

    try {
      const res = await api.delete(`/admin/trainers/${targetId}`);
      if (res.data.success) {
        setAlertBanner({
          type: 'success',
          message: `Trainer profile for "${targetName}" was permanently deleted from the database.`,
        });
        setDeleteTarget(null);
        await fetchData();
      } else {
        throw new Error(res.data.message || 'Deletion failed');
      }
    } catch (err: any) {
      setAlertBanner({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to delete trainer.',
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
            Loading trainer directory...
          </span>
        </div>
      </div>
    );
  }

  const filteredTrainers = trainers.filter(
    (t) =>
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.email?.toLowerCase().includes(search.toLowerCase()) ||
      t.trainerId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full pb-16 pt-6 gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface font-bold">
            Trainer &amp; Faculty Management
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Create instructor accounts, assign cohort batches, and manage mentor authorizations
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          type="button"
          className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-body-sm font-semibold hover:bg-primary-container shadow-sm transition-colors flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          <span>Register New Trainer</span>
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

      {/* Directory Table */}
      <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-container-high/40">
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
            Registered Faculty Members ({filteredTrainers.length})
          </h3>
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search faculty..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-container-low rounded-xl border border-surface-container-high text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-surface-container-high text-[11px] font-bold uppercase tracking-wider text-outline">
                <th className="py-3 px-3">Trainer</th>
                <th className="py-3 px-3">Faculty ID</th>
                <th className="py-3 px-3">Designation</th>
                <th className="py-3 px-3">Specialization</th>
                <th className="py-3 px-3">Assigned Batches</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low text-body-sm">
              {filteredTrainers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-on-surface-variant">
                    No faculty trainers found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredTrainers.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-3 px-3 flex items-center gap-2.5 font-medium text-on-surface">
                      <img
                        alt="Avatar"
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-primary/20"
                        src={t.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(t.name || 'Trainer')}`}
                      />
                      <div className="flex flex-col">
                        <span className="font-bold">{t.name}</span>
                        <span className="text-[11px] text-on-surface-variant">{t.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[12px] font-semibold text-primary">
                      {t.trainerId}
                    </td>
                    <td className="py-3 px-3 text-on-surface-variant font-medium">
                      {t.designation || 'Faculty Instructor'}
                    </td>
                    <td className="py-3 px-3 text-on-surface-variant text-[12px]">
                      {Array.isArray(t.specialization) && t.specialization.length > 0 
                        ? t.specialization.join(', ') 
                        : (t.specialization || 'General Technical')}
                    </td>
                    <td className="py-3 px-3 text-[12px] font-medium text-on-surface">
                      {t.assignedBatches && t.assignedBatches.length > 0 
                        ? t.assignedBatches.map((b: any) => b.name).join(', ') 
                        : 'Unassigned'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full font-label-sm text-[11px] font-bold ${
                          t.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(t.id, t.status)}
                          type="button"
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                            t.status === 'ACTIVE'
                              ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {t.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: t.id, name: t.name })}
                          type="button"
                          className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer flex items-center gap-1 border border-rose-200"
                          title="Permanently Delete Trainer Profile"
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

      {/* Register Trainer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-surface-container-lowest shadow-2xl p-6 flex flex-col gap-4 border border-surface-container-high">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
              <h4 className="font-headline-sm text-[18px] text-on-surface font-bold">
                Register New Trainer Profile
              </h4>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleRegisterTrainer} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Rajesh Verma"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="px-3 py-1.5 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Trainer ID</label>
                  <input
                    type="text"
                    required
                    placeholder="NPC-TR-002"
                    value={form.trainerId}
                    onChange={(e) => setForm({ ...form, trainerId: e.target.value })}
                    className="px-3 py-1.5 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="trainer@naprocs.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="px-3 py-1.5 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-label-sm font-semibold text-on-surface">Initial Password</label>
                    <span className="text-[10px] text-primary font-bold">1st login password change</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="px-3 py-1.5 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-[10px] text-on-surface-variant">
                    Trainer will immediately be prompted to set a private password on first login.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Designation</label>
                  <input
                    type="text"
                    value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                    className="px-3 py-1.5 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Specialization</label>
                  <input
                    type="text"
                    value={form.specialization}
                    onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                    placeholder="Node.js, MongoDB"
                    className="px-3 py-1.5 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-medium text-body-sm hover:bg-primary-container transition-colors cursor-pointer"
                >
                  Create Trainer Profile
                </button>
                <button
                  onClick={() => setShowModal(false)}
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
                  Delete Trainer Profile?
                </h3>
              </div>
            </div>

            <p className="text-body-sm text-on-surface-variant leading-relaxed">
              Are you sure you want to permanently delete the profile for <strong className="text-on-surface font-semibold">{deleteTarget.name}</strong>?
              This will completely remove their faculty login account and unassign them from any active batches. <span className="text-rose-700 font-medium">This action cannot be undone.</span>
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
