import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { connectHospital, disconnect, onNewReport } from '../services/socket'
import api from '../services/api'

const severityColors = {
  MinorScratch: 'bg-warning/20 text-warning dark:text-warning-dark',
  BleedingWound: 'bg-danger/20 text-danger dark:text-danger-dark',
  DeepWound: 'bg-emergency/20 text-emergency dark:text-emergency-dark',
  MultipleBites: 'bg-emergency/20 text-emergency dark:text-emergency-dark',
}

export default function IncomingReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(null)
  const { user } = useAuth()

  const loadReports = useCallback(async () => {
    try {
      const res = await api.get('/hospital/incoming-reports')
      setReports(res.data)
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReports()
    if (user?.hospitalId) {
      connectHospital(user.hospitalId)
      const cleanup = onNewReport((report) => {
        setReports(prev => [report, ...prev])
      })
      return () => { cleanup(); disconnect() }
    }
  }, [loadReports, user])

  const handleAccept = async (id) => {
    setAccepting(id)
    try {
      await api.post(`/hospital/reports/${id}/accept`)
      setReports(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to accept')
    } finally {
      setAccepting(null)
    }
  }

  const timeAgo = (date) => {
    const mins = Math.floor((Date.now() - new Date(date)) / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    return `${Math.floor(mins / 60)}h ago`
  }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary dark:text-text-primary-dark mb-6">Incoming Reports</h1>
      {reports.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-text-secondary dark:text-text-secondary-dark">No incoming reports</p>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">New bite reports from your city will appear here instantly</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <div key={report.id} className="card p-4 flex items-start gap-4 animate-pulse-on-add">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-text-primary dark:text-text-primary-dark">{report.victimName}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityColors[report.severity]}`}>
                    {report.severity.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
                <div className="text-sm text-text-secondary dark:text-text-secondary-dark space-y-0.5">
                  <p>📞 {report.contactNumber}</p>
                  <p>🐾 {report.animalType} · {report.animalStatus.replace(/([A-Z])/g, ' $1').trim()}</p>
                  <p>📍 {report.latitude?.toFixed(4)}, {report.longitude?.toFixed(4)}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="text-xs text-text-secondary dark:text-text-secondary-dark">{timeAgo(report.createdAt)}</span>
                <button
                  onClick={() => handleAccept(report.id)}
                  disabled={accepting === report.id}
                  className="btn-primary text-sm !px-4"
                >
                  {accepting === report.id ? '...' : 'Accept'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}