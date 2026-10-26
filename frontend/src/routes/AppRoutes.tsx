import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../layouts/AppLayout';
import { LoginPage } from '../pages/auth/LoginPage';

// Student Pages
import { StudentDashboard } from '../pages/student/StudentDashboard';
import { CourseSyllabus } from '../pages/courses/CourseSyllabus';
import { AttendanceHistory } from '../pages/attendance/AttendanceHistory';
import { ClassTimetable } from '../pages/timetable/ClassTimetable';
import { AssignmentsPage } from '../pages/assignments/AssignmentsPage';
import { QuizzesPage } from '../pages/quizzes/QuizzesPage';
import { StudyMaterialsPage } from '../pages/materials/StudyMaterialsPage';
import { AnalyticsPage } from '../pages/analytics/AnalyticsPage';
import { AnnouncementsPage } from '../pages/announcements/AnnouncementsPage';
import { SettingsPage } from '../pages/settings/SettingsPage';

// Trainer Pages
import { TrainerDashboard } from '../pages/trainer/TrainerDashboard';
import { TrainerSchedule } from '../pages/trainer/TrainerSchedule';
import { TrainerAssignments } from '../pages/trainer/TrainerAssignments';

// Admin Pages
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { AdminStudents } from '../pages/admin/AdminStudents';
import { AdminTrainers } from '../pages/admin/AdminTrainers';
import { AdminCourses } from '../pages/admin/AdminCourses';
import { AdminBatches } from '../pages/admin/AdminBatches';
import { AdminReports } from '../pages/admin/AdminReports';

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
  );
};
