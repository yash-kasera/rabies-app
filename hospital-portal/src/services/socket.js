import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

// VITE_API_URL points at the REST base (…/api/v1); the socket lives at the server root.
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

export function reconnect() {
  socket.disconnect()
  socket.connect()
}

const subscribe = (event) => (callback) => {
  socket.on(event, callback)
  return () => socket.off(event, callback)
}
export const onNewReport = subscribe('new-report')
export const onReportAccepted = subscribe('report-accepted')
export const onReportRemoved = subscribe('report-removed')

/** { connected, since } — drives the header's Live indicator and the connection-lost banner. */
export function useSocketStatus() {
  const [state, setState] = useState({ connected: socket.connected, since: new Date() })
  useEffect(() => {
    const up = () => setState({ connected: true, since: new Date() })
    const down = () => setState(s => ({ connected: false, since: s.connected ? new Date() : s.since }))
    socket.on('connect', up)
    socket.on('disconnect', down)
    socket.on('connect_error', down)
    return () => { socket.off('connect', up); socket.off('disconnect', down); socket.off('connect_error', down) }
  }, [])
  return state
}

export default socket
