import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api/v1', '')
  : 'http://localhost:5000'

const socket = io(SOCKET_URL, { autoConnect: false })

export function connectHospital(hospitalId) {
  socket.connect()
  socket.emit('join-hospital-room', hospitalId)
}

export function disconnect() {
  socket.disconnect()
}

export function onNewReport(callback) {
  socket.on('new-report', callback)
  return () => socket.off('new-report', callback)
}

export default socket