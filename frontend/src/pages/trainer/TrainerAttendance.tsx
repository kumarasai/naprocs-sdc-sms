import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { DEFAULT_AVATAR } from '../../utils/avatar';

export const TrainerAttendance: React.FC = () => {
  const [activeSession, setActiveSession] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'ABSENT'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isOpeningSession, setIsOpeningSession] = useState<boolean>(false);
  const [isClosingSession, setIsClosingSession] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const { socket, joinSession } = useSocket();

  // Tick current time every second to update live durations for in-class students
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchSessionData = async () => {
    try {
      const res = await api.get('/trainers/dashboard');
      if (res.data.success) {
        const liveSession = res.data.data.sessions.find(
          (s: any) => s.status === 'LIVE' || s.status === 'SCHEDULED'
        );
        if (liveSession) {
          setActiveSession(liveSession);
          joinSession(liveSession._id);
          fetchSessionRoster(liveSession._id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSessionRoster = async (classSessionId: string) => {
    try {
      const res = await api.get(`/attendance/sessions/${classSessionId}/roster`);
      if (res.data.success) {
        setAttendees(res.data.records);
      }
    } catch (e) {
      // safe
    }
  };

  useEffect(() => {
    fetchSessionData();
  }, []);

  // Real-time socket events for student check-ins and check-outs
  useEffect(() => {
    if (!socket) return;

    socket.on('student_attendance_marked', (payload: any) => {
      setAttendees((prev) => {
        const existingIndex = prev.findIndex(
          (a) => a.student?.studentId === payload.studentId || a._id === payload.recordId
        );
        const updatedRecord = {
          _id: payload.recordId,
          user: { name: payload.studentName, avatar: payload.avatar },
          student: { studentId: payload.studentId },
          status: payload.status || 'PRESENT',
          checkInTime: payload.checkInTime || new Date(),
          checkOutTime: null,
          durationMinutes: 0,
          verificationMethod: 'WIFI_CHECKIN',
          wifiSignalMatched: true,
        };

        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = { ...next[existingIndex], ...updatedRecord };
          return next;
        }
        return [updatedRecord, ...prev];
      });
    });

    socket.on('student_attendance_checkout', (payload: any) => {
      setAttendees((prev) =>
        prev.map((a) => {
          if (a.student?.studentId === payload.studentId || a._id === payload.recordId) {
            return {
              ...a,
              checkOutTime: payload.checkOutTime,
              durationMinutes: payload.durationMinutes,
              status: payload.status,
            };
          }
          return a;
        })
      );
    });

    socket.on('session_closed', () => {
      if (activeSession) {
        fetchSessionRoster(activeSession._id);
      }
    });

    return () => {
      socket.off('student_attendance_marked');
      socket.off('student_attendance_checkout');
      socket.off('session_closed');
    };
  }, [socket, activeSession]);

  const handleOpenAttendance = async () => {
    if (!activeSession) return;
    setIsOpeningSession(true);
    try {
      const res = await api.post('/attendance/sessions/open', { classSessionId: activeSession._id });
      if (res.data.success) {
        setActiveSession((prev: any) => ({ ...prev, status: 'LIVE', isAttendanceOpen: true }));
        fetchSessionRoster(activeSession._id);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start live session.');
    } finally {
      setIsOpeningSession(false);
    }
  };

  const handleCloseAttendance = async () => {
    if (!activeSession) return;
    setIsClosingSession(true);
    try {
      const res = await api.post(`/attendance/sessions/${activeSession._id}/close`);
      if (res.data.success) {
        setActiveSession((prev: any) => ({ ...prev, status: 'COMPLETED', isAttendanceOpen: false }));
        fetchSessionRoster(activeSession._id);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to close attendance session.');
    } finally {
      setIsClosingSession(false);
    }
  };

  const calculateLiveDuration = (checkInTime: string | Date, checkOutTime?: string | Date) => {
    const start = new Date(checkInTime).getTime();
    const end = checkOutTime ? new Date(checkOutTime).getTime() : currentTime.getTime();
    const totalSecs = Math.max(0, Math.floor((end - start) / 1000));
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hours > 0 ? `${hours}h ` : ''}${mins}m ${String(secs).padStart(2, '0')}s`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[36px] animate-spin">
            progress_activity
          </span>
          <span className="font-body-md text-on-surface-variant font-medium">
            Connecting to live classroom attendance monitor...
          </span>
        </div>
      </div>
    );
  }

  const isLive = activeSession?.status === 'LIVE';

  // Counts
  const currentlyInClass = attendees.filter((a) => a.checkInTime && !a.checkOutTime).length;
  const completedToday = attendees.filter((a) => a.checkInTime && a.checkOutTime).length;
  const absentStudents = attendees.filter((a) => a.status === 'ABSENT' || !a.checkInTime).length;

  const filteredAttendees = attendees.filter((a) => {
    const nameMatch =
      (a.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.student?.studentId || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!nameMatch) return false;

    if (filter === 'ACTIVE') return a.checkInTime && !a.checkOutTime;
    if (filter === 'COMPLETED') return a.checkInTime && a.checkOutTime;
    if (filter === 'ABSENT') return a.status === 'ABSENT' || !a.checkInTime;
    return true;
  });

  return (
    <div className="flex flex-col w-full pb-16 pt-6 gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>Campus Wi-Fi Security Active</span>
            </span>
            <span className="text-[12px] text-outline">• 1-Click Check-In &amp; Duration Engine</span>
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface font-bold mt-1">
            Live Classroom Attendance &amp; Time Monitor
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Live tracking of student classroom check-ins, active session stopwatches, and verified attendance durations
          </p>
        </div>

        {activeSession && (
          <div className="flex items-center gap-3">
            {!isLive ? (
              <button
                onClick={handleOpenAttendance}
                disabled={isOpeningSession}
                type="button"
                className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-body-sm font-bold hover:bg-emerald-700 shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">sensors</span>
                <span>{isOpeningSession ? 'Activating...' : 'Open Session For Check-In'}</span>
              </button>
            ) : (
              <button
                onClick={handleCloseAttendance}
                disabled={isClosingSession}
                type="button"
                className="px-6 py-2.5 rounded-xl bg-rose-600 text-white font-body-sm font-bold hover:bg-rose-700 shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">lock_clock</span>
                <span>{isClosingSession ? 'Finalizing...' : 'Close & Finalize Session'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-surface-container-high/50 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-outline">Total Enrolled</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-headline-lg font-bold text-on-surface">{attendees.length}</span>
            <span className="text-body-sm text-on-surface-variant">Students in Cohort</span>
          </div>
          <div className="mt-2 text-[12px] text-outline font-medium">
            {activeSession?.classroom || 'Campus Classroom'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-emerald-500/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Currently In Class</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-headline-lg font-bold text-emerald-800">{currentlyInClass}</span>
            <span className="text-body-sm text-emerald-700">Active Stopwatches</span>
          </div>
          <div className="mt-2 text-[12px] text-emerald-700 font-semibold">
            Ticking live via Campus Wi-Fi
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-surface-container-high/50 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-outline">Checked Out (Finished)</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-headline-lg font-bold text-primary">{completedToday}</span>
            <span className="text-body-sm text-on-surface-variant">Sessions Saved</span>
          </div>
          <div className="mt-2 text-[12px] text-outline">
            Full duration calculated in database
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-surface-container-high/50 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-outline">Not Checked In</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-headline-lg font-bold text-rose-700">{absentStudents}</span>
            <span className="text-body-sm text-rose-700">Pending / Absent</span>
          </div>
          <div className="mt-2 text-[12px] text-outline">
            Will auto-finalize if session closes
          </div>
        </div>
      </div>

      {/* Main Classroom Roster Table */}
      <div className="p-6 rounded-3xl bg-surface-container-lowest border border-surface-container-high/60 shadow-sm flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-surface-container-high/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[24px]">group</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-[18px] text-on-surface font-bold">
                Classroom Attendance Roster
              </h3>
              <p className="text-body-sm text-on-surface-variant">
                {activeSession?.topicTitle || 'Active Lesson'} • {activeSession?.classroom || 'Campus Room'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-outline">
                search
              </span>
              <input
                type="text"
                placeholder="Search student or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm focus:outline-none focus:ring-1 focus:ring-primary w-48 sm:w-60"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl">
              {(['ALL', 'ACTIVE', 'COMPLETED', 'ABSENT'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    filter === tab
                      ? 'bg-primary-container text-on-primary-container shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {tab === 'ACTIVE' ? 'In Class' : tab === 'COMPLETED' ? 'Finished' : tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Student Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-sm text-body-sm">
            <thead>
              <tr className="border-b border-surface-container-high text-[11px] font-bold uppercase tracking-wider text-outline">
                <th className="py-3 px-3">Student</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Check-In</th>
                <th className="py-3 px-3">Check-Out</th>
                <th className="py-3 px-3">Attended Duration</th>
                <th className="py-3 px-3">Network Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {filteredAttendees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-outline">
                    No student records matching current search/filter.
                  </td>
                </tr>
              ) : (
                filteredAttendees.map((rec) => {
                  const isInClass = rec.checkInTime && !rec.checkOutTime;
                  const isCheckedOut = rec.checkInTime && rec.checkOutTime;
                  const isAbsent = rec.status === 'ABSENT' || !rec.checkInTime;

                  return (
                    <tr key={rec._id || rec.student?.studentId} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={DEFAULT_AVATAR}
                            alt="Avatar"
                            className="w-9 h-9 rounded-full object-cover bg-surface-container-high"
                          />
                          <div className="flex flex-col">
                            <span className="font-bold text-on-surface text-[14px]">
                              {rec.user?.name || 'Student'}
                            </span>
                            <span className="font-mono text-[11px] text-primary font-bold">
                              {rec.student?.studentId || 'NPC-2025'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        {isInClass ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
                            <span>IN CLASS (ACTIVE)</span>
                          </span>
                        ) : isCheckedOut ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            <span>{rec.status === 'PRESENT' ? 'COMPLETED (FULL)' : 'HALF DAY'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                            <span className="material-symbols-outlined text-[14px]">close</span>
                            <span>NOT CHECKED IN</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 font-mono text-[12px] text-on-surface-variant">
                        {rec.checkInTime
                          ? new Date(rec.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>

                      <td className="py-3.5 px-3 font-mono text-[12px] text-on-surface-variant">
                        {rec.checkOutTime
                          ? new Date(rec.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : isInClass
                          ? 'Active Session'
                          : '—'}
                      </td>

                      <td className="py-3.5 px-3 font-mono font-bold text-[13px] text-on-surface">
                        {isInClass ? (
                          <span className="text-emerald-700 animate-pulse font-bold">
                            ⏱ {calculateLiveDuration(rec.checkInTime)}
                          </span>
                        ) : isCheckedOut ? (
                          <span>
                            {Math.floor((rec.durationMinutes || 0) / 60) > 0
                              ? `${Math.floor((rec.durationMinutes || 0) / 60)}h `
                              : ''}
                            {(rec.durationMinutes || 0) % 60}m
                          </span>
                        ) : (
                          <span className="text-outline font-normal">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-[12px]">
                        {rec.verificationMethod === 'WIFI_CHECKIN' || rec.wifiSignalMatched ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md">
                            <span className="material-symbols-outlined text-[14px]">wifi</span>
                            Campus Wi-Fi
                          </span>
                        ) : (
                          <span className="text-outline text-[12px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
