import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AttendanceTokenService } from '../services/attendanceTokenService';
import { AttendanceSession } from '../models/Attendance';

let ioInstance: SocketIOServer | null = null;
const activeIntervals = new Map<string, NodeJS.Timeout>();

export function setupSocketIO(io: SocketIOServer) {
  ioInstance = io;

  // Socket Authentication Middleware
  io.use((socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (token) {
        const decoded = jwt.verify(token, config.jwtSecret) as any;
        (socket as any).userId = decoded.userId;
        (socket as any).userRole = decoded.role;
      }
      next();
    } catch (err) {
      // Allow unauthenticated connection for public test displays if needed, but flag it
      next();
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    const userRole = (socket as any).userRole;

    if (userId) {
      socket.join(`user:${userId}`);
    }

    // Join specific class session room
    socket.on('join_session', (classSessionId: string) => {
      socket.join(`session:${classSessionId}`);
    });

    // Leave session room
    socket.on('leave_session', (classSessionId: string) => {
      socket.leave(`session:${classSessionId}`);
    });

    // Join batch room
    socket.on('join_batch', (batchId: string) => {
      socket.join(`batch:${batchId}`);
    });

    socket.on('disconnect', () => {
      // cleanup if required
    });
  });
}

export function getIO(): SocketIOServer {
  if (!ioInstance) {
    throw new Error('Socket.IO instance has not been initialized yet.');
  }
  return ioInstance;
}

/**
 * Start rotating QR code every 30 seconds for an active attendance session
 */
export function startRollingQR(
  attendanceSessionId: string,
  classSessionId: string,
  batchId: string
) {
  // Clear any existing timer for this session
  stopRollingQR(attendanceSessionId);

  let sequence = 1;

  const rotate = async () => {
    try {
      const session = await AttendanceSession.findById(attendanceSessionId);
      if (!session || session.status !== 'ACTIVE') {
        stopRollingQR(attendanceSessionId);
        return;
      }

      const { token, expiresAt } = AttendanceTokenService.generateToken(
        attendanceSessionId,
        classSessionId,
        batchId,
        sequence++
      );

      session.currentRollingToken = token;
      session.tokenExpiresAt = expiresAt;
      session.tokenSequence = sequence;
      await session.save();

      if (ioInstance) {
        ioInstance.to(`session:${classSessionId}`).emit('token_rotated', {
          token,
          expiresAt: expiresAt.toISOString(),
          sequence,
          ttlSeconds: config.attendance.qrTtlSeconds,
        });
      }
    } catch (err) {
      console.error('[RollingQR] Error rotating token:', err);
    }
  };

  // Immediate initial rotation
  rotate();

  // Setup recurring rotation timer
  const timer = setInterval(rotate, config.attendance.qrTtlSeconds * 1000);
  activeIntervals.set(attendanceSessionId, timer);
}

export function stopRollingQR(attendanceSessionId: string) {
  const timer = activeIntervals.get(attendanceSessionId);
  if (timer) {
    clearInterval(timer);
    activeIntervals.delete(attendanceSessionId);
  }
}
