import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinSession: (classSessionId: string) => void;
  leaveSession: (classSessionId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const getSocketUrl = (): string => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  }
  return 'http://127.0.0.1:5000';
};

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const socketUrl = getSocketUrl();
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('[Socket.IO] Connected to backend event hub');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('[Socket.IO] Disconnected');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  const joinSession = (classSessionId: string) => {
    if (socket && isConnected) {
      socket.emit('join_session', classSessionId);
    }
  };

  const leaveSession = (classSessionId: string) => {
    if (socket && isConnected) {
      socket.emit('leave_session', classSessionId);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinSession, leaveSession }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
