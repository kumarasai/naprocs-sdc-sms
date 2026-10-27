import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { StudentDashboardData } from '../../types';
import { useSocket } from '../../contexts/SocketContext';
import { DEFAULT_AVATAR } from '../../utils/avatar';

export const StudentDashboard: React.FC = () => {
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('Attendance Successfully Marked!');
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [submissionRepoUrl, setSubmissionRepoUrl] = useState<string>('');
  const [submittingAssignment, setSubmittingAssignment] = useState<boolean>(false);
  const [activeQuizModal, setActiveQuizModal] = useState<boolean>(false);

  // 1-Click Campus Wi-Fi Attendance State
  const [liveAttendance, setLiveAttendance] = useState<any>(null);
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState<boolean>(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [wifiRestrictionAlert, setWifiRestrictionAlert] = useState<{
    open: boolean;
    message: string;
    clientIp: string;
    ssid: string;
  } | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const { socket, joinSession } = useSocket();

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/students/dashboard');
      if (res.data.success) {
        setData(res.data.data);
        if (res.data.data.featuredClass?.id) {
          joinSession(res.data.data.featuredClass.id);
        }
      }
    } catch (err) {
      console.error('Failed to load student dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLiveStatus = async () => {
    try {
      const res = await api.get('/attendance/live-status');
      if (res.data.success) {
        setLiveAttendance(res.data);
      }
    } catch (e) {
      // live status error safe
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchLiveStatus();
  }, []);

  // Real-time stopwatch ticking counter
  useEffect(() => {
    let interval: any = null;
    if (liveAttendance?.isCheckedIn && liveAttendance?.checkInTime) {
      const startTime = new Date(liveAttendance.checkInTime).getTime();
      const update = () => {
        const diff = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
        setElapsedSeconds(diff);
      };
      update();
      interval = setInterval(update, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [liveAttendance?.isCheckedIn, liveAttendance?.checkInTime]);

  const formatStopwatch = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleCheckIn = async () => {
    setIsSubmittingAttendance(true);
    try {
      const res = await api.post('/attendance/check-in');
      if (res.data.success) {
        setToastMessage(res.data.message || 'Checked in successfully on Campus Wi-Fi!');
        setShowToast(true);
        await fetchLiveStatus();
        await fetchDashboardData();
        setTimeout(() => setShowToast(false), 4500);
      }
    } catch (err: any) {
      const resp = err.response?.data;
      if (resp?.wifiRestricted) {
        setWifiRestrictionAlert({
          open: true,
          message: resp.message || 'Campus Wi-Fi connection required.',
          clientIp: resp.detectedIp || '',
          ssid: resp.requiredSsid || 'Naprocs-Campus-5G',
        });
      } else if (resp?.alreadyCheckedOut) {
        setToastMessage(resp.message || 'You have already completed attendance for today.');
        setShowToast(true);
        await fetchLiveStatus();
        setTimeout(() => setShowToast(false), 4500);
      } else {
        alert(resp?.message || 'Failed to check in for attendance.');
      }
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  const handleConfirmCheckOut = async () => {
    setShowCheckoutModal(false);
    setIsSubmittingAttendance(true);
    try {
      const res = await api.post('/attendance/check-out');
      if (res.data.success) {
        setToastMessage(res.data.message || 'Checked out successfully!');
        setShowToast(true);
        await fetchLiveStatus();
        await fetchDashboardData();
        setTimeout(() => setShowToast(false), 5000);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to check out.');
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  // Real-time listener for attendance events and session state
  useEffect(() => {
    if (!socket) return;

    socket.on('session_opened', () => {
      fetchDashboardData();
      fetchLiveStatus();
    });

    socket.on('session_closed', () => {
      fetchDashboardData();
      fetchLiveStatus();
    });

    socket.on('student_attendance_marked', () => {
      fetchDashboardData();
      fetchLiveStatus();
    });

    socket.on('student_attendance_checkout', () => {
      fetchDashboardData();
      fetchLiveStatus();
    });

    return () => {
      socket.off('session_opened');
      socket.off('session_closed');
      socket.off('student_attendance_marked');
      socket.off('student_attendance_checkout');
    };
  }, [socket]);

  const handleAttendanceMarked = () => {
    setToastMessage(`Attendance Successfully Marked! ${data?.batch?.name || 'Cohort'} • Recorded Today`);
    setShowToast(true);
    fetchDashboardData();
    setTimeout(() => {
      setShowToast(false);
    }, 4500);
  };

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment || !submissionRepoUrl) return;
    setSubmittingAssignment(true);
    try {
      const res = await api.post(`/assignments/${selectedAssignment.id}/submit`, {
        githubRepoUrl: submissionRepoUrl,
      });
      if (res.data.success) {
        setToastMessage('Assignment successfully submitted for mentor grading!');
        setShowToast(true);
        setSelectedAssignment(null);
        setSubmissionRepoUrl('');
        fetchDashboardData();
        setTimeout(() => setShowToast(false), 4000);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit assignment.');
    } finally {
      setSubmittingAssignment(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[36px] animate-spin">
            progress_activity
          </span>
          <span className="font-body-md text-on-surface-variant font-medium">
            Loading student portal records...
          </span>
        </div>
      </div>
    );
  }  const kpis = data?.kpis || {
    attendanceRate: 0,
    classesAttended: 0,
    totalEligibleClasses: 0,
    assignmentsSolved: 0,
    totalAssignments: 0,
    pendingGrading: 0,
    curriculumVelocity: 0,
    currentModuleLabel: 'Curriculum in Progress',
  };

  const student = data?.student;
  const featuredClass = data?.featuredClass;

  // Generate current week days (Mon - Sat) dynamically based on current date
  const getWeekDates = () => {
    const curr = new Date();
    const day = curr.getDay(); // 0 is Sun, 1 is Mon...
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(curr.getFullYear(), curr.getMonth(), diff);
    const week = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      week.push(d);
    }
    return week;
  };
  const weekDays = getWeekDates();

  const submissionPercentage =
    kpis.totalAssignments > 0
      ? Math.round((kpis.assignmentsSolved / kpis.totalAssignments) * 100)
      : 0;

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Top Welcome Banner */}
      <section className="w-full pt-6 pb-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-surface-container-low via-surface-container to-surface-variant p-6 lg:p-8 shadow-xs border border-surface-container-high/40">
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none"></div>
          <div className="absolute right-32 -bottom-12 w-48 h-48 rounded-full bg-secondary-container/10 blur-2xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col gap-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary-fixed/60 text-on-primary-fixed w-fit border border-primary-fixed">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="font-label-sm text-label-sm font-semibold tracking-wide uppercase">
                  {data?.batch?.name ? data.batch.name : 'No Cohort Assigned'}
                </span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
                Welcome back, {student?.name?.split(' ')[0] || 'Student'}! 👋
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {data?.batch?.name
                  ? `${data.batch.name}${data.batch.classroom ? ` • Classroom: ${data.batch.classroom}` : ''}`
                  : 'Awaiting Cohort Assignment by Administrator'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              {liveAttendance?.isCheckedIn ? (
                /* Actively Checked In State: Live Ticking Stopwatch & Check-Out Button */
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-surface-container-lowest/90 border border-emerald-500/40 p-4 rounded-2xl shadow-sm backdrop-blur-xs">
                  <div className="flex flex-col items-start min-w-[170px]">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                      </span>
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                        In Classroom Session
                      </span>
                    </div>
                    <div className="font-mono text-headline-sm text-[26px] font-black text-on-surface tabular-nums tracking-tight mt-0.5">
                      {formatStopwatch(elapsedSeconds)}
                    </div>
                    <span className="text-[11px] text-on-surface-variant">
                      Checked in: {liveAttendance.checkInTime ? new Date(liveAttendance.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCheckoutModal(true)}
                    disabled={isSubmittingAttendance}
                    className="px-5 py-3 rounded-xl bg-rose-600 text-white font-bold text-body-sm hover:bg-rose-700 shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                    <span>Check Out</span>
                  </button>
                </div>
              ) : liveAttendance?.hasCompletedToday ? (
                /* Completed Today State: Clean Status Badge & Summary (No Re-Check-In) */
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-surface-container-lowest border border-emerald-500/40 shadow-xs">
                    <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                      <span className="material-symbols-outlined text-[24px]">verified</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-body-sm font-bold text-emerald-800">
                          Today's Attendance Recorded ({liveAttendance.status})
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                          Checked Out ✓
                        </span>
                      </div>
                      <span className="text-[12px] text-on-surface-variant font-mono mt-0.5">
                        Duration: {liveAttendance.formattedDuration || `${liveAttendance.durationMinutes}m`} • In: {liveAttendance.checkInTime ? new Date(liveAttendance.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Logged'} • Out: {liveAttendance.checkOutTime ? new Date(liveAttendance.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Logged'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Not Checked In State: Campus Wi-Fi Status + 1-Click Check-In Button */
                <div className="flex flex-col items-stretch sm:items-end gap-2.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-lowest text-[12px] font-semibold border border-surface-container-high shadow-xs">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        liveAttendance?.wifiStatus?.isCampusWifi ? 'bg-emerald-500' : 'bg-amber-500'
                      } animate-pulse`}
                    ></span>
                    <span className="text-on-surface">
                      {liveAttendance?.wifiStatus?.isCampusWifi
                        ? `Wi-Fi: ${liveAttendance.wifiStatus.campusWifiSsid || 'Campus 5G'}`
                        : `Network: ${liveAttendance?.wifiStatus?.clientIp || 'External IP'}`}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={isSubmittingAttendance}
                    className="group relative inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-primary text-on-primary font-title-md text-title-md shadow-md hover:bg-primary/90 transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[22px] transition-transform group-hover:scale-110">
                      wifi_protected_setup
                    </span>
                    <span>{isSubmittingAttendance ? 'Verifying Wi-Fi...' : '1-Click Campus Check In'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Four Summary Metric Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 my-3">
        {/* Card 1: Attendance Progress */}
        <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow border border-surface-container-high/40">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                Attendance Rate
              </span>
              <span className="font-display-lg text-display-lg text-on-surface font-bold mt-1 tabular-nums">
                {kpis.attendanceRate}%
              </span>
            </div>
            {/* SVG Circular Progress Ring */}
            <div className="relative w-14 h-14 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-surface-container-high"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                ></path>
                <path
                  className="text-primary"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray={`${Math.round(kpis.attendanceRate)}, 100`}
                  strokeLinecap="round"
                  strokeWidth="3.5"
                ></path>
              </svg>
              <span className="absolute material-symbols-outlined text-primary text-[18px]">
                verified
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-2 border-t border-surface-container-low">
            <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${
              kpis.totalEligibleClasses === 0
                ? 'bg-surface-container text-on-surface-variant'
                : kpis.attendanceRate >= 75
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-rose-50 text-rose-700'
            }`}>
              {kpis.totalEligibleClasses === 0 ? 'No Classes Yet' : kpis.attendanceRate >= 75 ? 'On Track' : 'Below 75%'}
            </span>
            <span className="font-tabular-data text-tabular-data text-on-surface-variant">
              {kpis.classesAttended} / {kpis.totalEligibleClasses} classes attended
            </span>
          </div>
        </div>

        {/* Card 2: Classes Attended */}
        <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow border border-surface-container-high/40">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                Classes Attended
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-display-lg text-display-lg text-on-surface font-bold tabular-nums">
                  {kpis.classesAttended}
                </span>
                <span className="font-title-md text-title-md text-outline">
                  / {kpis.totalEligibleClasses}
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-surface-container text-primary">
              <span className="material-symbols-outlined text-[22px]">calendar_today</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 pt-2 text-on-surface-variant font-body-sm text-body-sm border-t border-surface-container-low">
            <span className={`w-2 h-2 rounded-full ${featuredClass ? 'bg-primary animate-pulse' : 'bg-outline'} shrink-0`}></span>
            <span className="truncate">
              Next class: <strong className="text-on-surface">{featuredClass ? `${featuredClass.startTime} (${featuredClass.classroom || 'Classroom'})` : 'No upcoming classes scheduled today'}</strong>
            </span>
          </div>
        </div>

        {/* Card 3: Assignments Solved */}
        <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow border border-surface-container-high/40">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                Assignments Solved
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-display-lg text-display-lg text-on-surface font-bold tabular-nums">
                  {kpis.assignmentsSolved}
                </span>
                <span className="font-title-md text-title-md text-outline">
                  / {kpis.totalAssignments}
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-surface-container text-secondary">
              <span className="material-symbols-outlined text-[22px]">task_alt</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-2 border-t border-surface-container-low">
            <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${
              kpis.totalAssignments === 0 ? 'bg-surface-container text-on-surface-variant' : 'bg-amber-50 text-amber-800'
            }`}>
              {kpis.totalAssignments === 0 ? 'No Assignments' : `${kpis.pendingGrading} Pending Review`}
            </span>
            <span className="font-tabular-data text-tabular-data text-on-surface-variant font-medium">
              {kpis.totalAssignments > 0 ? `${submissionPercentage}% Submitted` : 'None Issued'}
            </span>
          </div>
        </div>

        {/* Card 4: Curriculum Velocity */}
        <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow border border-surface-container-high/40">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                Curriculum Velocity
              </span>
              <span className="font-display-lg text-display-lg text-on-surface font-bold mt-1 tabular-nums">
                {kpis.curriculumVelocity}%
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-surface-container text-tertiary">
              <span className="material-symbols-outlined text-[22px]">auto_stories</span>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-1.5 pt-2 border-t border-surface-container-low">
            <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${kpis.curriculumVelocity}%` }}
              ></div>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
              {kpis.currentModuleLabel}
            </span>
          </div>
        </div>
      </section>

      {/* Main Content Columns: 8 cols & 4 cols Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* a) Today's Class Session Featured Hero Card (Rendered only if active session exists) */}
          {featuredClass ? (
            <div className="relative overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm p-6 flex flex-col gap-5 border border-surface-container-high/40">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                  </span>
                  <span className="font-label-sm text-label-sm font-bold tracking-wider uppercase">
                    {featuredClass.status === 'LIVE' ? 'Live Class In Progress' : 'Scheduled Session'}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                  <span>{featuredClass.startTime} – {featuredClass.endTime}</span>
                  {featuredClass.classroom && (
                    <>
                      <span className="text-outline">•</span>
                      <span className="text-primary font-semibold">{featuredClass.classroom}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                {featuredClass.moduleLabel && (
                  <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-primary">
                    {featuredClass.moduleLabel}
                  </span>
                )}
                <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight font-bold">
                  {featuredClass.topicTitle}
                </h2>
                {featuredClass.description && (
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1 leading-relaxed">
                    {featuredClass.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-surface-container-low border border-surface-container-high/40">
                <div className="flex items-center gap-3">
                  <img
                    className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-xs ring-1 ring-primary/20 bg-surface-container-high"
                    alt="Trainer"
                    src={DEFAULT_AVATAR}
                  />
                  <div className="flex flex-col">
                    <span className="font-body-sm text-body-sm font-bold text-on-surface">
                      {featuredClass.trainer?.name || 'Designated Trainer'}
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      {featuredClass.trainer?.designation || 'Lead Mentor'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:justify-end">
                  <div className="flex items-center gap-2.5 p-2 rounded-lg bg-surface-container-lowest shadow-xs text-on-surface border border-surface-container-high/40">
                    <span className="material-symbols-outlined text-secondary text-[22px]">
                      meeting_room
                    </span>
                    <div className="flex flex-col">
                      <span className="font-body-sm text-body-sm font-semibold">
                        {featuredClass.classroom || 'Classroom'}
                      </span>
                      <span className="font-label-sm text-label-sm text-outline">
                        {featuredClass.roomNumber || 'Naprocs Center'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance State Box */}
              <div className="p-4 rounded-xl bg-surface-container flex flex-col md:flex-row items-center justify-between gap-4 border border-surface-container-high/50">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-surface-container-lowest text-primary shadow-xs">
                    <span className="material-symbols-outlined text-[24px]">qr_code_2</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-title-md text-title-md text-on-surface font-semibold">
                        {featuredClass.isAttendanceOpen ? 'Live QR Session Active' : 'Attendance Standby'}
                      </span>
                      {liveAttendance?.hasCompletedToday ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-label-sm text-label-sm font-bold">
                          Checked Out ✓
                        </span>
                      ) : featuredClass.studentAlreadyMarked || liveAttendance?.isCheckedIn ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-label-sm text-label-sm font-bold">
                          Already Checked In ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-label-sm text-label-sm font-semibold">
                          Ready to Check-in
                        </span>
                      )}
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                      {featuredClass.isAttendanceOpen
                        ? 'Trainer has projected the rolling validation token. Scan before rotation.'
                        : 'Attendance window will open once the mentor initiates the rolling token.'}
                    </p>
                  </div>
                </div>

                {liveAttendance?.isCheckedIn ? (
                  <button
                    type="button"
                    onClick={() => setShowCheckoutModal(true)}
                    className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-rose-600 text-white font-body-sm text-body-sm font-semibold shadow-sm hover:bg-rose-700 transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                    <span>Check Out ({formatStopwatch(elapsedSeconds)})</span>
                  </button>
                ) : liveAttendance?.hasCompletedToday ? (
                  <div className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 font-body-sm font-semibold flex items-center justify-center gap-2 shrink-0">
                    <span className="material-symbols-outlined text-[20px] text-emerald-600">task_alt</span>
                    <span>Attendance Completed ({liveAttendance.formattedDuration || `${liveAttendance.durationMinutes}m`})</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={isSubmittingAttendance}
                    className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-primary text-on-primary font-body-sm text-body-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[20px]">wifi_protected_setup</span>
                    <span>1-Click Campus Check In</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-surface-container-high/40">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-surface-container text-primary shrink-0">
                  <span className="material-symbols-outlined text-[28px]">event_busy</span>
                </div>
                <div className="flex flex-col">
                  <h3 className="font-headline-sm text-[17px] text-on-surface font-bold">
                    No Active Class Scheduled Today
                  </h3>
                  <p className="font-body-sm text-on-surface-variant mt-0.5">
                    Classes scheduled or opened by your trainer will appear here. You can record your campus presence anytime using the Campus Check-In button.
                  </p>
                </div>
              </div>
              {!liveAttendance?.isCheckedIn && !liveAttendance?.hasCompletedToday && (
                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={isSubmittingAttendance}
                  className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">wifi</span>
                  <span>1-Click Check In</span>
                </button>
              )}
              {liveAttendance?.hasCompletedToday && (
                <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 text-body-sm font-semibold flex items-center gap-2 shrink-0">
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">task_alt</span>
                  <span>Attendance Recorded for Today</span>
                </div>
              )}
            </div>
          )}

          {/* b) Authentic Weekly Attendance Logs from Admin & Trainer */}
          <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col gap-4 border border-surface-container-high/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-col">
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Weekly Attendance Log
                </h3>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Current Week Records ({weekDays[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {weekDays[5].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
                </span>
              </div>
              <a
                href="/attendance"
                className="font-label-sm text-label-sm text-primary font-semibold hover:underline flex items-center gap-1 self-start sm:self-auto"
              >
                <span>View Full Register</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </a>
            </div>

            {data?.weeklyRecords && data.weeklyRecords.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-body-sm border-collapse">
                  <thead>
                    <tr className="border-b border-surface-container-high text-on-surface-variant text-[12px] uppercase tracking-wider font-semibold">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Class / Topic</th>
                      <th className="py-2.5 px-3">Check-In</th>
                      <th className="py-2.5 px-3">Check-Out</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Network</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-low">
                    {data.weeklyRecords.map((r: any) => {
                      const hours = Math.floor((r.durationMinutes || 0) / 60);
                      const mins = (r.durationMinutes || 0) % 60;
                      const durationStr =
                        r.durationMinutes > 0
                          ? hours > 0
                            ? `${hours}h ${mins}m`
                            : `${mins}m`
                          : r.checkInTime && !r.checkOutTime
                          ? 'In Class (Active)'
                          : '—';

                      return (
                        <tr key={r._id} className="hover:bg-surface-container-low/50 transition-colors">
                          <td className="py-3 px-3 font-semibold text-on-surface whitespace-nowrap">
                            {new Date(r.attendanceDate).toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-3 font-medium text-on-surface">
                            {r.classSession?.topicTitle || data?.batch?.name || 'Classroom Session'}
                          </td>
                          <td className="py-3 px-3 font-mono text-[12px] text-on-surface-variant">
                            {r.checkInTime
                              ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </td>
                          <td className="py-3 px-3 font-mono text-[12px] text-on-surface-variant">
                            {r.checkOutTime
                              ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : r.checkInTime
                              ? 'Active Session'
                              : '—'}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-[12px] text-on-surface">
                            {durationStr}
                          </td>
                          <td className="py-3 px-3 text-[12px]">
                            {r.verificationMethod === 'WIFI_CHECKIN' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md">
                                <span className="material-symbols-outlined text-[13px]">wifi</span>
                                Campus Wi-Fi
                              </span>
                            ) : (
                              <span className="text-outline text-[12px]">{r.verificationMethod || 'Verified'}</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-bold ${
                                r.status === 'PRESENT'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : r.status === 'HALF_DAY'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : r.status === 'LATE'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-on-surface-variant flex flex-col items-center justify-center gap-2">
                <div className="p-3 rounded-2xl bg-surface-container text-outline">
                  <span className="material-symbols-outlined text-[28px]">event_available</span>
                </div>
                <span className="font-body-md font-semibold text-on-surface">
                  No attendance sessions recorded for this week yet.
                </span>
                <p className="font-body-sm text-outline max-w-md">
                  When you check in on campus Wi-Fi or your trainer logs attendance, verified session records will be displayed here.
                </p>
              </div>
            )}
          </div>

          {/* c) Pending Assignments & Labs (100% Dynamic from MongoDB Atlas) */}
          <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col gap-4 border border-surface-container-high/40">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Assignments &amp; Hands-on Labs
                </h3>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Continuous practical evaluations
                </span>
              </div>
              <a
                href="/assignments"
                className="font-label-sm text-label-sm text-primary font-semibold hover:underline flex items-center gap-1"
              >
                <span>View All ({data?.assignments?.length || 0})</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </a>
            </div>

            <div className="flex flex-col gap-3 mt-1">
              {data?.assignments && data.assignments.length > 0 ? (
                data.assignments.map((assignment: any) => {
                  const isGraded = assignment.submissionStatus === 'GRADED';
                  const isSubmitted = assignment.submissionStatus === 'SUBMITTED' || assignment.isSubmitted;

                  return (
                    <div
                      key={assignment.id}
                      className="p-4 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 border border-surface-container-high/30"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`p-2.5 rounded-lg bg-surface-container-lowest shadow-xs ${
                            isGraded
                              ? 'text-emerald-700'
                              : isSubmitted
                              ? 'text-primary'
                              : 'text-amber-700'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[22px]">
                            {isGraded ? 'check_circle' : isSubmitted ? 'cloud_done' : 'code'}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-body-md text-body-md font-bold text-on-surface">
                              {assignment.title}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md font-label-sm text-label-sm font-semibold ${
                                isGraded
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isSubmitted
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {assignment.submissionStatus || 'Pending'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2.5 mt-1 font-body-sm text-body-sm text-on-surface-variant">
                            {assignment.dueDate && (
                              <span className="flex items-center gap-1 text-outline font-medium">
                                <span className="material-symbols-outlined text-[16px]">alarm</span>
                                <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                              </span>
                            )}
                            {assignment.moduleLabel && (
                              <>
                                <span>•</span>
                                <span>{assignment.moduleLabel}</span>
                              </>
                            )}
                          </div>
                          {assignment.mentorFeedback && (
                            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5">
                              Mentor note:{' '}
                              <span className="italic text-on-surface">
                                "{assignment.mentorFeedback}"
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        {isGraded && assignment.score !== undefined && assignment.score !== null ? (
                          <div className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 font-tabular-data text-tabular-data font-bold">
                            {assignment.score} / {assignment.totalPoints || 20} pts
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              setSelectedAssignment({
                                id: assignment.id,
                                title: assignment.title,
                              })
                            }
                            type="button"
                            className="px-4 py-2 rounded-lg bg-primary text-on-primary font-body-sm text-body-sm font-medium hover:bg-primary-container shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                            <span>{isSubmitted ? 'Resubmit Work' : 'Submit Work'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-on-surface-variant flex flex-col items-center gap-1.5">
                  <span className="material-symbols-outlined text-outline text-[32px]">assignment</span>
                  <span className="font-body-md font-medium">No assignments assigned yet.</span>
                  <span className="font-body-sm text-outline">Practical tasks issued by your instructor will appear here.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Student Profile Card (Authentic Data Only) */}
          <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col gap-4 border border-surface-container-high/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">badge</span>
                <span className="font-title-md text-title-md text-on-surface font-semibold">
                  Student Profile
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-bold ${
                data?.batch?.id ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-container text-on-surface-variant'
              }`}>
                {data?.batch?.id ? 'ENROLLED' : 'PENDING'}
              </span>
            </div>

            <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high/30">
              <img
                className="w-12 h-12 rounded-xl object-cover shrink-0 bg-surface-container-high ring-1 ring-surface-container-highest"
                src={DEFAULT_AVATAR}
                alt={student?.name || 'Student'}
              />
              <div className="flex flex-col min-w-0">
                <span className="font-body-sm font-bold text-on-surface truncate">
                  {student?.name || 'Student'}
                </span>
                <span className="font-label-sm text-outline font-mono text-[11px] truncate">
                  Roll ID: {student?.studentId || 'Awaiting ID'}
                </span>
                <span className="font-label-sm text-on-surface-variant text-[11px] truncate">
                  {student?.email}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1 text-body-sm">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-on-surface-variant">Assigned Batch:</span>
                <span className="font-semibold text-on-surface">
                  {data?.batch?.name || 'Not Assigned'}
                </span>
              </div>
              {data?.batch?.code && (
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-on-surface-variant">Batch Code:</span>
                  <span className="font-mono text-on-surface">{data.batch.code}</span>
                </div>
              )}
              {data?.batch?.classroom && (
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-on-surface-variant">Classroom / Lab:</span>
                  <span className="font-medium text-on-surface">{data.batch.classroom}</span>
                </div>
              )}
              {data?.batch?.timing && (
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-on-surface-variant">Batch Timing:</span>
                  <span className="font-medium text-on-surface">{data.batch.timing}</span>
                </div>
              )}
            </div>
          </div>

          {/* a) Latest Institute Announcements (Dynamic) */}
          <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col gap-4 border border-surface-container-high/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">
                  campaign
                </span>
                <h3 className="font-title-md text-title-md text-on-surface font-semibold">
                  Institute Notices
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                {data?.notices?.length || 0} Active
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {data?.notices && data.notices.length > 0 ? (
                data.notices.map((notice: any) => (
                  <div
                    key={notice._id}
                    className="p-3.5 rounded-xl bg-surface-container-low flex flex-col gap-1.5 hover:bg-surface-container transition-colors border border-surface-container-high/30"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md font-label-sm text-label-sm font-bold uppercase tracking-wider ${
                          notice.priority === 'HIGH' || notice.priority === 'PRIORITY'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        {notice.priority || 'Notice'}
                      </span>
                      <span className="font-label-sm text-label-sm text-outline">
                        {new Date(notice.createdAt || Date.now()).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm font-semibold text-on-surface leading-snug">
                      {notice.title}
                    </p>
                    {notice.description && (
                      <span className="font-label-sm text-label-sm text-on-surface-variant line-clamp-2">
                        {notice.description}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-on-surface-variant text-body-sm">
                  No active announcements posted.
                </div>
              )}
            </div>
          </div>

          {/* b) Upcoming Quizzes & Assessments (Dynamic) */}
          <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col gap-4 border border-surface-container-high/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">quiz</span>
                <h3 className="font-title-md text-title-md text-on-surface font-semibold">
                  Upcoming Tests
                </h3>
              </div>
              <a
                href="/quizzes"
                className="font-label-sm text-label-sm text-primary font-medium hover:underline cursor-pointer"
              >
                View Tests
              </a>
            </div>

            <div className="flex flex-col gap-3">
              {data?.quizzes && data.quizzes.length > 0 ? (
                data.quizzes.map((quiz: any) => (
                  <div
                    key={quiz._id}
                    className="p-4 rounded-xl bg-primary-fixed/30 flex flex-col gap-3 border border-primary/10"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col">
                        <span className="font-body-sm text-body-sm font-bold text-on-surface">
                          {quiz.title}
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                          {quiz.durationMinutes || 20} Mins Duration
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-surface-container-lowest font-label-sm text-label-sm text-primary font-bold shadow-xs">
                        {quiz.totalPoints || 20} Pts
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 font-body-sm text-body-sm">
                      <span className="flex items-center gap-1.5 text-on-surface-variant">
                        <span className="material-symbols-outlined text-[16px] text-primary">
                          event_available
                        </span>
                        <span>
                          {quiz.scheduledAt
                            ? new Date(quiz.scheduledAt).toLocaleDateString()
                            : 'Available Now'}
                        </span>
                      </span>
                      <a
                        href="/quizzes"
                        className="px-3 py-1 rounded-md bg-primary text-on-primary font-label-sm text-label-sm font-semibold hover:bg-primary-container transition-colors"
                      >
                        Prepare
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-on-surface-variant text-body-sm">
                  No upcoming tests scheduled.
                </div>
              )}
            </div>
          </div>

          {/* c) Recently Uploaded Study Materials (Dynamic) */}
          <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col gap-4 border border-surface-container-high/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-[22px]">
                  folder_open
                </span>
                <h3 className="font-title-md text-title-md text-on-surface font-semibold">
                  Course Materials
                </h3>
              </div>
              <a
                href="/materials"
                className="font-label-sm text-label-sm text-primary font-medium hover:underline cursor-pointer"
              >
                All Files
              </a>
            </div>

            <div className="flex flex-col gap-2.5">
              {data?.materials && data.materials.length > 0 ? (
                data.materials.map((mat: any) => (
                  <div
                    key={mat._id}
                    className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between gap-3 hover:bg-surface-container transition-colors border border-surface-container-high/30"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0">
                        <span className="material-symbols-outlined text-[20px]">
                          {mat.fileType === 'pdf' ? 'picture_as_pdf' : 'folder_zip'}
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-body-sm text-body-sm font-semibold text-on-surface truncate">
                          {mat.title}
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          {mat.moduleLabel || 'Course Document'} • {mat.fileSizeFormatted || 'Resource'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        alert(`Downloading "${mat.title}" from Naprocs Secure Learning Cloud...`)
                      }
                      className="p-2 rounded-lg hover:bg-surface-container-lowest text-primary transition-colors shrink-0 cursor-pointer"
                      title="Download Document"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[20px]">download</span>
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-on-surface-variant text-body-sm">
                  No study materials uploaded for this course yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 1-Click Check-Out Confirmation Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-surface-container-lowest shadow-2xl p-6 flex flex-col gap-4 border border-surface-container-high animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-100 text-amber-700">
                <span className="material-symbols-outlined text-[26px]">schedule</span>
              </div>
              <div>
                <h4 className="font-headline-sm text-[18px] text-on-surface font-bold">
                  Confirm Classroom Check Out
                </h4>
                <p className="text-body-sm text-on-surface-variant">
                  Finalize your active classroom attendance record
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 flex flex-col gap-2">
              <div className="flex justify-between items-center text-body-sm">
                <span className="text-on-surface-variant">Current Elapsed Time:</span>
                <span className="font-mono font-bold text-on-surface text-[16px]">
                  {formatStopwatch(elapsedSeconds)}
                </span>
              </div>
              <div className="flex justify-between items-center text-body-sm">
                <span className="text-on-surface-variant">Check-In Time:</span>
                <span className="font-mono text-on-surface">
                  {liveAttendance?.checkInTime
                    ? new Date(liveAttendance.checkInTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Today'}
                </span>
              </div>
              <div className="text-[12px] text-outline pt-1 border-t border-surface-container-high/40">
                Attended duration will be verified and sent to your trainer's dashboard. Once checked out, attendance for today is finalized and cannot be re-opened.
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleConfirmCheckOut}
                disabled={isSubmittingAttendance}
                type="button"
                className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-bold text-body-sm hover:bg-rose-700 transition-colors shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmittingAttendance ? 'Finalizing...' : 'Yes, Check Out Now'}
              </button>
              <button
                onClick={() => setShowCheckoutModal(false)}
                type="button"
                className="px-4 py-3 rounded-xl bg-surface-container text-on-surface font-semibold text-body-sm hover:bg-surface-container-high cursor-pointer"
              >
                Keep In Class
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campus Wi-Fi Security / Home Login Block Modal */}
      {wifiRestrictionAlert?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-surface-container-lowest shadow-2xl p-6 flex flex-col gap-4 border border-rose-300 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-rose-100 text-rose-700">
                <span className="material-symbols-outlined text-[28px]">wifi_off</span>
              </div>
              <div>
                <h4 className="font-headline-sm text-[18px] text-rose-900 font-bold">
                  Campus Wi-Fi Required
                </h4>
                <p className="text-body-sm text-on-surface-variant">
                  Home / External Check-In Restricted
                </p>
              </div>
            </div>

            <p className="text-body-sm text-on-surface leading-relaxed">
              Attendance can only be marked while physically present on campus and connected to the institute's network.
            </p>

            <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col gap-1.5 text-[12px]">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Required Campus Wi-Fi:</span>
                <span className="font-bold text-primary">{wifiRestrictionAlert.ssid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Your Detected Network IP:</span>
                <span className="font-mono font-bold text-rose-700">
                  {wifiRestrictionAlert.clientIp || 'External Network'}
                </span>
              </div>
            </div>

            <p className="text-[12px] text-outline">
              Please connect your phone or laptop to the campus Wi-Fi network and click Check In again.
            </p>

            <button
              onClick={() => setWifiRestrictionAlert(null)}
              type="button"
              className="w-full py-2.5 rounded-xl bg-surface-container-high text-on-surface font-bold text-body-sm hover:bg-surface-container-highest cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* Assignment Submit Modal */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-surface-container-lowest shadow-2xl p-6 flex flex-col gap-4 border border-surface-container-high">
            <h4 className="font-headline-sm text-[18px] text-on-surface font-bold">
              Submit Practical Assignment
            </h4>
            <p className="text-body-sm text-on-surface-variant">{selectedAssignment.title}</p>

            <div className="flex flex-col gap-1.5">
              <label className="text-label-sm font-semibold text-on-surface">
                GitHub Repository URL
              </label>
              <input
                type="url"
                required
                placeholder="https://github.com/your-username/assignment-repo"
                value={submissionRepoUrl}
                onChange={(e) => setSubmissionRepoUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSubmitAssignment}
                disabled={submittingAssignment || !submissionRepoUrl}
                type="button"
                className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-medium text-body-sm hover:bg-primary-container transition-colors disabled:opacity-50 cursor-pointer"
              >
                {submittingAssignment ? 'Submitting...' : 'Confirm Submission'}
              </button>
              <button
                onClick={() => setSelectedAssignment(null)}
                type="button"
                className="px-4 py-2.5 rounded-xl bg-surface-container text-on-surface text-body-sm hover:bg-surface-container-high cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Toast Confirmation */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-xl bg-surface-container-lowest shadow-xl flex items-center gap-3 border border-emerald-200 animate-in slide-in-from-bottom duration-300">
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
            <span className="material-symbols-outlined text-[24px]">verified</span>
          </div>
          <div className="flex flex-col">
            <span className="font-body-sm text-body-sm font-bold text-on-surface">
              {toastMessage}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {data?.batch?.name || 'Cohort'} • Cryptographically verified by server
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
