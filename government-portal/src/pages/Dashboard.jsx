import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const statusColors = {
  Reported: 'bg-danger/20 text-danger dark:text-danger-dark',
  Accepted: 'bg-warning/20 text-warning dark:text-warning-dark',
  UnderTreatment: 'bg-primary/20 text-primary dark:text-primary-dark',
  Completed: 'bg-success/20 text-success dark:text-success-dark',
  Cancelled: 'bg-text-secondary/20 text-text-secondary dark:text-text-secondary-dark',
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ city: '', hospital: '', status: '', from: '', to: '' })
  const [unaccepted, setUnaccepted] = useState([])

  const loadData = useCallback(async () => {
    try {
      const [statsRes, casesRes, unacceptedRes] = await Promise.all([
        api.get('/government/stats'),
        api.get('/government/cases'),
        api.get('/government/reports/unaccepted'),
      ])
      setStats(statsRes.data)
      setCases(casesRes.data)
      setUnaccepted(unacceptedRes.data)
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>

  const darkMode = document.documentElement.classList.contains('dark')

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary dark:text-text-primary-dark mb-6">All Cases Dashboard</h1>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Total Reports', value: stats.totalReports, color: 'text-primary dark:text-primary-dark' },
            { label: 'Active Cases', value: stats.totalCases, color: 'text-warning dark:text-warning-dark' },
            { label: 'Completed', value: stats.completedCases, color: 'text-success dark:text-success-dark' },
            { label: 'Unaccepted', value: stats.unacceptedReports, color: stats.unacceptedReports > 0 ? 'text-emergency dark:text-emergency-dark' : '' },
            { label: 'Avg Acceptance', value: stats.avgAcceptanceMinutes != null ? `${stats.avgAcceptanceMinutes}m` : '—', color: '' },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {stats?.casesByAnimal && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="card p-4">
            <h2 className="text-sm font-bold text-text-primary dark:text-text-primary-dark mb-3">Cases by Animal Type</h2>
            <div className="space-y-2">
              {stats.casesByAnimal.map(c => (
                <div key={c.animalType} className="flex items-center gap-2">
                  <span className="text-xs font-medium w-24 text-text-secondary">{c.animalType.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <div className="flex-1 bg-surface-alt dark:bg-surface-alt-dark rounded-full h-4">
                    <div className="bg-primary dark:bg-primary-dark h-4 rounded-full" style={{ width: `${Math.min(100, (c.count / Math.max(...stats.casesByAnimal.map(x => x.count), 1)) * 100)}%` }} />
                  </div>
                  <span className="text-xs font-bold">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-4">
            <h2 className="text-sm font-bold text-text-primary dark:text-text-primary-dark mb-3">Cases by City</h2>
            <div className="space-y-2 text-xs text-text-secondary">
              {Object.entries(stats.casesByCity || {}).map(([cityId, count]) => (
                <div key={cityId} className="flex justify-between">
                  <span>City #{cityId}</span>
                  <span className="font-bold">{count} cases</span>
                </div>
              ))}
              {Object.keys(stats.casesByCity || {}).length === 0 && <p>No data</p>}
            </div>
          </div>
        </div>
      )}

      {unaccepted.length > 0 && (
        <div className="card p-4 mb-4 border-2 border-emergency dark:border-emergency-dark">
          <h2 className="text-sm font-bold text-emergency dark:text-emergency-dark mb-2">⚠ {unaccepted.length} unaccepted reports (30+ min old) need escalation</h2>
          <div className="space-y-1 mt-2">
            {unaccepted.slice(0, 5).map(r => (
              <p key={r.id} className="text-xs text-text-secondary">
                {r.victimName} · {r.animalType} · {Math.floor((Date.now() - new Date(r.createdAt)) / 60000)}m ago
              </p>
            ))}
            {unaccepted.length > 5 && <p className="text-xs text-text-secondary">...and {unaccepted.length - 5} more</p>}
          </div>
        </div>
      )}

      <div className="card p-4 mb-4 flex flex-wrap gap-3">
        <select className="input-field w-auto" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Status</option>
          <option value="Reported">Reported</option>
          <option value="Accepted">Accepted</option>
          <option value="UnderTreatment">Under Treatment</option>
          <option value="Completed">Completed</option>
        </select>
        <input type="date" className="input-field w-auto" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
        <input type="date" className="input-field w-auto" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
      </div>

      {cases.biteReports?.length > 0 && (
        <div className="card p-4 mb-4 h-64 overflow-hidden">
          <MapContainer center={[22.7196, 75.8577]} zoom={5} className="h-full w-full rounded-lg" zoomControl={true}>
            <TileLayer
              url={darkMode
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              }
              attribution='&copy; OpenStreetMap'
            />
            {cases.biteReports?.filter(r => r.latitude && r.longitude).map(r => (
              <Marker key={r.id} position={[r.latitude, r.longitude]}>
                <Popup>
                  <b>{r.victimName}</b><br/>{r.animalType} · {r.status}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-alt dark:bg-surface-alt-dark text-text-secondary dark:text-text-secondary-dark">
              <th className="text-left p-3 font-medium">Victim</th>
              <th className="text-left p-3 font-medium">Animal</th>
              <th className="text-left p-3 font-medium">Severity</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Hospital</th>
              <th className="text-left p-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {cases.biteReports?.map(r => (
              <tr key={r.id} className="border-t border-border dark:border-border-dark">
                <td className="p-3 font-medium text-text-primary dark:text-text-primary-dark">{r.victimName}</td>
                <td className="p-3 text-text-secondary dark:text-text-secondary-dark">{r.animalType}</td>
                <td className="p-3">{r.severity.replace(/([A-Z])/g, ' $1').trim()}</td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[r.status]}`}>{r.status}</span></td>
                <td className="p-3 text-text-secondary">{r.hospital?.name || '—'}</td>
                <td className="p-3 text-text-secondary dark:text-text-secondary-dark">{new Date(r.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {(!cases.biteReports || cases.biteReports.length === 0) && (
              <tr><td colSpan="6" className="p-8 text-center text-text-secondary">No reports yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}