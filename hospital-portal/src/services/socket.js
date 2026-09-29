import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '')
  : 'http://localhost:5000'

const socket = io(SOCKET_URL, { autoConnect: false })

// The server authenticates the token and joins this hospital's rooms itself.
export function connectHospital(token) {
  socket.auth = { token }
  if (!socket.connected) socket.connect()
}

export function disconnect() {
  socket.disconnect()
}

export function onNewReport(callback) {
  socket.on('new-report', callback)
  return () => socket.off('new-report', callback)
}

export function onReportAccepted(callback) {
  socket.on('report-accepted', callback)
  return () => socket.off('report-accepted', callback)
}

export default socket
