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
  // Optimistic initial state: instant 0ms render from localStorage if returning user
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('naprocs_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [profile, setProfile] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('naprocs_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [enrollment, setEnrollment] = useState<Enrollment | null>(() => {
    try {
      const saved = localStorage.getItem('naprocs_enrollment');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(localStorage.getItem('naprocs_token'));

  // Only block with full-screen spinner if we have a token but NO cached user in storage
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const storedToken = localStorage.getItem('naprocs_token');
    const storedUser = localStorage.getItem('naprocs_user');
    return !!(storedToken && !storedUser);
  });

  const saveCachedAuth = (userData: User, profileData?: any, enrollmentData?: any) => {
    try {
      localStorage.setItem('naprocs_user', JSON.stringify(userData));
      if (profileData) {
        localStorage.setItem('naprocs_profile', JSON.stringify(profileData));
      }
      if (enrollmentData) {
        localStorage.setItem('naprocs_enrollment', JSON.stringify(enrollmentData));
      }
    } catch {
      // safe quota catch
    }
  };

  const clearCachedAuth = () => {
    localStorage.removeItem('naprocs_token');
    localStorage.removeItem('naprocs_user');
    localStorage.removeItem('naprocs_profile');
    localStorage.removeItem('naprocs_enrollment');
    setToken(null);
    setUser(null);
    setProfile(null);
    setEnrollment(null);
  };

  const fetchCurrentUser = async () => {
    const storedToken = localStorage.getItem('naprocs_token');
    if (!storedToken) {
      clearCachedAuth();
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.user);
        setProfile(res.data.profile);
        setEnrollment(res.data.enrollment);
        saveCachedAuth(res.data.user, res.data.profile, res.data.enrollment);
      }
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.warn('Session expired or invalid.');
        clearCachedAuth();
      }
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
        saveCachedAuth(res.data.user, res.data.profile, res.data.enrollment);
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
      clearCachedAuth();
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.user);
        setProfile(res.data.profile);
        setEnrollment(res.data.enrollment);
        saveCachedAuth(res.data.user, res.data.profile, res.data.enrollment);
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
