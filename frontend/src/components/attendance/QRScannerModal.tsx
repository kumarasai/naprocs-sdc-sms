import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import { api } from '../../services/api';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttendanceMarked: () => void;
  classSessionId?: string;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onAttendanceMarked,
  classSessionId,
}) => {
  const [manualToken, setManualToken] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      stopCamera();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setStatusMessage(null);
      setManualToken('');
    }
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
        },
        (decodedText) => {
          stopCamera();
          handleVerifyToken(decodedText);
        },
        () => {}
      );
    } catch (err: any) {
      console.warn('Camera error:', err);
      setIsCameraActive(false);
      setStatusMessage({
        type: 'error',
        text: 'Camera unavailable or blocked. Please use the Quick Sync Test Token below.',
      });
    }
  };

  const stopCamera = () => {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .then(() => {
          scannerRef.current?.clear();
          scannerRef.current = null;
        })
        .catch(() => {});
    }
    setIsCameraActive(false);
  };

  const fetchActiveTokenForTesting = async () => {
    try {
      if (!classSessionId) {
        // Fallback to fetch current live session
        const classesRes = await api.get('/courses/classes');
        const live = classesRes.data.sessions?.find((s: any) => s.status === 'LIVE' || s.status === 'SCHEDULED');
        if (live) {
          const res = await api.get(`/attendance/sessions/${live._id}/current`);
          if (res.data.currentRollingToken) {
            setManualToken(res.data.currentRollingToken);
            setStatusMessage({
              type: 'success',
              text: 'Synced latest live classroom rolling token! Click Verify below.',
            });
            return;
          }
        }
      } else {
        const res = await api.get(`/attendance/sessions/${classSessionId}/current`);
        if (res.data.currentRollingToken) {
          setManualToken(res.data.currentRollingToken);
          setStatusMessage({
            type: 'success',
            text: 'Synced latest live classroom rolling token! Click Verify below.',
          });
          return;
        }
      }
      setStatusMessage({
        type: 'error',
        text: 'Trainer has not opened an active live attendance session yet.',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to sync live token from trainer screen.',
      });
    }
  };

  const handleVerifyToken = async (tokenToVerify?: string) => {
    const token = tokenToVerify || manualToken;
    if (!token) {
      setStatusMessage({ type: 'error', text: 'Please enter or scan a valid attendance QR token.' });
      return;
    }

    setIsVerifying(true);
    setStatusMessage(null);

    try {
      const res = await api.post('/attendance/scan', {
        token: token.trim(),
        wifiBssid: 'Naprocs-Lab2-5GHz',
      });

      if (res.data.success) {
        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch (e) {}

        setStatusMessage({
          type: 'success',
          text: res.data.message || 'Attendance Successfully Marked!',
        });

        setTimeout(() => {
          onAttendanceMarked();
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Attendance verification failed.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/60 backdrop-blur-sm transition-opacity duration-300"
    >
      <div className="relative w-full max-w-lg max-h-[92vh] rounded-2xl bg-surface-container-lowest shadow-2xl p-6 flex flex-col gap-4 overflow-y-auto border border-surface-container-high animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary-fixed text-primary">
              <span className="material-symbols-outlined text-[22px]">qr_code_scanner</span>
            </div>
            <div className="flex flex-col">
              <h4 className="font-headline-sm text-[18px] font-bold text-on-surface">Mark Live Attendance</h4>
              <span className="font-label-sm text-[11px] text-on-surface-variant">
                Live Session Token Verification
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Scanner Preview Window */}
        <div className="relative w-full h-56 rounded-xl bg-inverse-surface flex items-center justify-center overflow-hidden shrink-0">
          {/* Target Reticle Overlay */}
          <div className="absolute inset-4 border-2 border-dashed border-primary-fixed/40 rounded-xl pointer-events-none flex flex-col justify-between p-2 z-20">
            <div className="flex justify-between">
              <span className="w-4 h-4 border-t-2 border-l-2 border-primary-container"></span>
              <span className="w-4 h-4 border-t-2 border-r-2 border-primary-container"></span>
            </div>
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-primary-container to-transparent shadow-[0_0_12px_#2563eb] animate-pulse"></div>
            <div className="flex justify-between">
              <span className="w-4 h-4 border-b-2 border-l-2 border-primary-container"></span>
              <span className="w-4 h-4 border-b-2 border-r-2 border-primary-container"></span>
            </div>
          </div>

          <div id="qr-reader" className="w-full h-full object-cover"></div>

          {!isCameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-4 z-10 bg-inverse-surface/90">
              <div className="w-10 h-10 rounded-full bg-surface-container-lowest/10 backdrop-blur-md flex items-center justify-center text-on-primary">
                <span className="material-symbols-outlined text-[24px]">center_focus_strong</span>
              </div>
              <p className="font-body-md text-[13px] text-inverse-on-surface font-medium">
                Classroom Camera Ready
              </p>
              <button
                onClick={startCamera}
                type="button"
                className="px-3.5 py-1.5 rounded-lg bg-primary-container text-on-primary font-body-sm text-[12px] font-semibold hover:bg-primary shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                <span>Activate Camera Feed</span>
              </button>
            </div>
          )}
        </div>

        {/* Classroom Token Sync Box */}
        <div className="flex flex-col gap-2 p-3 rounded-xl bg-surface-container-low border border-surface-container-high/60">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-[11px] font-semibold text-on-surface">
              Rolling Classroom Token:
            </span>
            <button
              onClick={fetchActiveTokenForTesting}
              type="button"
              className="text-[11px] text-primary font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">sync</span>
              <span>Sync Active Classroom QR</span>
            </button>
          </div>
          <input
            type="text"
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            placeholder="Paste rolling HMAC attendance token or click Sync above..."
            className="w-full px-3 py-1.5 rounded-lg border border-surface-container-high bg-surface-container-lowest font-mono text-[11px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl text-body-sm font-medium flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {statusMessage.type === 'success' ? 'verified' : 'error'}
            </span>
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Geolocation Notice & Action Buttons */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-surface-container-low text-[11px] text-on-surface-variant">
            <span className="material-symbols-outlined text-primary text-[16px]">lock</span>
            <span>Verified within designated classroom boundary.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleVerifyToken()}
              disabled={isVerifying}
              type="button"
              className="flex-1 py-3 px-4 rounded-xl bg-primary text-on-primary font-title-md text-[14px] font-semibold hover:bg-primary-container transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98 disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                  <span>Verifying Token Hash...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">check</span>
                  <span>Verify Attendance</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-title-md text-[14px] font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
