import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/naprocs_lms',
  jwtSecret: process.env.JWT_SECRET || 'naprocs_default_jwt_secret_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieSecret: process.env.COOKIE_SECRET || 'naprocs_cookie_secret_key',
  attendance: {
    qrTtlSeconds: parseInt(process.env.ATTENDANCE_QR_TTL_SECONDS || '30', 10),
    signingKey: process.env.ATTENDANCE_SIGNING_KEY || 'naprocs_attendance_qr_signing_key_2026',
    lateThresholdMinutes: parseInt(process.env.ATTENDANCE_LATE_THRESHOLD_MINUTES || '15', 10),
    absentThresholdMinutes: parseInt(process.env.ATTENDANCE_ABSENT_THRESHOLD_MINUTES || '45', 10),
  },
  institute: {
    name: process.env.INSTITUTE_NAME || 'Naprocs Skill Development Center',
    timezone: process.env.INSTITUTE_TIMEZONE || 'Asia/Kolkata',
  },
};
