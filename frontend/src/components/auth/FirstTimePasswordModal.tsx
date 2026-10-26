import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export const FirstTimePasswordModal: React.FC = () => {
  const { user, completeFirstTimePassword, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // If user does not require a password change, do not render modal
  if (!user?.mustChangePassword) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter carefully.');
      return;
    }

    setIsSubmitting(true);
    try {
      await completeFirstTimePassword(newPassword);
      setSuccess('Your new password has been successfully saved in the database! Welcome.');
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-on-background/70 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl bg-surface-container-lowest shadow-2xl p-6 sm:p-8 flex flex-col gap-5 border border-surface-container-high animate-in fade-in zoom-in-95 duration-200">
        {/* Header Icon & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[26px]">lock_reset</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Security Verification Required
            </span>
            <h2 className="font-headline-sm text-[20px] font-bold text-on-surface">
              Change Your Password
            </h2>
          </div>
        </div>

        {/* Informative Security Notice */}
        <div className="p-3.5 rounded-xl bg-primary-fixed/20 border border-primary/20 text-on-surface text-[13px] leading-relaxed flex items-start gap-2.5">
          <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">
            shield
          </span>
          <p>
            Welcome, <strong className="font-semibold text-on-surface">{user.name}</strong>! This is your first login.
            For account protection, you must replace the temporary administrator password with a private password of your choice.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[13px] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-rose-600">error</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
            <span>{success}</span>
          </div>
        )}

        {/* Change Password Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-label-sm font-semibold text-on-surface">
              New Private Password <span className="text-error">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password (min. 6 chars)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label-sm font-semibold text-on-surface">
              Confirm New Password <span className="text-error">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type your new password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 pr-10"
              />
            </div>
          </div>

          {/* Validation Indicators */}
          <div className="flex flex-col gap-1 text-[12px] text-on-surface-variant pt-1">
            <div className="flex items-center gap-1.5">
              <span
                className={`material-symbols-outlined text-[15px] ${
                  newPassword.length >= 6 ? 'text-emerald-600' : 'text-outline'
                }`}
              >
                {newPassword.length >= 6 ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <span>Minimum 6 characters in length</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`material-symbols-outlined text-[15px] ${
                  newPassword.length >= 6 && newPassword === confirmPassword
                    ? 'text-emerald-600'
                    : 'text-outline'
                }`}
              >
                {newPassword.length >= 6 && newPassword === confirmPassword
                  ? 'check_circle'
                  : 'radio_button_unchecked'}
              </span>
              <span>Passwords match identically</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || newPassword.length < 6 || newPassword !== confirmPassword}
              className="w-full py-2.5 px-4 rounded-xl bg-primary text-on-primary font-semibold text-body-sm hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">
                    progress_activity
                  </span>
                  <span>Saving In Database...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>Save Password &amp; Continue</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2 px-4 rounded-xl text-on-surface-variant hover:text-on-surface text-[12px] font-medium hover:bg-surface-container-low transition-colors cursor-pointer text-center"
            >
              Sign Out &amp; Return Later
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
