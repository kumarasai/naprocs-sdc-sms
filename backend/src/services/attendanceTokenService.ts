import crypto from 'crypto';
import { config } from '../config/env';

export interface AttendanceTokenPayload {
  attendanceSessionId: string;
  classSessionId: string;
  batchId: string;
  sequence: number;
  issuedAt: number;
  expiresAt: number;
}

export class AttendanceTokenService {
  private static secret = config.attendance.signingKey;

  /**
   * Generates a tamper-proof cryptographically signed rolling attendance token.
   * Format: base64(payload).signature
   */
  public static generateToken(
    attendanceSessionId: string,
    classSessionId: string,
    batchId: string,
    sequence: number,
    ttlSeconds: number = config.attendance.qrTtlSeconds
  ): { token: string; expiresAt: Date } {
    const now = Math.floor(Date.now() / 1000);
    const expiresAtSec = now + ttlSeconds;

    const payload: AttendanceTokenPayload = {
      attendanceSessionId,
      classSessionId,
      batchId,
      sequence,
      issuedAt: now,
      expiresAt: expiresAtSec,
    };

    const payloadString = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(payloadString)
      .digest('base64url');

    const token = `${payloadString}.${signature}`;
    return {
      token,
      expiresAt: new Date(expiresAtSec * 1000),
    };
  }

  /**
   * Verifies the authenticity, cryptographic integrity, and expiration of an attendance token.
   */
  public static verifyToken(token: string): {
    isValid: boolean;
    reason?: string;
    payload?: AttendanceTokenPayload;
  } {
    if (!token || typeof token !== 'string') {
      return { isValid: false, reason: 'Missing or malformed attendance token.' };
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
      return { isValid: false, reason: 'Invalid token structure. Tampered QR code.' };
    }

    const [payloadString, signature] = parts;

    // Verify HMAC SHA-256 signature
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(payloadString)
      .digest('base64url');

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return { isValid: false, reason: 'Cryptographic signature mismatch. Token is forged or corrupted.' };
    }

    // Decode and parse payload
    try {
      const decodedJson = Buffer.from(payloadString, 'base64url').toString('utf-8');
      const payload: AttendanceTokenPayload = JSON.parse(decodedJson);

      const now = Math.floor(Date.now() / 1000);

      // Allow 5-second grace period for camera capture delay / slight network latency
      if (now > payload.expiresAt + 5) {
        return {
          isValid: false,
          reason: `Token expired ${(now - payload.expiresAt)}s ago. Please scan the newly refreshed QR code.`,
          payload,
        };
      }

      return { isValid: true, payload };
    } catch (err) {
      return { isValid: false, reason: 'Failed to decode attendance token payload.' };
    }
  }
}
