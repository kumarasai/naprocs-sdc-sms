import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export const AdminReports: React.FC = () => {
  const [reportData, setReportData] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const fetchReports = async (batchId?: string) => {
    setIsLoading(true);
    try {
      const batchesRes = await api.get('/courses/batches');
      if (batchesRes.data.success) {
        setBatches(batchesRes.data.batches);
        const bId = batchId || (batchesRes.data.batches.length > 0 ? batchesRes.data.batches[0]._id : '');
        setSelectedBatchId(bId);

        if (bId) {
          const registerRes = await api.get(`/attendance/reports/register?batchId=${bId}`);
          if (registerRes.data.success) {
            setReportData(registerRes.data.data);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load attendance reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleBatchChange = (batchId: string) => {
    setSelectedBatchId(batchId);
    fetchReports(batchId);
  };

  const handleExportExcel = async () => {
    if (!selectedBatchId) return;
    setIsExporting(true);
    try {
      const response = await api.get(`/attendance/reports/export?batchId=${selectedBatchId}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Naprocs_Attendance_Register_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to generate Excel export.');
    } finally {
      setIsExporting(false);
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
            Generating attendance matrix &amp; audit register...
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
              Audit &amp; Compliance Hub
            </span>
            <span className="text-[12px] text-outline">• Institute-wide Verification</span>
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface font-bold mt-1">
            Attendance Registers &amp; Reports
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Official attendance ledger, session roll calls, proxy audit trail and Excel export engine
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedBatchId}
            onChange={(e) => handleBatchChange(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-surface-container-high bg-surface-container-lowest text-body-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
          >
            {batches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name} ({b.batchCode})
              </option>
            ))}
          </select>

          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            type="button"
            className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-body-sm font-semibold hover:bg-emerald-700 shadow-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>{isExporting ? 'Exporting...' : 'Export Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high/40 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-label-sm text-outline font-semibold">Overall Attendance</span>
            <span className="font-headline-sm text-headline-sm font-bold text-primary">
              {reportData?.summary?.overallRate ?? 0}%
            </span>
          </div>
          <div className="p-3 rounded-xl bg-primary-fixed/30 text-primary">
            <span className="material-symbols-outlined text-[24px]">verified</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high/40 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-label-sm text-outline font-semibold">Total Sessions</span>
            <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
              {reportData?.summary?.totalSessionsConducted ?? 0}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-surface-container text-on-surface">
            <span className="material-symbols-outlined text-[24px]">event_repeat</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high/40 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-label-sm text-outline font-semibold">Total Check-ins</span>
            <span className="font-headline-sm text-headline-sm font-bold text-emerald-700">
              {reportData?.summary?.totalPresent ?? 0}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800">
            <span className="material-symbols-outlined text-[24px]">how_to_reg</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high/40 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-label-sm text-outline font-semibold">Below 75% Cutoff</span>
            <span className="font-headline-sm text-headline-sm font-bold text-rose-700">
              {reportData?.summary?.studentsAtRisk || 0}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-rose-100 text-rose-800">
            <span className="material-symbols-outlined text-[24px]">warning</span>
          </div>
        </div>
      </div>

      {/* Attendance Register Matrix Table */}
      <div className="rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 overflow-hidden">
        <div className="p-4 border-b border-surface-container-high/40 flex items-center justify-between bg-surface-container-low/30">
          <div className="flex items-center gap-2">
            <span className="font-headline-sm text-[16px] text-on-surface font-bold">
              Cohort Attendance Register
            </span>
            <span className="text-[12px] text-outline">• Academic Session 2025</span>
          </div>
          <span className="text-[12px] font-mono text-outline">
            Generated at: {new Date().toLocaleTimeString()}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-container-high/60 bg-surface-container-low/40">
                <th className="py-3 px-4 font-label-sm text-outline font-bold uppercase tracking-wider text-[11px]">
                  Roll ID
                </th>
                <th className="py-3 px-4 font-label-sm text-outline font-bold uppercase tracking-wider text-[11px]">
                  Student Name
                </th>
                <th className="py-3 px-4 font-label-sm text-outline font-bold uppercase tracking-wider text-[11px]">
                  Attended / Total
                </th>
                <th className="py-3 px-4 font-label-sm text-outline font-bold uppercase tracking-wider text-[11px]">
                  Percentage
                </th>
                <th className="py-3 px-4 font-label-sm text-outline font-bold uppercase tracking-wider text-[11px]">
                  Health Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/40 text-body-sm">
              {reportData?.roster && reportData.roster.length > 0 ? (
                reportData.roster.map((row: any) => {
                  const pct = row.percentage ?? 0;
                  const isHealthy = pct >= 75;

                  return (
                    <tr key={row.studentId} className="hover:bg-surface-container-low/30">
                      <td className="py-3 px-4 font-mono font-bold text-[12px] text-primary">
                        {row.studentId}
                      </td>
                      <td className="py-3 px-4 font-bold text-on-surface">
                        {row.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-on-surface-variant text-[13px]">
                        {row.attended} / {row.totalConducted} classes
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-surface-container-high h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isHealthy ? 'bg-emerald-500' : 'bg-rose-500'}`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            ></div>
                          </div>
                          <span className={`font-mono font-bold text-[13px] ${isHealthy ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isHealthy
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isHealthy ? 'Good Standing' : 'Attendance Warning'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                    No attendance records found for this cohort.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
