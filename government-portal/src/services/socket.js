import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

// VITE_API_URL points at the REST base (…/api/v1); the socket lives at the server root.
const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '')
  : 'http://localhost:5000'

const socket = io(SOCKET_URL, { autoConnect: false })

// The server authenticates the token and joins the government room itself.
export function connectGovernment(token) {
  socket.auth = { token }
  if (!socket.connected) socket.connect()
}

export function disconnect() {
  socket.disconnect()
}

export function reconnect() {
  socket.disconnect()
  socket.connect()
}

export function onNewReport(callback) {
  socket.on('new-report', callback)
  return () => socket.off('new-report', callback)
}

export function onReportAccepted(callback) {
  socket.on('report-accepted', callback)
  return () => socket.off('report-accepted', callback)
}

export function onReportRemoved(callback) {
  socket.on('report-removed', callback)
  return () => socket.off('report-removed', callback)
}

/** { connected, since } — drives the header's Live indicator and the connection-lost banner. */
export function useSocketStatus() {
  const [state, setState] = useState({ connected: socket.connected, since: new Date() })
  useEffect(() => {
    const up = () => setState({ connected: true, since: new Date() })
    const down = () => setState(s => ({ connected: false, since: s.since }))
    socket.on('connect', up)
    socket.on('disconnect', down)
    socket.on('connect_error', down)
    return () => { socket.off('connect', up); socket.off('disconnect', down); socket.off('connect_error', down) }
  }, [])
  return state
}
