import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export const SettingsPage: React.FC = () => {
  const { role } = useAuth();
  const [settings, setSettings] = useState<any>({
    instituteName: 'Naprocs Skill Development Center',
    portalSubtitle: 'Node.js & Software Training Hub',
    contactEmail: 'contact@naprocs.com',
    contactPhone: '+91 98765 43210',
    address: 'Naprocs Tech Center, Lab 2, 2nd Floor, Hi-Tech City, Hyderabad',
    timezone: 'Asia/Kolkata',
    qrRefreshIntervalSeconds: 30,
    qrLateToleranceMinutes: 15,
    qrAbsentToleranceMinutes: 45,
    antiProxyStrictness: 'MODERATE',
    campusWifiEnabled: true,
    campusWifiSsid: 'Naprocs-Campus-5G',
    allowedWifiIps: ['127.0.0.1', '::1', 'localhost', '*'],
    minAttendanceHoursForPresent: 1,
  });
  const [allowedIpsInput, setAllowedIpsInput] = useState<string>('127.0.0.1\n::1\nlocalhost\n*');
  const [detectedIp, setDetectedIp] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/communication/settings');
        if (res.data.success && res.data.settings) {
          setSettings(res.data.settings);
          if (Array.isArray(res.data.settings.allowedWifiIps)) {
            setAllowedIpsInput(res.data.settings.allowedWifiIps.join('\n'));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchNetworkInfo = async () => {
      try {
        const netRes = await api.get('/attendance/network-info');
        if (netRes.data.success && netRes.data.detectedIp) {
          setDetectedIp(netRes.data.detectedIp);
        }
      } catch (e) {
        // network info check
      }
    };

    fetchSettings();
    fetchNetworkInfo();
  }, []);

  const handleAddCurrentIp = () => {
    if (!detectedIp) return;
    const currentList = allowedIpsInput.split('\n').map((s) => s.trim()).filter(Boolean);
    if (!currentList.includes(detectedIp)) {
      const updated = [...currentList, detectedIp].join('\n');
      setAllowedIpsInput(updated);
      setToastMessage(`Added ${detectedIp} to allowed campus Wi-Fi IPs! Click "Save System Settings" to apply.`);
      setTimeout(() => setToastMessage(null), 4000);
    } else {
      setToastMessage(`IP ${detectedIp} is already in the allowed list.`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'ADMIN') {
      setToastMessage('Only administrators have permissions to modify institute settings.');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    setIsSaving(true);
    try {
      const parsedIps = allowedIpsInput
        .split('\n')
        .map((ip) => ip.trim())
        .filter(Boolean);

      const payload = {
        ...settings,
        allowedWifiIps: parsedIps,
      };

      const res = await api.put('/communication/settings', payload);
      if (res.data.success) {
        setSettings(payload);
        setToastMessage('Institute & Campus Wi-Fi configuration successfully saved.');
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err: any) {
      setToastMessage(err.response?.data?.message || 'Failed to save settings.');
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsSaving(false);
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
            Loading settings...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-16 pt-6 gap-6 max-w-4xl">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 max-w-md p-4 rounded-xl bg-surface-container-lowest shadow-2xl flex items-center gap-3 border border-primary/20 animate-in slide-in-from-top duration-300">
          <span className="material-symbols-outlined text-primary text-[24px]">info</span>
          <span className="text-body-sm font-semibold text-on-surface">{toastMessage}</span>
        </div>
      )}

      <div>
        <h1 className="font-headline-md text-headline-md text-on-surface font-bold">
          Institute &amp; Campus Attendance Configuration
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Naprocs Skill Development Center network parameters, 1-click campus Wi-Fi security, and attendance policies
        </p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Campus Wi-Fi Attendance Restriction (KEY REQUIREMENT) */}
        <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-primary/30 flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[26px]">wifi_lock</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-[17px] text-on-surface font-bold">
                  Campus Wi-Fi Attendance Restriction
                </h3>
                <p className="text-body-sm text-on-surface-variant">
                  Restricts 1-click student check-in so attendance cannot be marked from home or external networks.
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                disabled={role !== 'ADMIN'}
                checked={!!settings.campusWifiEnabled}
                onChange={(e) => setSettings({ ...settings, campusWifiEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-label-sm font-semibold text-on-surface">
                Campus Wi-Fi Network SSID / Name
              </label>
              <input
                type="text"
                disabled={role !== 'ADMIN'}
                value={settings.campusWifiSsid || ''}
                placeholder="e.g. Naprocs-Campus-5G"
                onChange={(e) => setSettings({ ...settings, campusWifiSsid: e.target.value })}
                className="px-3.5 py-2.5 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-70 font-mono"
              />
              <span className="text-[11px] text-outline">Displayed to students during check-in verification</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-label-sm font-semibold text-on-surface">
                Minimum Duration for Full Present (Hours)
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                disabled={role !== 'ADMIN'}
                value={settings.minAttendanceHoursForPresent || 1}
                onChange={(e) =>
                  setSettings({ ...settings, minAttendanceHoursForPresent: Number(e.target.value) })
                }
                className="px-3.5 py-2.5 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-70"
              />
              <span className="text-[11px] text-outline">
                Sessions checked out before this duration are marked as HALF_DAY
              </span>
            </div>
          </div>

          {/* Allowed IPs List */}
          <div className="flex flex-col gap-2 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-label-sm font-semibold text-on-surface">
                  Authorized Campus Wi-Fi Router Public IPs
                </label>
                <p className="text-[12px] text-on-surface-variant">
                  One IP address or CIDR per line. Use <code className="bg-surface-container px-1 py-0.5 rounded text-primary font-mono">*</code> to permit all networks (for testing/bypass).
                </p>
              </div>

              {detectedIp && role === 'ADMIN' && (
                <button
                  type="button"
                  onClick={handleAddCurrentIp}
                  className="px-3.5 py-1.5 rounded-xl bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80 text-[12px] font-semibold flex items-center gap-1.5 cursor-pointer self-start transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">add_location_alt</span>
                  <span>Add Detected IP ({detectedIp})</span>
                </button>
              )}
            </div>

            <textarea
              rows={4}
              disabled={role !== 'ADMIN'}
              value={allowedIpsInput}
              onChange={(e) => setAllowedIpsInput(e.target.value)}
              placeholder="127.0.0.1&#10;::1&#10;192.168.1.*&#10;*"
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-70 leading-relaxed"
            />

            {detectedIp && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low border border-surface-container-high text-[12px] text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-primary">sensors</span>
                <span>
                  Your current detected network IP: <strong className="text-on-surface font-mono">{detectedIp}</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Institute Profile */}
        <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex flex-col gap-4">
          <h3 className="font-headline-sm text-[16px] text-on-surface font-bold">
            Institute Profile
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-label-sm font-semibold text-on-surface">Institute Name</label>
              <input
                type="text"
                disabled={role !== 'ADMIN'}
                value={settings.instituteName || ''}
                onChange={(e) => setSettings({ ...settings, instituteName: e.target.value })}
                className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-70"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-label-sm font-semibold text-on-surface">Official Timezone</label>
              <input
                type="text"
                disabled
                value={settings.timezone || 'Asia/Kolkata'}
                className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm opacity-70"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label-sm font-semibold text-on-surface">Physical Campus Address</label>
            <input
              type="text"
              disabled={role !== 'ADMIN'}
              value={settings.address || ''}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-70"
            />
          </div>
        </div>

        {role === 'ADMIN' && (
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary text-on-primary font-body-sm font-bold hover:bg-primary-container shadow-md transition-all self-start cursor-pointer active:scale-98"
          >
            {isSaving ? 'Saving Configurations...' : 'Save System Settings'}
          </button>
        )}
      </form>
    </div>
  );
};

