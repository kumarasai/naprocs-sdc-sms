import React, { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../../services/api';

export const AttendanceHistory: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showCorrectionModal, setShowCorrectionModal] = useState<boolean>(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [requestedStatus, setRequestedStatus] = useState<string>('PRESENT');

  const fetchHistory = async () => {
    try {
      const res = await api.get('/attendance/history');
      if (res.data.success) {
        setHistory(res.data.records);
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleExportExcel = () => {
    window.open(`${API_BASE_URL}/reports/attendance/export/excel`, '_blank');
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId || !correctionReason) return;

    try {
      const res = await api.post('/attendance/corrections', {
        classSessionId: selectedSessionId,
        requestedStatus,
        reason: correctionReason,
      });

      if (res.data.success) {
        alert('Attendance correction request submitted for administrative review.');
        setShowCorrectionModal(false);
        setCorrectionReason('');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit correction request.');
    }
  };

  const filteredHistory = filterStatus === 'ALL'
    ? history
    : history.filter((r) => r.status === filterStatus);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[36px] animate-spin">
            progress_activity
          </span>
          <span className="font-body-md text-on-surface-variant font-medium">
            Loading attendance register...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-16 pt-6 gap-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface font-bold">
            Attendance Register &amp; Calendar History
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Official immutable attendance logs • Cryptographically verified session check-ins
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCorrectionModal(true)}
            type="button"
            className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer border border-surface-container-high"
          >
            <span className="material-symbols-outlined text-[18px]">edit_calendar</span>
            <span>Request Correction</span>
          </button>
          <button
            onClick={handleExportExcel}
            type="button"
            className="px-4 py-2.5 rounded-xl bg-primary text-on-primary font-body-sm font-semibold hover:bg-primary-container shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Export to Excel</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high/40 shadow-xs flex flex-col">
          <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Attendance Rate</span>
          <span className="text-[28px] font-bold text-primary mt-1 tabular-nums">{stats?.attendanceRate ?? 0}%</span>
          <span className={`text-[11px] font-medium ${(stats?.attendanceRate ?? 0) >= 75 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {(stats?.attendanceRate ?? 0) >= 75 ? 'On Track for Certification' : 'Attendance Attention Needed'}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 shadow-xs flex flex-col">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Classes Attended</span>
          <span className="text-[28px] font-bold text-emerald-700 mt-1 tabular-nums">{stats?.present ?? 0}</span>
          <span className="text-[11px] text-emerald-700 font-medium">Verified Check-ins</span>
        </div>
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 shadow-xs flex flex-col">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Late Check-Ins</span>
          <span className="text-[28px] font-bold text-amber-700 mt-1 tabular-nums">{stats?.late ?? 0}</span>
          <span className="text-[11px] text-amber-800 font-medium">Within 15m threshold</span>
        </div>
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 shadow-xs flex flex-col">
          <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Absent Sessions</span>
          <span className="text-[28px] font-bold text-rose-700 mt-1 tabular-nums">{stats?.absent ?? 0}</span>
          <span className="text-[11px] text-rose-700 font-medium">Correction Eligible</span>
        </div>
      </div>

      {/* Register List & Filters */}
      <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-container-high/40">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">calendar_view_month</span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Session Attendance History
            </h3>
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1.5 bg-surface-container-low p-1 rounded-xl">
            {['ALL', 'PRESENT', 'LATE', 'ABSENT'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  filterStatus === status
                    ? 'bg-primary-container text-on-primary-container shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-sm text-body-sm">
            <thead>
              <tr className="border-b border-surface-container-high text-[11px] font-bold uppercase tracking-wider text-outline">
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Topic / Lesson</th>
                <th className="py-3 px-3">Batch &amp; Classroom</th>
                <th className="py-3 px-3">Check-In</th>
                <th className="py-3 px-3">Check-Out</th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-3">Verification</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-outline">
                    No attendance records found matching filter.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((record) => {
                  const hours = Math.floor((record.durationMinutes || 0) / 60);
                  const mins = (record.durationMinutes || 0) % 60;
                  const durationStr =
                    record.durationMinutes > 0
                      ? hours > 0
                        ? `${hours}h ${mins}m`
                        : `${mins}m`
                      : record.checkInTime && !record.checkOutTime
                      ? 'In Class (Active)'
                      : '—';

                  return (
                    <tr key={record._id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3.5 px-3 font-semibold text-on-surface whitespace-nowrap">
                        {new Date(record.attendanceDate).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-3 font-medium text-on-surface">
                        {record.classSession?.topicTitle || 'Curriculum Session'}
                      </td>
                      <td className="py-3.5 px-3 text-on-surface-variant text-[12px]">
                        {record.batch?.name || 'Classroom Batch'} ({record.classSession?.classroom || 'Classroom'})
                      </td>
                      <td className="py-3.5 px-3 text-on-surface-variant font-mono text-[12px]">
                        {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="py-3.5 px-3 text-on-surface-variant font-mono text-[12px]">
                        {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (record.checkInTime ? 'Active Session' : '—')}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-[12px] text-on-surface">
                        {durationStr}
                      </td>
                      <td className="py-3.5 px-3 text-[12px]">
                        {record.verificationMethod === 'WIFI_CHECKIN' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md">
                            <span className="material-symbols-outlined text-[14px]">wifi</span>
                            Campus Wi-Fi
                          </span>
                        ) : (
                          <span className="text-outline text-[12px]">{record.verificationMethod}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2.5 py-1 rounded-full font-label-sm text-[11px] font-bold ${
                            record.status === 'PRESENT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : record.status === 'HALF_DAY'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : record.status === 'LATE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Correction Request Modal */}
      {showCorrectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-surface-container-lowest shadow-2xl p-6 flex flex-col gap-4 border border-surface-container-high">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
              <h4 className="font-headline-sm text-[18px] text-on-surface font-bold">
                Submit Attendance Correction
              </h4>
              <button
                onClick={() => setShowCorrectionModal(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitCorrection} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">Select Class Session</label>
                <select
                  required
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select session to reconcile...</option>
                  {history.map((r) => (
                    <option key={r.classSession?._id} value={r.classSession?._id}>
                      {new Date(r.attendanceDate).toLocaleDateString()} - {r.classSession?.topicTitle} (Current: {r.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">Requested Status</label>
                <select
                  value={requestedStatus}
                  onChange={(e) => setRequestedStatus(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="PRESENT">Present</option>
                  <option value="LATE">Late (Medical / Transport)</option>
                  <option value="EXCUSED">Excused Absence</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">Reason &amp; Explanation</label>
                <textarea
                  required
                  rows={3}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="Detail physical presence, device camera issue, or reason for delay..."
                  className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-medium text-body-sm hover:bg-primary-container transition-colors cursor-pointer"
                >
                  Submit Correction Request
                </button>
                <button
                  onClick={() => setShowCorrectionModal(false)}
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
