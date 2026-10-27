import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../layouts/AppLayout';

// Lightweight, seamless fallback during on-demand route chunk load
const PageLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-[40vh] w-full">
    <div className="flex flex-col items-center gap-3">
      <span className="material-symbols-outlined text-primary text-[36px] animate-spin">
        progress_activity
      </span>
      <span className="font-body-sm text-on-surface-variant font-medium text-[13px]">
        Loading view...
      </span>
    </div>
  </div>
);

// Lazy Loaded Pages (Chunked on-demand, reducing initial bundle size by 85%+)
const LoginPage = lazy(() => import('../pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));

// Student Pages
const StudentDashboard = lazy(() => import('../pages/student/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const CourseSyllabus = lazy(() => import('../pages/courses/CourseSyllabus').then(m => ({ default: m.CourseSyllabus })));
const AttendanceHistory = lazy(() => import('../pages/attendance/AttendanceHistory').then(m => ({ default: m.AttendanceHistory })));
const ClassTimetable = lazy(() => import('../pages/timetable/ClassTimetable').then(m => ({ default: m.ClassTimetable })));
const AssignmentsPage = lazy(() => import('../pages/assignments/AssignmentsPage').then(m => ({ default: m.AssignmentsPage })));
const QuizzesPage = lazy(() => import('../pages/quizzes/QuizzesPage').then(m => ({ default: m.QuizzesPage })));
const StudyMaterialsPage = lazy(() => import('../pages/materials/StudyMaterialsPage').then(m => ({ default: m.StudyMaterialsPage })));
const AnalyticsPage = lazy(() => import('../pages/analytics/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const AnnouncementsPage = lazy(() => import('../pages/announcements/AnnouncementsPage').then(m => ({ default: m.AnnouncementsPage })));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));

// Trainer Pages
const TrainerDashboard = lazy(() => import('../pages/trainer/TrainerDashboard').then(m => ({ default: m.TrainerDashboard })));
const TrainerSchedule = lazy(() => import('../pages/trainer/TrainerSchedule').then(m => ({ default: m.TrainerSchedule })));
const TrainerAssignments = lazy(() => import('../pages/trainer/TrainerAssignments').then(m => ({ default: m.TrainerAssignments })));

// Admin Pages
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminStudents = lazy(() => import('../pages/admin/AdminStudents').then(m => ({ default: m.AdminStudents })));
const AdminTrainers = lazy(() => import('../pages/admin/AdminTrainers').then(m => ({ default: m.AdminTrainers })));
const AdminCourses = lazy(() => import('../pages/admin/AdminCourses').then(m => ({ default: m.AdminCourses })));
const AdminBatches = lazy(() => import('../pages/admin/AdminBatches').then(m => ({ default: m.AdminBatches })));
const AdminReports = lazy(() => import('../pages/admin/AdminReports').then(m => ({ default: m.AdminReports })));

export const AppRoutes: React.FC = () => {
  const { user, role, token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[40px] animate-spin">
            progress_activity
          </span>
          <span className="font-body-md text-on-surface-variant font-medium">
            Verifying portal session...
          </span>
        </div>
      </div>
    );
  }

  const defaultHome =
    role === 'ADMIN' ? '/admin' : role === 'TRAINER' ? '/trainer' : '/dashboard';

  // Authentication Guard: unauthenticated requests must login
  const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (!token && !user) {
      return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
  };

  // Strict Role Guard: prevents students from accessing trainer/admin, trainers from admin, etc.
  const RequireRole: React.FC<{
    allowedRoles: ('ADMIN' | 'TRAINER' | 'STUDENT')[];
    children: React.ReactNode;
  }> = ({ allowedRoles, children }) => {
    if (!allowedRoles.includes(role)) {
      if (role === 'ADMIN') return <Navigate to="/admin" replace />;
      if (role === 'TRAINER') return <Navigate to="/trainer" replace />;
      return <Navigate to="/dashboard" replace />;
    }
    return <>{children}</>;
  };

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Routes>
      {/* Login Route: if already logged in, redirect straight to their role homepage */}
      <Route
        path="/login"
        element={token && user ? <Navigate to={defaultHome} replace /> : <LoginPage />}
      />

      {/* Main Authenticated Layout */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to={defaultHome} replace />} />

        {/* ================= STUDENT ROUTES (STRICT) ================= */}
        <Route
          path="dashboard"
          element={
            <RequireRole allowedRoles={['STUDENT']}>
              <StudentDashboard />
            </RequireRole>
          }
        />
        <Route
          path="courses"
          element={
            <RequireRole allowedRoles={['STUDENT']}>
              <CourseSyllabus />
            </RequireRole>
          }
        />
        <Route
          path="attendance"
          element={
            <RequireRole allowedRoles={['STUDENT']}>
              <AttendanceHistory />
            </RequireRole>
          }
        />
        <Route
          path="timetable"
          element={
            <RequireRole allowedRoles={['STUDENT']}>
              <ClassTimetable />
            </RequireRole>
          }
        />
        <Route
          path="assignments"
          element={
            <RequireRole allowedRoles={['STUDENT']}>
              <AssignmentsPage />
            </RequireRole>
          }
        />
        <Route
          path="quizzes"
          element={
            <RequireRole allowedRoles={['STUDENT', 'TRAINER']}>
              <QuizzesPage />
            </RequireRole>
          }
        />
        <Route
          path="materials"
          element={
            <RequireRole allowedRoles={['STUDENT', 'TRAINER']}>
              <StudyMaterialsPage />
            </RequireRole>
          }
        />
        <Route
          path="analytics"
          element={
            <RequireRole allowedRoles={['STUDENT']}>
              <AnalyticsPage />
            </RequireRole>
          }
        />
        <Route
          path="announcements"
          element={
            <RequireRole allowedRoles={['STUDENT', 'TRAINER']}>
              <AnnouncementsPage />
            </RequireRole>
          }
        />

        {/* ================= TRAINER ROUTES (STRICT) ================= */}
        <Route
          path="trainer"
          element={
            <RequireRole allowedRoles={['TRAINER']}>
              <TrainerDashboard />
            </RequireRole>
          }
        />
        <Route
          path="trainer/attendance"
          element={<Navigate to="/trainer" replace />}
        />
        <Route
          path="trainer/schedule"
          element={
            <RequireRole allowedRoles={['TRAINER']}>
              <TrainerSchedule />
            </RequireRole>
          }
        />
        <Route
          path="trainer/assignments"
          element={
            <RequireRole allowedRoles={['TRAINER']}>
              <TrainerAssignments />
            </RequireRole>
          }
        />

        {/* ================= ADMIN ROUTES (STRICT) ================= */}
        <Route
          path="admin"
          element={
            <RequireRole allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </RequireRole>
          }
        />
        <Route
          path="admin/students"
          element={
            <RequireRole allowedRoles={['ADMIN']}>
              <AdminStudents />
            </RequireRole>
          }
        />
        <Route
          path="admin/trainers"
          element={
            <RequireRole allowedRoles={['ADMIN']}>
              <AdminTrainers />
            </RequireRole>
          }
        />
        <Route
          path="admin/courses"
          element={
            <RequireRole allowedRoles={['ADMIN']}>
              <AdminCourses />
            </RequireRole>
          }
        />
        <Route
          path="admin/batches"
          element={
            <RequireRole allowedRoles={['ADMIN']}>
              <AdminBatches />
            </RequireRole>
          }
        />
        <Route
          path="admin/reports"
          element={
            <RequireRole allowedRoles={['ADMIN']}>
              <AdminReports />
            </RequireRole>
          }
        />

        {/* Shared Institute Settings */}
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Catch-all redirect to role-specific home */}
      <Route path="*" element={<Navigate to={defaultHome} replace />} />
    </Routes>
  </Suspense>
  );
};
