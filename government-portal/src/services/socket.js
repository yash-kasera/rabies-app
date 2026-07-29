import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
let socket = null;

export function connectGovernment() {
  if (socket?.connected) return socket;
  socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
  socket.on('connect', () => console.log('Gov portal connected to socket'));
  socket.on('disconnect', () => console.log('Gov portal disconnected from socket'));
  return socket;
}

export function disconnect() {
  if (socket) { socket.disconnect(); socket = null; }
}

export function onNewReport(callback) {
  if (!socket) connectGovernment();
  socket.on('new-bite-report', callback);
  return () => socket.off('new-bite-report', callback);
}

export function onReportAccepted(callback) {
  if (!socket) connectGovernment();
  socket.on('report-accepted', callback);
  return () => socket.off('report-accepted', callback);
}
