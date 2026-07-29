import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const statusColors = {
  Accepted: 'bg-warning/20 text-warning dark:text-warning-dark',
  UnderTreatment: 'bg-primary/20 text-primary dark:text-primary-dark',
  Completed: 'bg-success/20 text-success dark:text-success-dark',
  Cancelled: 'bg-text-secondary/20 text-text-secondary dark:text-text-secondary-dark',
}

export default function MyCases() {
  const [data, setData] = useState({ cases: [], stats: {} })
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', search: '', from: '', to: '' })
  const [selected, setSelected] = useState(null)
  const [sortKey, setSortKey] = useState('createdAt')
  const [sortDir, setSortDir] = useState('desc')

  const loadCases = useCallback(async () => {
    try {
      const params = {}
      if (filters.status) params.status = filters.status
      if (filters.search) params.search = filters.search
      if (filters.from) params.from = filters.from
      if (filters.to) params.to = filters.to
      const res = await api.get('/hospital/cases', { params })
      setData(res.data)
    } catch {} finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { loadCases() }, [loadCases])

  const updateCase = async (id, updates) => {
    await api.patch(`/hospital/cases/${id}`, updates)
    loadCases()
    setSelected(prev => prev?.id === id ? { ...prev, ...updates } : prev)
  }

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sortedCases = [...(data.cases || [])].sort((a, b) => {
    let va = a[sortKey], vb = b[sortKey]
    if (sortKey === 'createdAt') { va = new Date(va); vb = new Date(vb) }
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const nextDoseDate = (c) => {
    if (!c.doses?.length) return null
    const pending = c.doses.find(d => !d.givenDate)
    return pending ? new Date(pending.scheduledDate) : null
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary dark:text-text-primary-dark mb-6">My Cases</h1>

      {data.stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'This Month', value: data.stats.totalThisMonth },
            { label: 'Under Treatment', value: data.stats.underTreatment },
            { label: 'Completed', value: data.stats.completed },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center">
              <p className="text-2xl font-bold text-primary dark:text-primary-dark">{s.value}</p>
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card p-4 mb-4 flex flex-wrap gap-3">
        <select className="input-field w-auto" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Status</option>
          <option value="Accepted">Accepted</option>
          <option value="UnderTreatment">Under Treatment</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <input type="text" className="input-field w-auto flex-1 min-w-[200px]" placeholder="Search patient name or phone..." value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
        <input type="date" className="input-field w-auto" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
        <input type="date" className="input-field w-auto" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : sortedCases.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-text-secondary dark:text-text-secondary-dark">No cases found</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-alt dark:bg-surface-alt-dark text-text-secondary dark:text-text-secondary-dark">
                {['patientName', 'animalType', 'severity', 'status', 'source', 'createdAt'].map(key => (
                  <th key={key} className="text-left p-3 font-medium cursor-pointer hover:text-primary dark:hover:text-primary-dark"
                      onClick={() => toggleSort(key)}>
                    {key === 'patientName' ? 'Patient' :
                     key === 'animalType' ? 'Animal' :
                     key === 'severity' ? 'Severity' :
                     key === 'status' ? 'Status' :
                     key === 'source' ? 'Source' :
                     key === 'createdAt' ? 'Date' : key}
                    {sortKey === key && (sortDir === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                ))}
                <th className="text-left p-3 font-medium">Next Dose</th>
              </tr>
            </thead>
            <tbody>
              {sortedCases.map(c => {
                const nextDose = nextDoseDate(c)
                return (
                  <tr key={c.id} className="border-t border-border dark:border-border-dark cursor-pointer hover:bg-surface-alt/50 dark:hover:bg-surface-alt-dark/50"
                      onClick={() => setSelected(c)}>
                    <td className="p-3 font-medium text-text-primary dark:text-text-primary-dark">{c.patientName}</td>
                    <td className="p-3 text-text-secondary dark:text-text-secondary-dark">{c.animalType}</td>
                    <td className="p-3">{c.severity.replace(/([A-Z])/g, ' $1').trim()}</td>
                    <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[c.status]}`}>{c.status}</span></td>
                    <td className="p-3 text-text-secondary dark:text-text-secondary-dark">{c.source === 'user_report' ? 'App Report' : 'Walk-in'}</td>
                    <td className="p-3 text-text-secondary dark:text-text-secondary-dark">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="p-3 text-text-secondary dark:text-text-secondary-dark">
                      {nextDose ? nextDose.toLocaleDateString() : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex justify-end z-50" onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg bg-surface dark:bg-surface-dark h-full overflow-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-text-primary dark:text-text-primary-dark">Case Details</h2>
              <button onClick={() => setSelected(null)} className="text-text-secondary dark:text-text-secondary-dark text-2xl">&times;</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-text-secondary dark:text-text-secondary-dark">Patient</label><p className="font-medium">{selected.patientName}</p></div>
                <div><label className="text-xs text-text-secondary dark:text-text-secondary-dark">Contact</label><p>{selected.contactNumber}</p></div>
                <div><label className="text-xs text-text-secondary dark:text-text-secondary-dark">Animal</label><p>{selected.animalType}</p></div>
                <div><label className="text-xs text-text-secondary dark:text-text-secondary-dark">Severity</label><p>{selected.severity.replace(/([A-Z])/g, ' $1').trim()}</p></div>
              </div>
              <div>
                <label className="text-xs text-text-secondary dark:text-text-secondary-dark">Status</label>
                <select className="input-field mt-1" value={selected.status}
                  onChange={e => setSelected({ ...selected, status: e.target.value })}
                  onBlur={() => updateCase(selected.id, { status: selected.status })}>
                  <option value="Accepted">Accepted</option>
                  <option value="UnderTreatment">Under Treatment</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-text-secondary dark:text-text-secondary-dark">Treatment Notes</label>
                <textarea className="input-field mt-1 h-24" value={selected.treatmentNotes || ''}
                  onChange={e => setSelected({ ...selected, treatmentNotes: e.target.value })}
                  onBlur={() => updateCase(selected.id, { treatmentNotes: selected.treatmentNotes })} />
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <label className="text-xs text-text-secondary dark:text-text-secondary-dark">Vaccine Doses</label>
                  <button className="text-xs text-primary dark:text-primary-dark font-medium"
                    onClick={() => {
                      const maxDose = selected.doses?.length ? Math.max(...selected.doses.map(d => d.doseNumber)) : 0
                      const newDose = { doseNumber: maxDose + 1, scheduledDate: new Date(Date.now() + maxDose * 3 * 86400000).toISOString().slice(0, 10), givenDate: null }
                      setSelected({ ...selected, doses: [...(selected.doses || []), newDose] })
                    }}>
                    + Add Dose
                  </button>
                </div>
                {selected.doses?.length > 0 ? selected.doses.map((d, i) => (
                  <div key={d.id || i} className="flex items-center gap-2 mt-2 text-sm flex-wrap">
                    <span className="font-medium">Dose {d.doseNumber}:</span>
                    <input type="date" className="input-field w-auto text-xs" value={d.scheduledDate?.slice(0, 10) || ''}
                      onChange={e => {
                        const doses = [...selected.doses]
                        doses[i] = { ...doses[i], scheduledDate: e.target.value }
                        setSelected({ ...selected, doses })
                      }}
                      onBlur={() => updateCase(selected.id, { doses: selected.doses })} />
                    {d.givenDate ? (
                      <span className="text-success dark:text-success-dark">✓ {new Date(d.givenDate).toLocaleDateString()}</span>
                    ) : (
                      <button className="text-xs text-primary dark:text-primary-dark"
                        onClick={() => {
                          const doses = selected.doses.map((x, idx) => idx === i ? { ...x, givenDate: new Date().toISOString() } : x)
                          setSelected({ ...selected, doses })
                          updateCase(selected.id, { doses })
                        }}>
                        Mark Given
                      </button>
                    )}
                  </div>
                )) : <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">No doses recorded</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}