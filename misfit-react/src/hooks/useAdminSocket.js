/* ═══════════════════════════════════════════════════════════
   useSocket — connects to Socket.io backend and joins admin-room
   Provides real-time event subscription for the admin dashboard
═══════════════════════════════════════════════════════════ */
import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function useAdminSocket(token, onEvent) {
  const socketRef = useRef(null);

  const handleEvent = useCallback((event, data) => {
    onEvent?.(event, data);
  }, [onEvent]);

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Admin socket connected');
      socket.emit('join-admin', token);
    });

    socket.on('admin-connected', (data) => {
      handleEvent('admin-connected', data);
    });

    // Real-time admin events
    const EVENTS = [
      'new-order',
      'order-shipped',
      'order-delivered',
      'payment-received',
      'low-stock-alert',
      'high-return-rate',
    ];

    EVENTS.forEach(ev => {
      socket.on(ev, (data) => handleEvent(ev, data));
    });

    socket.on('disconnect', () => {
      console.log('Admin socket disconnected');
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, handleEvent]);

  return socketRef;
}
