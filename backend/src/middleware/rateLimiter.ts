import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // max 30 attempts per IP
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const attendanceScanLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // max 20 scan attempts per minute
  message: {
    success: false,
    message: 'Too many QR scan verification attempts. Please wait a moment before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
