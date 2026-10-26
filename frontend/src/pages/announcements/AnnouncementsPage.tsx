import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export const AnnouncementsPage: React.FC = () => {
  const { role } = useAuth();
  const isTrainerOrAdmin = role === 'TRAINER' || role === 'ADMIN';

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showPostModal, setShowPostModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'NORMAL',
    locationScope: 'All Batches',
  });

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/communication/announcements');
      if (res.data.success) {
        setAnnouncements(res.data.announcements || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.post('/communication/announcements', form);
      if (res.data.success) {
        alert(`Announcement "${form.title}" published!`);
        setShowPostModal(false);
        setForm({
          title: '',
          description: '',
          priority: 'NORMAL',
          locationScope: 'All Batches',
        });
        fetchAnnouncements();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to post announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete notice "${title}"?`)) return;
    try {
      const res = await api.delete(`/communication/announcements/${id}`);
      if (res.data.success) {
        setAnnouncements((prev) => prev.filter((a) => a._id !== id));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete announcement');
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
            Loading institute notices...
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
            Institute Announcements &amp; Circulars
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Campus workshops, facility maintenance schedules, and batch notices
          </p>
        </div>

        {isTrainerOrAdmin && (
          <button
            onClick={() => setShowPostModal(true)}
            type="button"
            className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-body-sm font-semibold hover:bg-primary-container shadow-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add_alert</span>
            <span>Post Announcement</span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {announcements.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-surface-container-lowest border border-dashed border-outline-variant/60 shadow-xs flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px]">campaign</span>
            </div>
            <h3 className="font-headline-sm text-[18px] text-on-surface font-bold">
              No Announcements Published
            </h3>
            <p className="text-body-sm text-on-surface-variant max-w-md">
              There are currently no circulars or administrative notices published.
            </p>
            {isTrainerOrAdmin && (
              <button
                type="button"
                onClick={() => setShowPostModal(true)}
                className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-body-sm font-semibold hover:bg-primary-container shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add_alert</span>
                <span>Post First Announcement</span>
              </button>
            )}
          </div>
        ) : (
          announcements.map((item) => {
            const isPriority = item.priority === 'PRIORITY' || item.priority === 'HIGH' || item.priority === 'URGENT';
            return (
              <div
                key={item._id}
                className={`p-6 rounded-2xl bg-surface-container-lowest shadow-sm border transition-all flex flex-col gap-3 ${
                  isPriority
                    ? 'border-rose-200 bg-rose-50/20'
                    : 'border-surface-container-high/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-md font-label-sm text-[11px] font-bold uppercase tracking-wider ${
                        isPriority
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {item.priority}
                    </span>
                    <span className="text-[12px] text-outline">
                      {new Date(item.publishDate || item.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {item.locationScope && (
                      <span className="text-[12px] font-medium text-primary">
                        {item.locationScope}
                      </span>
                    )}
                    {isTrainerOrAdmin && (
                      <button
                        onClick={() => handleDeleteAnnouncement(item._id, item.title)}
                        type="button"
                        className="p-1 text-outline hover:text-error hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Announcement"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="font-headline-sm text-[18px] font-bold text-on-surface">
                  {item.title}
                </h3>
                <p className="font-body-md text-on-surface-variant leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-surface-container-lowest shadow-2xl p-6 flex flex-col gap-5 border border-surface-container-high max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Campus Broadcast
                </span>
                <h3 className="font-headline-sm text-[18px] text-on-surface font-bold">
                  Post New Announcement
                </h3>
              </div>
              <button
                onClick={() => setShowPostModal(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">
                  Announcement Title <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Special Hackathon & Mock Interviews Next Weekend"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="NORMAL">Normal Notice</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent Action Required</option>
                    <option value="EVENT">Campus Event</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Target / Scope</label>
                  <input
                    type="text"
                    placeholder="e.g. Lab 2, 2nd Floor or All Batches"
                    value={form.locationScope}
                    onChange={(e) => setForm({ ...form, locationScope: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">
                  Detailed Notice Description <span className="text-error">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide full details, timings, guidelines and prerequisites..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container-high">
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
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
                  <span>{isSubmitting ? 'Posting...' : 'Post Notice'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
