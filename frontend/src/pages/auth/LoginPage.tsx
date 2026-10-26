import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const authenticatedUser = await login(email, password);
      if (authenticatedUser.role === 'ADMIN') {
        navigate('/admin');
      } else if (authenticatedUser.role === 'TRAINER') {
        navigate('/trainer');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Login failed. Please verify your credentials.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-3xl shadow-xl border border-surface-container-high/40 p-8 flex flex-col gap-6">
        {/* Branding */}
        <div className="flex flex-col items-center text-center gap-2">
          <img
            alt="Naprocs Logo"
            className="h-10 w-auto object-contain"
            src="https://lh3.googleusercontent.com/aida/AEtjO1UAtfJZ71JwqlryOxOIGBgkynrx1ybjcDrdva6A300IkiZhW16ewbSTx0WabrZKfHgOeqQ-AhjZXqfAQTGtZoF8HpIZGCV7ak3FRb1z8t-vUa8y6B3ToQ6HTWi_VFU1d8p2ARIGEBeHAgaXkSVFQhSpxJejkq_qGK3aQzQQ5DIChU1zA7Bdv8UPB6HrCTuWWcFomz5AZ0Ifm7yGnQ8BvqLLWt3xTyx8uNwLCplI81i1pf0xI0tht2xMCp8O"
          />
          <h1 className="font-headline-sm text-headline-sm text-on-surface font-bold">
            Naprocs Skill Portal
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Student Learning &amp; Attendance Management System
          </p>
        </div>

        {/* Security / Notice Banner */}
        <div className="p-3.5 rounded-2xl bg-primary-fixed/20 border border-primary/20 flex items-start gap-2.5">
          <span className="material-symbols-outlined text-[20px] text-primary shrink-0 mt-0.5">
            lock
          </span>
          <div className="flex flex-col text-[12px] text-on-surface leading-snug">
            <span className="font-bold text-primary">Official Portal Sign In</span>
            <span className="text-on-surface-variant">
              Sign in with your institute email and assigned password. Access is strictly controlled based on your account role (Student, Trainer, or Administrator).
            </span>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-[12px] font-medium border border-rose-200 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-label-sm font-semibold text-on-surface">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. yourname@naprocs.com"
              className="px-3.5 py-2.5 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label-sm font-semibold text-on-surface">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="px-3.5 py-2.5 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-title-md font-bold hover:bg-primary-container shadow-md transition-all cursor-pointer mt-2 disabled:opacity-50"
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="pt-2 text-center">
          <span className="text-[12px] text-outline">
            Need account assistance? Contact your campus coordinator or administrator.
          </span>
        </div>
      </div>
    </div>
  );
};
