import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { api } from '../services/api';
import { FirstTimePasswordModal } from '../components/auth/FirstTimePasswordModal';
import { DEFAULT_AVATAR } from '../utils/avatar';

export const AppLayout: React.FC = () => {
  const { user, profile, role, logout } = useAuth();
  const { socket } = useSocket();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [activeNotifTab, setActiveNotifTab] = useState<'all' | 'assignments' | 'announcements'>('all');
  const [hasNewAlertAnimation, setHasNewAlertAnimation] = useState<boolean>(false);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const fetchAllNotifications = async () => {
    try {
      const [notifsRes, noticesRes] = await Promise.all([
        api.get('/communication/notifications'),
        api.get('/communication/announcements'),
      ]);

      if (notifsRes.data.success) {
        setNotifications(notifsRes.data.notifications || []);
        setUnreadCount(notifsRes.data.unreadCount || 0);
      }
      if (noticesRes.data.success) {
        setAnnouncements(noticesRes.data.announcements || []);
      }
    } catch (err) {
      // silent fail
    }
  };

  useEffect(() => {
    fetchAllNotifications();

    // 15-second background sync safety fallback
    const syncInterval = setInterval(fetchAllNotifications, 15000);

    if (!socket) return () => clearInterval(syncInterval);

    const onIncomingNotification = () => {
      setHasNewAlertAnimation(true);
      setTimeout(() => setHasNewAlertAnimation(false), 3000);
      fetchAllNotifications();
    };

    socket.on('notification_received', onIncomingNotification);
    socket.on('new_assignment', onIncomingNotification);
    socket.on('new_quiz', onIncomingNotification);
    socket.on('announcement_created', onIncomingNotification);

    return () => {
      clearInterval(syncInterval);
      socket.off('notification_received', onIncomingNotification);
      socket.off('new_assignment', onIncomingNotification);
      socket.off('new_quiz', onIncomingNotification);
      socket.off('announcement_created', onIncomingNotification);
    };
  }, [socket]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    if (notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notificationsOpen]);

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/communication/notifications/read');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      // silent fail
    }
  };

  const handleNotificationItemClick = async (item: any) => {
    if (!item.isRead && item._id) {
      try {
        await api.patch('/communication/notifications/read', { notificationId: item._id });
        setNotifications((prev) =>
          prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (e) {
        // silent fail
      }
    }
    setNotificationsOpen(false);
    if (item.link) {
      navigate(item.link);
    } else if (item.type === 'ASSIGNMENT') {
      navigate('/assignments');
    } else if (item.type === 'QUIZ') {
      navigate('/quizzes');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login');
    }
  };

  // Distinct Navigation Items per Role - Strict UI Separation
  const studentNavItems = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'My Course & Syllabus', path: '/courses', icon: 'menu_book' },
    { label: 'Attendance & History', path: '/attendance', icon: 'fact_check' },
    { label: 'Class Timetable & Plan', path: '/timetable', icon: 'calendar_month' },
    { label: 'My Assignments', path: '/assignments', icon: 'assignment' },
    { label: 'Quizzes & Tests', path: '/quizzes', icon: 'quiz' },
    { label: 'Study Materials', path: '/materials', icon: 'folder_special' },
    { label: 'Performance Analytics', path: '/analytics', icon: 'insights' },
    { label: 'Announcements', path: '/announcements', icon: 'campaign' },
  ];

  const trainerNavItems = [
    { label: 'Trainer Console', path: '/trainer', icon: 'dashboard' },
    { label: 'Class Schedule & Plan', path: '/trainer/schedule', icon: 'calendar_month' },
    { label: 'Assignments & Grading', path: '/trainer/assignments', icon: 'assignment_turned_in' },
    { label: 'Quizzes & Tests', path: '/quizzes', icon: 'quiz' },
    { label: 'Study Materials', path: '/materials', icon: 'folder_special' },
    { label: 'Announcements', path: '/announcements', icon: 'campaign' },
  ];

  const adminNavItems = [
    { label: 'Admin Command Center', path: '/admin', icon: 'dashboard' },
    { label: 'Student Profiles & Reg', path: '/admin/students', icon: 'school' },
    { label: 'Trainer Profiles & Reg', path: '/admin/trainers', icon: 'badge' },
    { label: 'Courses & Curriculum', path: '/admin/courses', icon: 'menu_book' },
    { label: 'Batches & Classrooms', path: '/admin/batches', icon: 'groups' },
    { label: 'Attendance Registers', path: '/admin/reports', icon: 'assessment' },
    { label: 'Institute Settings', path: '/settings', icon: 'settings' },
  ];

  const navItems = role === 'STUDENT' ? studentNavItems : role === 'TRAINER' ? trainerNavItems : adminNavItems;

  const sectionTitle =
    role === 'STUDENT'
      ? 'Student Learning Hub'
      : role === 'TRAINER'
      ? 'Trainer Faculty Hub'
      : 'Institute Administrative Suite';

  const roleBadgeLabel =
    role === 'STUDENT'
      ? 'STUDENT PORTAL'
      : role === 'TRAINER'
      ? 'TRAINER CONSOLE'
      : 'ADMIN COMMAND CENTER';

  const attendanceHealth = (profile as any)?.attendanceHealthPercentage ?? 0;

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased flex flex-col">
      {/* Mobile Header Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-surface-container-lowest z-50 px-4 flex items-center justify-between border-b border-surface-container-high shadow-xs">
        <div className="flex items-center gap-2">
          <img
            alt="Naprocs Logo"
            className="h-7 w-auto object-contain"
            src="https://lh3.googleusercontent.com/aida/AEtjO1UAtfJZ71JwqlryOxOIGBgkynrx1ybjcDrdva6A300IkiZhW16ewbSTx0WabrZKfHgOeqQ-AhjZXqfAQTGtZoF8HpIZGCV7ak3FRb1z8t-vUa8y6B3ToQ6HTWi_VFU1d8p2ARIGEBeHAgaXkSVFQhSpxJejkq_qGK3aQzQQ5DIChU1zA7Bdv8UPB6HrCTuWWcFomz5AZ0Ifm7yGnQ8BvqLLWt3xTyx8uNwLCplI81i1pf0xI0tht2xMCp8O"
          />
          <div className="flex flex-col">
            <span className="font-headline-sm text-[16px] text-on-surface font-bold leading-tight">Naprocs</span>
            <span className="font-label-sm text-[10px] text-primary font-semibold tracking-wider">{roleBadgeLabel}</span>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-surface-container-low text-on-surface"
        >
          <span className="material-symbols-outlined text-[24px]">
            {mobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>

      {/* Sidebar (Desktop Persistent, Mobile Drawer) */}
      <aside
        className={`fixed left-0 top-0 h-screen w-72 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between overflow-y-auto transition-transform duration-300 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col">
          {/* Logo & Portal Branding */}
          <div className="px-space-lg pt-space-lg pb-space-md flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-sm">
              <img
                alt="Naprocs Logo"
                className="h-8 w-auto object-contain"
                src="https://lh3.googleusercontent.com/aida/AEtjO1UAtfJZ71JwqlryOxOIGBgkynrx1ybjcDrdva6A300IkiZhW16ewbSTx0WabrZKfHgOeqQ-AhjZXqfAQTGtZoF8HpIZGCV7ak3FRb1z8t-vUa8y6B3ToQ6HTWi_VFU1d8p2ARIGEBeHAgaXkSVFQhSpxJejkq_qGK3aQzQQ5DIChU1zA7Bdv8UPB6HrCTuWWcFomz5AZ0Ifm7yGnQ8BvqLLWt3xTyx8uNwLCplI81i1pf0xI0tht2xMCp8O"
              />
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight font-bold">
                  Naprocs
                </span>
                <span className="font-label-sm text-[10px] text-primary font-bold tracking-wider">
                  {roleBadgeLabel}
                </span>
              </div>
            </div>
            <div className="mt-space-xs inline-flex items-center gap-space-xs px-space-sm py-space-xs bg-surface-container-low rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                {role === 'STUDENT'
                  ? `Student • ${(profile as any)?.studentId || '—'}`
                  : role === 'TRAINER'
                  ? `Faculty • ${(profile as any)?.trainerId || '—'}`
                  : 'Super Admin • Full Access'}
              </span>
            </div>
          </div>

          {/* Navigation Section Title */}
          <div className="px-space-md pt-space-xs pb-space-sm">
            <span className="px-space-sm font-label-sm text-[10px] uppercase tracking-wider text-outline font-bold">
              {sectionTitle}
            </span>
          </div>

          {/* Core Navigation Items (Strictly Filtered by Role) */}
          <nav className="flex flex-col gap-0.5 px-space-md">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-space-sm px-space-sm py-2 rounded-xl transition-all ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container font-semibold shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${isActive ? 'filled' : ''}`}>
                    {item.icon}
                  </span>
                  <span className="font-body-md text-body-md">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Attendance Health & Help Hub Card */}
        <div className="p-space-md flex flex-col gap-space-xs">
          {role === 'STUDENT' && (
            <div className="p-space-sm bg-surface-container-low rounded-xl flex flex-col gap-space-xs border border-surface-container-high/40">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                  Attendance Health
                </span>
                <span className="font-label-sm text-label-sm text-primary font-bold">
                  {attendanceHealth}%
                </span>
              </div>
              <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, attendanceHealth)}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Cloud Storage
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  {(profile as any)?.storageUsedBytes
                    ? `${((profile as any).storageUsedBytes / (1024 * 1024 * 1024)).toFixed(1)} / 10 GB`
                    : '0.0 / 10 GB'}
                </span>
              </div>
            </div>
          )}

          {role === 'TRAINER' && (
            <div className="p-space-sm bg-surface-container-low rounded-xl flex flex-col gap-space-xs border border-surface-container-high/40">
              <span className="font-label-sm text-[11px] font-bold text-outline uppercase tracking-wider">
                Assigned Faculty Role
              </span>
              <span className="text-body-sm font-bold text-on-surface">
                {(profile as any)?.designation || 'Faculty Trainer'}
              </span>
              <span className="text-[11px] text-primary font-mono">
                {(profile as any)?.trainerId || user?.email || 'Verified Faculty'}
              </span>
            </div>
          )}

          {role === 'ADMIN' && (
            <div className="p-space-sm bg-surface-container-low rounded-xl flex flex-col gap-space-xs border border-surface-container-high/40">
              <span className="font-label-sm text-[11px] font-bold text-outline uppercase tracking-wider">
                Security Level
              </span>
              <span className="text-body-sm font-bold text-emerald-700 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span>Administrator (Full Control)</span>
              </span>
              <span className="text-[11px] text-on-surface-variant">
                Registration &amp; Enrollment Authority
              </span>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-space-xs">
            <button
              onClick={handleLogout}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-space-sm rounded-xl bg-error-container text-on-error-container hover:bg-error hover:text-white transition-all font-body-sm font-bold cursor-pointer shadow-xs border border-error/20"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span>Sign Out</span>
            </button>
            <button
              onClick={() => alert('Naprocs Help Hub: Technical support is available at support@naprocs.com')}
              type="button"
              className="w-full flex items-center justify-center gap-space-xs py-1.5 px-space-sm rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors text-[12px] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">help_outline</span>
              <span>Help Hub &amp; Support</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-72 flex-1 flex flex-col">
        {/* Top Header Bar */}
        <header className="fixed top-0 lg:left-72 left-0 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 px-space-lg flex items-center justify-between gap-space-md border-b border-surface-container-high/40">
          {/* Breadcrumb & Search */}
          <div className="flex items-center gap-space-md flex-1 max-w-lg">
            <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm whitespace-nowrap hidden xl:flex">
              <span>Naprocs</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              <span className="text-on-surface font-semibold">
                {role === 'STUDENT' ? 'Student Workspace' : role === 'TRAINER' ? 'Faculty Command' : 'Admin Control'}
              </span>
            </div>
            <div className="relative w-full max-w-xs">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[18px]">
                search
              </span>
              <input
                className="w-full pl-9 pr-4 py-1.5 bg-surface-container-low rounded-lg border-0 text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="Search courses, lessons, topics..."
                type="text"
              />
            </div>
          </div>

          {/* Active Status Pill */}
          <div className="hidden lg:flex items-center gap-space-xs px-space-md py-1.5 rounded-full bg-surface-container-low border border-surface-container-high/50">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span className="font-label-sm text-label-sm font-semibold text-on-surface">
              {role === 'STUDENT' ? 'Student Portal' : role === 'TRAINER' ? 'Trainer Portal' : 'Admin Command'}
            </span>
            <span className="font-label-sm text-label-sm text-outline">•</span>
            <span className="font-label-sm text-label-sm text-primary font-medium">
              Live Cloud Connected
            </span>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-space-sm relative">
            {/* Direct Logout Action Button in Header */}
            <button
              onClick={handleLogout}
              type="button"
              title="Sign Out of Portal"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-error-container text-on-surface hover:text-on-error-container transition-colors border border-surface-container-high/50 text-body-sm font-semibold cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span className="hidden sm:inline">Sign Out</span>
            </button>

            {/* Quick Calendar */}
            <NavLink
              to={role === 'TRAINER' ? '/trainer/schedule' : '/timetable'}
              className="relative p-2 rounded-lg hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              title="Class Timetable & Schedule"
            >
              <span className="material-symbols-outlined text-[20px]">calendar_today</span>
            </NavLink>

            {/* Notifications with counter */}
            <div className="relative" ref={notifDropdownRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className={`relative p-2 rounded-lg hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-all cursor-pointer ${
                  hasNewAlertAnimation ? 'animate-bounce ring-2 ring-primary/40' : ''
                }`}
                type="button"
                title="Notifications & Tasks"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                {unreadCount > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white font-label-sm text-[10px] flex items-center justify-center font-bold shadow-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : announcements.length > 0 ? (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary ring-2 ring-surface-container-lowest"></span>
                ) : null}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-high/80 p-4 z-50 animate-in fade-in zoom-in-95 backdrop-blur-md">
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">notifications_active</span>
                      <span className="font-headline-sm text-[15px] font-bold text-on-surface">
                        Notifications
                      </span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        onClick={() => setNotificationsOpen(false)}
                        className="text-[11px] text-outline hover:text-on-surface cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1.5 pt-2.5 pb-2">
                    <button
                      type="button"
                      onClick={() => setActiveNotifTab('all')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                        activeNotifTab === 'all'
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      All ({notifications.length + announcements.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveNotifTab('assignments')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                        activeNotifTab === 'assignments'
                          ? 'bg-amber-600 text-white'
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      <span>Assignments</span>
                      {notifications.filter((n) => n.type === 'ASSIGNMENT').length > 0 && (
                        <span className="px-1 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[9px] font-bold">
                          {notifications.filter((n) => n.type === 'ASSIGNMENT').length}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveNotifTab('announcements')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                        activeNotifTab === 'announcements'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      Notices ({announcements.length})
                    </button>
                  </div>

                  {/* Notification Items List */}
                  <div className="flex flex-col gap-2 pt-1 max-h-80 overflow-y-auto">
                    {/* Filtered items */}
                    {(() => {
                      const personalItems = notifications.filter((n) => {
                        if (activeNotifTab === 'assignments') return n.type === 'ASSIGNMENT';
                        if (activeNotifTab === 'announcements') return false;
                        return true;
                      });

                      const announcementItems = activeNotifTab === 'assignments' ? [] : announcements;

                      if (personalItems.length === 0 && announcementItems.length === 0) {
                        return (
                          <div className="text-center py-6 flex flex-col items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[32px] text-outline">done_all</span>
                            <p className="text-body-sm text-outline font-medium">
                              You're all caught up! No notifications.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <>
                          {/* Personal Notifications (Assignments, Quizzes, Attendance) */}
                          {personalItems.map((item) => (
                            <div
                              key={item._id}
                              onClick={() => handleNotificationItemClick(item)}
                              className={`p-3 rounded-xl transition-all cursor-pointer flex items-start gap-2.5 border ${
                                !item.isRead
                                  ? 'bg-primary-container/20 border-primary/30 shadow-xs hover:bg-primary-container/30'
                                  : 'bg-surface-container-low/70 border-surface-container-high/40 hover:bg-surface-container-low'
                              }`}
                            >
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                  item.type === 'ASSIGNMENT'
                                    ? 'bg-amber-100 text-amber-700'
                                    : item.type === 'QUIZ'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-primary-container text-on-primary-container'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  {item.type === 'ASSIGNMENT' ? 'assignment' : item.type === 'QUIZ' ? 'quiz' : 'notifications'}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                      item.type === 'ASSIGNMENT'
                                        ? 'bg-amber-100 text-amber-800'
                                        : item.type === 'QUIZ'
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}
                                  >
                                    {item.type === 'ASSIGNMENT' ? 'Assignment' : item.type === 'QUIZ' ? 'Quiz' : 'Alert'}
                                  </span>
                                  {!item.isRead && (
                                    <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0"></span>
                                  )}
                                </div>
                                <h4 className="text-[12px] font-bold text-on-surface line-clamp-1">
                                  {item.title}
                                </h4>
                                <p className="text-[11px] text-on-surface-variant line-clamp-2">
                                  {item.message}
                                </p>
                                <div className="flex items-center justify-between pt-1">
                                  <span className="text-[10px] text-outline">
                                    {new Date(item.createdAt || Date.now()).toLocaleDateString(undefined, {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  <span className="text-[10px] text-primary font-bold hover:underline flex items-center gap-0.5">
                                    View Details →
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Campus Announcements */}
                          {announcementItems.map((item) => (
                            <div
                              key={item._id}
                              onClick={() => {
                                setNotificationsOpen(false);
                                navigate('/announcements');
                              }}
                              className="p-3 rounded-xl bg-surface-container-low/50 hover:bg-surface-container-low border border-surface-container-high/40 transition-all cursor-pointer flex items-start gap-2.5"
                            >
                              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="material-symbols-outlined text-[18px]">campaign</span>
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                    {item.priority || 'Notice'}
                                  </span>
                                  <span className="text-[10px] text-outline">
                                    {new Date(item.createdAt || item.publishDate || Date.now()).toLocaleDateString()}
                                  </span>
                                </div>
                                <h4 className="text-[12px] font-semibold text-on-surface line-clamp-1">
                                  {item.title}
                                </h4>
                                <p className="text-[11px] text-on-surface-variant line-clamp-2">
                                  {item.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-surface-container-high mx-space-xs hidden sm:block"></div>

            {/* User Profile Avatar & Name */}
            <div className="flex items-center gap-space-sm">
              <img
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20 bg-surface-container-high"
                src={DEFAULT_AVATAR}
              />
              <div className="flex flex-col text-left hidden sm:flex">
                <span className="font-body-sm text-body-sm font-semibold text-on-surface leading-tight">
                  {user?.name || (role === 'ADMIN' ? 'Administrator' : role === 'TRAINER' ? 'Faculty Trainer' : 'Student')}
                </span>
                <span className="font-label-sm text-[11px] text-on-surface-variant leading-none">
                  {role === 'STUDENT'
                    ? (profile as any)?.studentId || user?.email
                    : role === 'TRAINER'
                    ? (profile as any)?.trainerId || user?.email
                    : 'System Administrator'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="relative pt-16 bg-surface min-h-screen w-full px-space-lg flex-1">
          <Outlet />
        </main>
      </div>

      {/* Mandatory First-Time Password Reset Modal */}
      <FirstTimePasswordModal />
    </div>
  );
};
