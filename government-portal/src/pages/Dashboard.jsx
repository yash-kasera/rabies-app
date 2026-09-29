import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Siren, Phone, Clock, Layers, MapPin, ChevronUp, ChevronDown, X, Printer, FileText, Search, RefreshCw,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import api from '../services/api'
import { onNewReport, onReportAccepted, onReportRemoved } from '../services/socket'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import useCities from '../hooks/useCities'
import TehsilMap, { VIEWS, APPROX, bandFor, legendFor } from '../components/TehsilMap'
import { Badge, Button, Field, Notice, Segmented, Select, Skeleton, StateView, fmtDateTime, fmtDate, fmtPhone, minutesAgo, statusLabel } from '../components/ui'

const PAGE_SIZE = 25
const EMPTY_FILTERS = { city: '', hospital: '', status: '', from: '', to: '' }

function Kpi({ label, value, sub, loading, emergency }) {
  const style = emergency ? { background: 'var(--color-emergency)', borderColor: 'var(--color-emergency)', color: 'var(--color-on-emergency)' } : {}
  return (
    <div className="rr-card rr-stat" style={{ padding: '12px 14px', ...style }}>
      <span className="rr-stat__label" style={emergency ? { display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-on-emergency)' } : undefined}>
        {emergency && <Siren size={16} aria-hidden />}{label}
      </span>
      {loading ? <Skeleton w={64} h={28} style={{ margin: '4px 0' }} /> : <>
        <span className="rr-stat__value">{value}</span>
        <span className="rr-stat__sub" style={emergency ? { color: 'var(--color-on-emergency)' } : undefined}>{sub}</span>
      </>}
    </div>
  )
}

const delta = (a) => {
  const d = a.count - a.lastMonth
  return { text: (d > 0 ? '+' : '') + d, color: d > 0 ? 'var(--color-danger)' : d < 0 ? 'var(--color-success)' : 'var(--color-text-secondary)' }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { dark } = useTheme()
  const cities = useCities()
  const [stats, setStats] = useState(null)
  const [statsError, setStatsError] = useState(false)
  const [hospitals, setHospitals] = useState([])
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [region, setRegion] = useState(null)
  const [page, setPage] = useState(1)
  const [table, setTable] = useState(null) // { reports, total }
  const [tableError, setTableError] = useState('')
  const [mapOpen, setMapOpen] = useState(true)
  const [mapMode, setMapMode] = useState('density')
  const [mapView, setMapView] = useState('district')
  const [points, setPoints] = useState([])

  const loadStats = useCallback(() => {
    api.get('/government/stats')
      .then(res => { setStats(res.data); setStatsError(false) })
      .catch(() => setStatsError(true))
  }, [])

  const loadTable = useCallback(async () => {
    try {
      const params = Object.fromEntries(Object.entries({ ...filters, tehsil: region, page, pageSize: PAGE_SIZE }).filter(([, v]) => v))
      const res = await api.get('/government/cases', { params })
      setTable(res.data)
      setTableError('')
    } catch (err) {
      setTableError(err.response ? `The server returned an error (${err.response.status}).` : 'The server did not respond.')
    }
  }, [filters, region, page])

  const loadPoints = useCallback(() => {
    api.get('/government/report-points').then(res => setPoints(res.data)).catch(() => {})
  }, [])

  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => { loadTable() }, [loadTable])
  useEffect(() => { if (mapMode === 'markers') loadPoints() }, [mapMode, loadPoints])
  useEffect(() => { api.get('/government/hospitals').then(res => setHospitals(res.data)).catch(() => {}) }, [])

  // Live: refresh numbers as reports arrive or get accepted.
  useEffect(() => {
    const refresh = () => { loadStats(); loadTable(); if (mapMode === 'markers') loadPoints() }
    const a = onNewReport(refresh), b = onReportAccepted(refresh), c = onReportRemoved(refresh)
    return () => { a(); b(); c() }
  }, [loadStats, loadTable, loadPoints, mapMode])

  const setFilter = (key) => (e) => { setPage(1); setFilters(f => ({ ...f, [key]: e.target.value })) }
  const clearFilters = () => { setPage(1); setFilters(EMPTY_FILTERS); setRegion(null) }
  const pickRegion = (name) => { setPage(1); setRegion(name) }

  const areaByName = useMemo(() => Object.fromEntries((stats?.areas || []).map(a => [a.name, a])), [stats])
  const maxArea = Math.max(1, ...(stats?.areas || []).map(a => a.count))
  const reg = region && areaByName[region]
  const hasFilters = Object.values(filters).some(Boolean) || !!region
  const loading = !stats && !statsError
  const esc = stats?.escalations || []
  const totalPages = table ? Math.max(1, Math.ceil(table.total / PAGE_SIZE)) : 1

  const filterSummary = [
    filters.status ? `Status = ${statusLabel('report', filters.status)}` : 'Status = All',
    region && `Tehsil = ${region}`,
    (filters.from || filters.to) && `${filters.from || '…'} – ${filters.to || '…'}`,
  ].filter(Boolean).join(' · ')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {statsError && (
        <Notice title="Could not load the dashboard figures." action={<Button kind="secondary" size="sm" icon={RefreshCw} onClick={loadStats}>Retry</Button>}>
          Check your connection. The reports table below may still work.
        </Notice>
      )}

      <div className="rr-noprint" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <Kpi label="Total Reports" value={stats?.reportsThisMonth} sub="This month" loading={loading} />
        <Kpi label="Active Cases" value={stats?.activeCases} sub="Accepted or under treatment" loading={loading} />
        <Kpi label="Completed" value={stats?.completedCases} sub="Treatment completed" loading={loading} />
        <Kpi label="Unaccepted" value={stats?.unacceptedReports} sub="Waiting for a hospital" loading={loading} emergency />
        <Kpi label="Avg Acceptance Time" loading={loading} sub="Target: under 15 min"
          value={stats?.avgAcceptanceMinutes == null ? '—' : (() => {
            const m = stats.avgAcceptanceMinutes
            const [n, unit] = m < 120 ? [m, 'min'] : m < 2880 ? [Math.round(m / 60), 'hours'] : [Math.round(m / 1440), 'days']
            return <>{n} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--color-text-secondary)' }}>{unit}</span></>
          })()} />
      </div>

      {esc.length > 0 && !region && (
        <section role="alert" aria-label="Escalation" className="rr-noprint" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 16px', borderRadius: 16, background: 'var(--color-emergency-container)', color: 'var(--color-on-emergency-container)', border: '2px solid var(--color-emergency)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 999, background: 'var(--color-emergency)', color: 'var(--color-on-emergency)' }}><Siren size={18} aria-hidden /></span>
            <h2 style={{ flex: 1, margin: 0, fontSize: 16, lineHeight: '24px', fontWeight: 600 }}>
              {esc.length} report{esc.length === 1 ? '' : 's'} unaccepted for 30+ minutes — call the patient or assign a hospital
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--color-danger-border)' }}>
            {esc.slice(0, 3).map(e => (
              <button key={e.id} type="button" onClick={() => navigate(`/cases/${e.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px 16px', flexWrap: 'wrap', minHeight: 40, padding: '6px 0', border: 0, borderBottom: '1px solid var(--color-danger-border)', background: 'transparent', color: 'inherit', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
                <strong style={{ fontWeight: 600, minWidth: 130 }}>{e.victimName}</strong>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 110 }}><Phone size={14} aria-hidden />{fmtPhone(e.contactNumber)}</span>
                <span style={{ flex: 1, minWidth: 140 }}>{e.tehsil || 'Outside district'} · {e.animalType}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}><Clock size={14} aria-hidden />{minutesAgo(e.minutesWaiting)} ago</span>
              </button>
            ))}
          </div>
          {esc.length > 3 && <span style={{ fontWeight: 600 }}>…and {esc.length - 3} more</span>}
        </section>
      )}

      <section className="rr-card rr-noprint" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '8px 8px 8px 16px', borderBottom: mapOpen ? '1px solid var(--color-border)' : 0 }}>
          <h2 style={{ flex: 1, margin: 0, fontSize: 16, lineHeight: '24px', fontWeight: 600 }}>Cases by tehsil — Jabalpur district</h2>
          {mapOpen && <>
            <Segmented label="Map area" value={mapView} onChange={setMapView} options={[{ value: 'district', label: 'District' }, { value: 'city', label: 'City' }]} />
            <Segmented label="Map layer" value={mapMode} onChange={setMapMode} options={[{ value: 'density', label: 'Case density', icon: Layers }, { value: 'markers', label: 'Report locations', icon: MapPin }]} />
          </>}
          <Button kind="text" size="sm" iconRight={mapOpen ? ChevronUp : ChevronDown} aria-expanded={mapOpen} onClick={() => setMapOpen(o => !o)}>Map</Button>
        </div>
        {mapOpen && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))' }}>
            <div style={{ padding: 12, background: 'var(--color-surface-alt)' }}>
              <TehsilMap view={VIEWS[mapView]} counts={areaByName} selected={region} onSelect={pickRegion} mode={mapMode} points={points} dark={dark} />
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 12px', marginTop: 8, fontSize: 12, lineHeight: '16px', color: 'var(--color-text-secondary)' }}>
                {mapMode === 'density' ? <>
                  <span style={{ fontWeight: 600 }}>Cases this month</span>
                  <span style={{ display: 'flex', gap: 2 }}>
                    {legendFor(dark).map(l => (
                      <span key={l.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <span style={{ width: 28, height: 10, borderRadius: 2, background: l.bg }} /><span>{l.label}</span>
                      </span>
                    ))}
                  </span>
                </> : <span>Dots coloured by status · red ring = unaccepted · click a dot for details</span>}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 12, border: '2px solid var(--color-text-primary)', borderRadius: 999, background: 'var(--color-surface)' }} />Jabalpur city
                </span>
                <span>* {[...APPROX].join(', ')}: approximate borders</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--color-border)', minWidth: 0 }}>
              {!reg ? (
                <div style={{ padding: '10px 14px 6px', fontSize: 13, color: 'var(--color-text-secondary)' }}>Click a tehsil on the map or in this list to see its cases.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 14px', background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ flex: 1, fontSize: 16, lineHeight: '24px', fontWeight: 600 }}>{reg.name} tehsil{APPROX.has(reg.name) ? '*' : ''}</strong>
                    <Button kind="text" size="sm" icon={X} style={{ color: 'var(--color-on-primary-container)' }} onClick={() => pickRegion(null)}>All tehsils</Button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8 }}>
                    <div><div style={{ fontSize: 12 }}>Cases this month</div><div style={{ fontSize: 22, lineHeight: '28px', fontWeight: 600 }}>{reg.count}</div><div style={{ fontSize: 12, fontWeight: 600, color: delta(reg).color }}>{delta(reg).text} vs last month</div></div>
                    <div><div style={{ fontSize: 12 }}>Unaccepted now</div><div style={{ fontSize: 22, lineHeight: '28px', fontWeight: 600 }}>{reg.unaccepted}</div></div>
                    <div><div style={{ fontSize: 12 }}>Hospitals</div><div style={{ fontSize: 22, lineHeight: '28px', fontWeight: 600 }}>{reg.hospitals}</div></div>
                  </div>
                  <div style={{ fontSize: 12 }}>Reports table below is filtered to {reg.name}.</div>
                </div>
              )}
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, overflowY: 'auto', maxHeight: 360 }}>
                {(stats?.areas || []).map(a => {
                  const sel = a.name === region
                  const d = delta(a)
                  return (
                    <li key={a.name}>
                      <button type="button" aria-pressed={sel} onClick={() => pickRegion(sel ? null : a.name)}
                        style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto 44px', gridTemplateRows: 'auto 6px', gap: '3px 10px', alignItems: 'center', width: '100%', padding: '7px 14px', border: 0, borderBottom: '1px solid var(--color-border)', background: sel ? 'var(--color-primary-container)' : 'transparent', color: 'var(--color-text-primary)', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                          {a.name}{APPROX.has(a.name) ? '*' : ''}
                          {a.unaccepted > 0 && <span className="rr-badge rr-badge--danger-solid" style={{ padding: '0 6px', fontSize: 11, lineHeight: '16px' }}>{a.unaccepted} unaccepted</span>}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: d.color }}>{d.text}</span>
                        <span className="rr-tabular" style={{ gridRow: '1 / span 2', gridColumn: 3, textAlign: 'right', fontSize: 16, fontWeight: 600 }}>{a.count}</span>
                        <span style={{ gridColumn: '1 / span 2', display: 'block', height: 6, borderRadius: 999, background: 'var(--color-surface-alt)' }}>
                          <span style={{ display: 'block', width: `${Math.round((a.count / maxArea) * 100)}%`, height: 6, borderRadius: 999, background: bandFor(a.count, dark)[1], boxShadow: 'inset 0 0 0 1px var(--color-orange-border)' }} />
                        </span>
                      </button>
                    </li>
                  )
                })}
                {loading && [1, 2, 3].map(i => <li key={i} style={{ padding: '10px 14px' }}><Skeleton w={`${80 - i * 10}%`} /></li>)}
              </ol>
            </div>
          </div>
        )}
      </section>

      <div className="rr-noprint" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
        <section className="rr-card">
          <h2 style={{ margin: '0 0 10px', fontSize: 16, lineHeight: '24px', fontWeight: 600 }}>Cases by animal type <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-secondary)' }}>· this month</span></h2>
          {loading ? <div className="rr-skel-stack"><Skeleton /><Skeleton w="60%" /><Skeleton w="40%" /></div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(stats?.casesByAnimal || []).map(a => (
                <div key={a.animalType} style={{ display: 'grid', gridTemplateColumns: '64px minmax(0,1fr) 36px', gap: 10, alignItems: 'center' }}>
                  <span>{a.animalType}</span>
                  <span style={{ display: 'block', height: 14, borderRadius: 4, background: 'var(--color-surface-alt)' }}>
                    <span style={{ display: 'block', width: `${Math.round((a.count / (stats.casesByAnimal[0]?.count || 1)) * 100)}%`, height: 14, borderRadius: 4, background: 'var(--color-primary)' }} />
                  </span>
                  <span className="rr-tabular" style={{ textAlign: 'right', fontWeight: 600 }}>{a.count}</span>
                </div>
              ))}
              {stats?.casesByAnimal?.length === 0 && <span style={{ color: 'var(--color-text-secondary)' }}>No reports this month</span>}
            </div>
          )}
        </section>
        <section className="rr-card">
          <h2 style={{ margin: '0 0 6px', fontSize: 16, lineHeight: '24px', fontWeight: 600 }}>Cases by hospital <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-secondary)' }}>· this month</span></h2>
          {loading ? <div className="rr-skel-stack"><Skeleton /><Skeleton w="70%" /><Skeleton w="50%" /></div> : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {(stats?.casesByHospital || []).map(h => (
                <li key={h.name ?? '_none'} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '4px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={h.name ? undefined : { color: 'var(--color-emergency)', fontWeight: 600 }}>{h.name ?? 'Not accepted yet'}</span>
                  <strong className="rr-tabular" style={{ fontWeight: 600 }}>{h.count}</strong>
                </li>
              ))}
              {stats?.casesByHospital?.length === 0 && <li style={{ color: 'var(--color-text-secondary)' }}>No reports this month</li>}
            </ul>
          )}
        </section>
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="rr-print-only" style={{ paddingBottom: 8, borderBottom: '2px solid var(--color-text-primary)' }}>
          <div style={{ fontSize: 18, lineHeight: '24px', fontWeight: 600 }}>Bite reports — Jabalpur district</div>
          <div style={{ fontSize: 12 }}>Filters: {filterSummary} · Page {page} of {totalPages} · Printed {fmtDate(new Date())} by {user?.fullName}</div>
        </div>
        <div className="rr-noprint" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h2 style={{ flex: 1, margin: 0, fontSize: 18, lineHeight: '26px', fontWeight: 600 }}>Reports{region ? ` · ${region}` : ''}</h2>
          <Button kind="secondary" size="sm" icon={Printer} onClick={() => window.print()}>Print</Button>
        </div>
        <div className="rr-noprint" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, alignItems: 'end', padding: 12, borderRadius: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <Field label="City" htmlFor="f-city">
            <Select id="f-city" value={filters.city} onChange={setFilter('city')}>
              <option value="">All cities</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Hospital" htmlFor="f-h">
            <Select id="f-h" value={filters.hospital} onChange={setFilter('hospital')}>
              <option value="">All hospitals</option>
              {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </Select>
          </Field>
          <Field label="Status" htmlFor="f-s">
            <Select id="f-s" value={filters.status} onChange={setFilter('status')}>
              <option value="">All statuses</option>
              {['Reported', 'Accepted', 'UnderTreatment', 'Completed', 'Cancelled'].map(s => <option key={s} value={s}>{statusLabel('report', s)}</option>)}
            </Select>
          </Field>
          <Field label="From" htmlFor="f-from"><input id="f-from" type="date" className="rr-input" value={filters.from} onChange={setFilter('from')} /></Field>
          <Field label="To" htmlFor="f-to"><input id="f-to" type="date" className="rr-input" value={filters.to} onChange={setFilter('to')} /></Field>
          <Button kind="text" icon={X} onClick={clearFilters} disabled={!hasFilters}>Clear filters</Button>
        </div>

        {tableError && (
          <Notice title="Could not load cases." action={<Button kind="secondary" size="sm" icon={RefreshCw} onClick={loadTable}>Retry</Button>}>
            {tableError} Your filters are kept.
          </Notice>
        )}

        <div className="rr-table-wrap">
          <table className="rr-table">
            <thead><tr><th scope="col">Victim</th><th scope="col">City</th><th scope="col">Area</th><th scope="col">Animal</th><th scope="col">Severity</th><th scope="col">Status</th><th scope="col">Hospital</th><th scope="col" className="is-num">Date</th></tr></thead>
            <tbody>
              {!table && !tableError && [1, 2, 3].map(i => (
                <tr key={i}>{[80, 60, 70, 50].map((w, j) => <td key={j}><Skeleton w={`${w}%`} /></td>)}<td><Skeleton w={90} h={22} pill /></td><td><Skeleton w={90} h={22} pill /></td><td><Skeleton w="80%" /></td><td><Skeleton w="70%" /></td></tr>
              ))}
              {table?.reports.map(r => (
                <tr key={r.id} className="is-clickable" tabIndex={0} aria-label={`Open case: ${r.victimName}`}
                  onClick={() => navigate(`/cases/${r.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/cases/${r.id}`) } }}>
                  <td style={{ fontWeight: 600 }}>{r.victimName}</td>
                  <td>{r.city?.name}</td>
                  <td>{r.tehsil ? `${r.tehsil}${APPROX.has(r.tehsil) ? '*' : ''}` : 'Outside district'}</td>
                  <td>{r.animalType}</td>
                  <td><Badge kind="severity" value={r.severity} /></td>
                  <td><Badge kind="report" value={r.status} /></td>
                  <td>{r.hospital?.name || '—'}</td>
                  <td className="is-num" style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(r.createdAt)}</td>
                </tr>
              ))}
              {table && table.reports.length === 0 && (
                <tr><td colSpan={8}>
                  {hasFilters
                    ? <StateView icon={Search} title="No reports match these filters" body="Try another status, tehsil or a wider date range." action={<Button kind="secondary" onClick={clearFilters}>Clear filters</Button>} />
                    : <StateView icon={FileText} title="No reports yet" body="New bite reports from the citizen app will appear here as they arrive." />}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {table && table.total > 0 && (
          <nav aria-label="Pagination" className="rr-noprint" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text-secondary)' }}>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, table.total)} of {table.total} · {PAGE_SIZE} per page
            </span>
            <Button kind="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="rr-tabular" aria-current="page" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 36, height: 36, padding: '0 8px', borderRadius: 999, background: 'var(--color-primary)', color: 'var(--color-on-primary)', fontWeight: 600 }}>{page}</span>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>of {totalPages}</span>
            <Button kind="secondary" size="sm" iconRight={ChevronRight} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </nav>
        )}
      </section>
    </div>
  )
}
