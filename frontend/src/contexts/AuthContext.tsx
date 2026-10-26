import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';
import { User, UserRole, StudentProfile, TrainerProfile, Enrollment } from '../types';

interface AuthContextType {
  user: User | null;
  profile: StudentProfile | TrainerProfile | null;
  enrollment: Enrollment | null;
  role: UserRole;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  completeFirstTimePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('naprocs_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    const storedToken = localStorage.getItem('naprocs_token');
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.user);
        setProfile(res.data.profile);
        setEnrollment(res.data.enrollment);
      }
    } catch (err) {
      console.warn('Session expired or invalid.');
      localStorage.removeItem('naprocs_token');
      setToken(null);
      setUser(null);
      setProfile(null);
      setEnrollment(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        setToken(res.data.token);
        localStorage.setItem('naprocs_token', res.data.token);
        setUser(res.data.user);
        setProfile(res.data.profile);
        setEnrollment(res.data.enrollment);
        return res.data.user;
      }
      throw new Error(res.data.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('naprocs_token');
      setToken(null);
      setUser(null);
      setProfile(null);
      setEnrollment(null);
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.user);
        setProfile(res.data.profile);
        setEnrollment(res.data.enrollment);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const completeFirstTimePassword = async (newPassword: string) => {
    const res = await api.post('/auth/first-time-password', { newPassword });
    if (res.data.success) {
      if (res.data.user) {
        setUser(res.data.user);
      } else {
        setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
      }
      return;
    }
    throw new Error(res.data.message || 'Failed to update password');
  };

  const currentRole: UserRole = user?.role || 'STUDENT';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        enrollment,
        role: currentRole,
        token,
        isLoading,
        login,
        logout,
        refreshProfile,
        completeFirstTimePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
