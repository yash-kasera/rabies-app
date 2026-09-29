import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X, Phone, Check, CircleCheck, Syringe,
  TriangleAlert, Clock, ClipboardList, RefreshCw, Trash2,
} from 'lucide-react'
import api from '../services/api'
import { onReportRemoved } from '../services/socket'
import ReportMedia from '../components/ReportMedia'
import DeleteReportDialog from '../components/DeleteReportDialog'
import { Badge, Button, Field, Notice, Select, Skeleton, StateView, useToast, fmtDay, fmtPhone, fmtTime, statusLabel } from '../components/ui'

const PAGE = 10
const DAY_LABELS = ['Day 0', 'Day 3', 'Day 7', 'Day 14', 'Day 28']
const SEV_RANK = { MinorScratch: 1, BleedingWound: 2, DeepWound: 3, MultipleBites: 4 }
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const TODAY = () => startOfDay(new Date())
const daysBetween = (a, b) => Math.round((startOfDay(a) - startOfDay(b)) / 864e5)
const isoDate = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }
const caseNumber = (c) => `RR-JBP-${String(c.id).padStart(5, '0')}`
const CLOSED = ['Completed', 'Cancelled']

/** First dose not yet given, for open cases. */
const nextDose = (c) => (CLOSED.includes(c.status) ? null : c.doses.find(d => !d.givenDate) || null)

function NextDoseCell({ c }) {
  const n = nextDose(c)
  if (!n) return <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
  const diff = daysBetween(n.scheduledDate, TODAY())
  if (diff < 0) return <span className="rr-badge rr-badge--danger"><TriangleAlert size={14} aria-hidden /><span>Overdue · {fmtDay(n.scheduledDate)}</span></span>
  if (diff === 0) return <span className="rr-badge rr-badge--warning"><Clock size={14} aria-hidden /><span>Due today</span></span>
  return <span>{fmtDay(n.scheduledDate)} · {DAY_LABELS[n.doseNumber - 1] || `Dose ${n.doseNumber}`}</span>
}

function SaveState({ state, idle }) {
  const map = {
    saving: ['Saving…', 'var(--color-text-secondary)'],
    saved: [`Saved ${fmtTime(new Date()).slice(0, 5)}`, 'var(--color-success)'],
    dirty: ['Unsaved — saves when you leave the box', 'var(--color-on-warning-container)'],
    error: ['Not saved — check your connection', 'var(--color-danger)'],
  }
  const [text, color] = map[state] || [idle, 'var(--color-text-secondary)']
  return (
    <span role="status" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color }}>
      {state === 'saved' && <Check size={14} aria-hidden />}{text}
    </span>
  )
}

function CasePanel({ c, onClose, onChange, onDeleteReport, narrow }) {
  const toast = useToast()
  const [stSave, setStSave] = useState(null)
  const [nSave, setNSave] = useState(null)
  const [notes, setNotes] = useState(c.treatmentNotes || '')
  const closeRef = useRef(null)
  useEffect(() => { setNotes(c.treatmentNotes || ''); setStSave(null); setNSave(null) }, [c.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const patch = async (body) => {
    const res = await api.patch(`/hospital/cases/${c.id}`, body)
    onChange(res.data)
    return res.data
  }

  const setStatus = async (status) => {
    setStSave('saving')
    try { await patch({ status }); setStSave('saved') } catch { setStSave('error') }
  }

  const saveNotes = async () => {
    if (nSave !== 'dirty') return
    setNSave('saving')
    try { await patch({ treatmentNotes: notes }); setNSave('saved') } catch { setNSave('error') }
  }

  const given = c.doses.filter(d => d.givenDate).length
  const locked = c.status === 'Cancelled'
  const firstOpen = c.doses.findIndex(d => !d.givenDate)

  const markGiven = async (d) => {
    const willGive = given + 1
    const status = c.status === 'Accepted' ? 'UnderTreatment' : willGive >= 5 && c.status !== 'Completed' ? 'Completed' : undefined
    const before = { status: c.status }
    try {
      await patch({ doses: [{ id: d.id, givenDate: new Date().toISOString() }], ...(status && { status }) })
      toast(`Dose ${d.doseNumber} marked given${status ? ` · status set to ${statusLabel('report', status)}` : ''}`, {
        action: {
          label: 'Undo',
          onClick: () => patch({ doses: [{ id: d.id, givenDate: null }], ...(status && { status: before.status }) }).catch(() => toast('Could not undo. Check the dose.', { error: true })),
        },
      })
    } catch (err) {
      toast(err.response?.data?.error || 'Could not mark the dose. Try again.', { error: true })
    }
  }

  const reschedule = async (d, value) => {
    if (!value) return
    try { await patch({ doses: [{ id: d.id, scheduledDate: new Date(`${value}T09:00:00`).toISOString() }] }) } catch { toast('Could not change the date.', { error: true }) }
  }

  const addDose = async () => {
    const last = c.doses[c.doses.length - 1]
    const base = last ? new Date(last.scheduledDate) : new Date()
    base.setDate(base.getDate() + 7)
    const when = base < TODAY() ? TODAY() : base
    try { await patch({ doses: [{ doseNumber: (last?.doseNumber || 0) + 1, scheduledDate: when.toISOString() }] }) } catch { toast('Could not add a dose.', { error: true }) }
  }

  const src = c.source === 'hospital_direct' ? 'Walk-in' : 'App Report'

  return (
    <>
      <div className="rr-panel-scrim" style={{ background: narrow ? 'var(--color-scrim)' : 'transparent' }} onClick={onClose} />
      <aside className="rr-panel" role="dialog" aria-modal="true" aria-labelledby="p-title" style={{ maxWidth: narrow ? 420 : 460 }}>
        <div className="rr-panel__head">
          <div className="rr-panel__titles">
            <h2 id="p-title" className="rr-panel__title">{c.patientName}</h2>
            <span className="rr-panel__sub">{caseNumber(c)} · {src} · Bitten {fmtDay(c.incidentDatetime)}</span>
          </div>
          <button ref={closeRef} type="button" className="rr-iconbtn" aria-label="Close" onClick={onClose}><X size={20} aria-hidden /></button>
        </div>
        <div className="rr-panel__body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <dl style={{ display: 'grid', gridTemplateColumns: '96px minmax(0,1fr)', gap: '8px 12px', margin: 0 }}>
            <dt style={{ color: 'var(--color-text-secondary)' }}>Contact</dt>
            <dd style={{ margin: 0 }}>
              <a href={`tel:${c.contactNumber}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, fontVariantNumeric: 'tabular-nums', textDecoration: 'none' }}><Phone size={16} aria-hidden />{fmtPhone(c.contactNumber)}</a>
              {c.address && <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{c.address}</div>}
            </dd>
            <dt style={{ color: 'var(--color-text-secondary)' }}>Animal</dt><dd style={{ margin: 0 }}>{c.animalType}</dd>
            <dt style={{ color: 'var(--color-text-secondary)' }}>Severity</dt><dd style={{ margin: 0 }}><Badge kind="severity" value={c.severity} /></dd>
          </dl>

          {c.biteReport && (
            <section aria-label="Patient's report" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, borderRadius: 12, background: 'var(--color-surface-alt)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>From the patient’s app report</div>
              <ReportMedia report={c.biteReport} name={c.patientName} />
              {!c.biteReport.description && !c.biteReport.photoUrl && c.biteReport.voiceSeconds == null && <span style={{ color: 'var(--color-text-secondary)' }}>No description, photo or voice note.</span>}
            </section>
          )}

          <div className="rr-field">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><label className="rr-label" htmlFor="p-st" style={{ flex: 1 }}>Status</label><SaveState state={stSave} idle="Changes save automatically" /></div>
            <Select id="p-st" value={c.status} onChange={e => setStatus(e.target.value)}>
              {['Accepted', 'UnderTreatment', 'Completed', 'Cancelled'].map(s => <option key={s} value={s}>{statusLabel('report', s)}</option>)}
            </Select>
          </div>

          <section aria-labelledby="dz-h" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 id="dz-h" style={{ flex: 1, margin: 0, fontSize: 16, lineHeight: '24px', fontWeight: 600 }}>Vaccine doses</h3>
              <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{given} of {c.doses.length} given</span>
            </div>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {c.doses.map((d, k) => {
                const isGiven = !!d.givenDate
                const diff = daysBetween(d.scheduledDate, TODAY())
                const over = !isGiven && diff < 0 && !locked, today = !isGiven && diff === 0 && !locked
                return (
                  <li key={d.id} style={{
                    display: 'grid', gridTemplateColumns: '32px minmax(0,1fr) auto', gap: 10, alignItems: 'center', padding: 10, borderRadius: 12,
                    background: over ? 'var(--color-danger-container)' : today ? 'var(--color-warning-container)' : 'var(--color-surface)',
                    border: over ? '2px solid var(--color-danger)' : today ? '2px solid var(--color-warning-border)' : '1px solid var(--color-border)',
                  }}>
                    <span aria-hidden style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 999, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                      background: isGiven ? 'var(--color-success)' : over ? 'var(--color-emergency)' : today ? 'var(--color-warning)' : 'var(--color-surface-alt)',
                      color: isGiven || over ? 'var(--color-on-emergency)' : 'var(--color-text-primary)', border: isGiven || over || today ? 0 : '1px solid var(--color-border-strong)',
                    }}>{isGiven ? <Check size={16} /> : d.doseNumber}</span>
                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontWeight: 600 }}>Dose {d.doseNumber} · {DAY_LABELS[d.doseNumber - 1] || 'Extra dose'}</span>
                      {isGiven ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, color: 'var(--color-success)' }}><CircleCheck size={14} aria-hidden />Given on {fmtDay(d.givenDate)}</span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <label htmlFor={`dose-${d.id}`} style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Scheduled</label>
                          <input id={`dose-${d.id}`} type="date" className="rr-input" disabled={locked} value={isoDate(d.scheduledDate)} onChange={e => reschedule(d, e.target.value)}
                            style={{ width: 'auto', minHeight: 36, padding: '4px 10px', fontSize: 13 }} />
                          {(over || today) && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: over ? 'var(--color-danger)' : 'var(--color-on-warning-container)' }}>
                              {over ? <TriangleAlert size={14} aria-hidden /> : <Clock size={14} aria-hidden />}
                              {over ? `Overdue by ${-diff} day${diff === -1 ? '' : 's'}` : 'Due today'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {!isGiven && (
                      <Button size="sm" icon={Syringe} disabled={locked}
                        kind={over ? 'emergency' : today || k === firstOpen ? 'primary' : 'secondary'} onClick={() => markGiven(d)}>Mark Given</Button>
                    )}
                  </li>
                )
              })}
            </ol>
            {!locked && <Button kind="text" size="sm" icon={Plus} style={{ alignSelf: 'flex-start' }} onClick={addDose}>Add Dose</Button>}
          </section>

          <div className="rr-field">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><label className="rr-label" htmlFor="p-notes" style={{ flex: 1 }}>Treatment notes</label><SaveState state={nSave} idle="Saves when you leave the box" /></div>
            <textarea id="p-notes" className="rr-input rr-textarea" style={{ minHeight: 96 }} value={notes}
              onChange={e => { setNotes(e.target.value); if (nSave !== 'dirty') setNSave('dirty') }} onBlur={saveNotes} />
          </div>

          {c.biteReport && (
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
              <Button kind="text" size="sm" icon={Trash2} style={{ color: 'var(--color-danger)' }} onClick={onDeleteReport}>Delete this report</Button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

export default function MyCases() {
  const navigate = useNavigate()
  const toast = useToast()
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  const [fStatus, setFStatus] = useState('')
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState({ k: 'next', dir: 1 })
  const [page, setPage] = useState(1)
  const [selId, setSelId] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [narrow, setNarrow] = useState(() => window.innerWidth < 1280)
  useEffect(() => { const on = () => setNarrow(window.innerWidth < 1280); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on) }, [])

  const load = useCallback(() => {
    setError(false)
    api.get('/hospital/cases').then(res => setData(res.data)).catch(() => setError(true))
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => onReportRemoved(() => load()), [load])

  const cases = data?.cases || []
  const updateCase = (c) => {
    setData(d => ({ ...d, cases: d.cases.map(x => (x.id === c.id ? { ...x, ...c } : x)) }))
    // Counts at the top (under treatment, completed) come from the server.
    api.get('/hospital/cases').then(res => setData(d => ({ ...d, stats: res.data.stats }))).catch(() => {})
  }

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase(), digits = q.replace(/\D/g, '')
    const f = from ? startOfDay(from) : null, t = to ? new Date(startOfDay(to).getTime() + 864e5) : null
    const list = cases.filter(c => (!fStatus || c.status === fStatus)
      && (!qq || c.patientName.toLowerCase().includes(qq) || (digits && c.contactNumber.includes(digits)))
      && (!f || new Date(c.createdAt) >= f) && (!t || new Date(c.createdAt) < t))
    const key = {
      patient: c => c.patientName.toLowerCase(),
      date: c => new Date(c.incidentDatetime).getTime(),
      severity: c => SEV_RANK[c.severity],
      next: c => { const n = nextDose(c); return n ? new Date(n.scheduledDate).getTime() : Infinity },
    }[sort.k]
    return [...list].sort((a, b) => { const x = key(a), y = key(b); return (x > y ? 1 : x < y ? -1 : 0) * sort.dir })
  }, [cases, fStatus, q, from, to, sort])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const rows = filtered.slice((page - 1) * PAGE, page * PAGE)
  useEffect(() => { if (page > pages) setPage(pages) }, [page, pages])
  const hasFilters = fStatus || q || from || to
  const clear = () => { setFStatus(''); setQ(''); setFrom(''); setTo(''); setPage(1) }
  const sel = cases.find(c => c.id === selId)

  const overdue = cases.filter(c => { const n = nextDose(c); return n && daysBetween(n.scheduledDate, TODAY()) < 0 }).length
  const tiles = [
    { label: 'Cases This Month', v: data?.stats.totalThisMonth, sub: `Since 1 ${new Date().toLocaleString('en-GB', { month: 'short' })}` },
    { label: 'Under Treatment', v: data?.stats.underTreatment, sub: overdue ? `${overdue} dose${overdue === 1 ? '' : 's'} overdue` : 'No doses overdue', bad: overdue > 0 },
    { label: 'Completed', v: data?.stats.completed, sub: 'All 5 doses given' },
  ]

  const cols = [['patient', 'Patient'], [null, 'Animal'], ['severity', 'Severity'], [null, 'Status'], [null, 'Source'], ['date', 'Date'], ['next', 'Next Dose']]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ flex: 1, margin: 0, fontSize: 22, lineHeight: '30px', fontWeight: 600 }}>My Cases</h1>
        <Button size="sm" icon={Plus} onClick={() => navigate('/register')}>Register New Bite</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {tiles.map(t => (
          <div key={t.label} className="rr-card rr-stat" style={{ padding: '12px 14px' }}>
            <span className="rr-stat__label">{t.label}</span>
            {!data ? <Skeleton w={56} h={28} style={{ margin: '4px 0' }} /> : <>
              <span className="rr-stat__value">{t.v}</span>
              <span className={`rr-stat__sub${t.bad ? ' rr-stat__sub--up-bad' : ''}`}>{t.sub}</span>
            </>}
          </div>
        ))}
      </div>

      {error && <Notice title="Could not load cases." action={<Button kind="secondary" size="sm" icon={RefreshCw} onClick={load}>Retry</Button>}>Check your connection. Your filters are kept.</Notice>}

      <div role="search" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, alignItems: 'end', padding: 12, borderRadius: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <Field label="Status" htmlFor="c-st">
          <Select id="c-st" value={fStatus} onChange={e => { setFStatus(e.target.value); setPage(1) }}>
            <option value="">All statuses</option>
            {['Accepted', 'UnderTreatment', 'Completed', 'Cancelled'].map(s => <option key={s} value={s}>{statusLabel('report', s)}</option>)}
          </Select>
        </Field>
        <Field label="Search patient" htmlFor="c-q">
          <div className="rr-control">
            <span className="rr-control__lead"><Search size={20} aria-hidden /></span>
            <input id="c-q" className="rr-input rr-input--icon" type="search" placeholder="Name or phone" value={q} onChange={e => { setQ(e.target.value); setPage(1) }} />
          </div>
        </Field>
        <Field label="From" htmlFor="c-from"><input id="c-from" type="date" className="rr-input" value={from} onChange={e => { setFrom(e.target.value); setPage(1) }} /></Field>
        <Field label="To" htmlFor="c-to"><input id="c-to" type="date" className="rr-input" value={to} onChange={e => { setTo(e.target.value); setPage(1) }} /></Field>
        <Button kind="text" onClick={clear} disabled={!hasFilters}>Clear</Button>
      </div>

      <div className="rr-table-wrap">
        <table className="rr-table">
          <thead><tr>
            {cols.map(([k, label]) => (
              <th key={label} scope="col" aria-sort={k && sort.k === k ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none'}>
                {k ? (
                  <button type="button" onClick={() => setSort(s => ({ k, dir: s.k === k ? -s.dir : 1 }))}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 32, padding: 0, border: 0, background: 'transparent', color: 'inherit', font: 'inherit', fontWeight: 600, cursor: 'pointer' }}>
                    {label}{sort.k === k && sort.dir > 0 ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden style={{ opacity: sort.k === k ? 1 : 0.35 }} />}
                  </button>
                ) : label}
              </th>
            ))}
          </tr></thead>
          <tbody>
            {!data && !error && [1, 2, 3, 4, 5].map(i => (
              <tr key={i}><td><Skeleton w="80%" /><Skeleton w="50%" style={{ marginTop: 6 }} /></td><td><Skeleton w="50%" /></td><td><Skeleton w={96} h={22} pill /></td><td><Skeleton w={96} h={22} pill /></td><td><Skeleton w="60%" /></td><td><Skeleton w="60%" /></td><td><Skeleton w={110} h={22} pill /></td></tr>
            ))}
            {rows.map(c => (
              <tr key={c.id} className="is-clickable" tabIndex={0} aria-label={`Open case: ${c.patientName}`}
                style={{ background: selId === c.id ? 'var(--color-primary-container)' : undefined }}
                onClick={() => setSelId(c.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelId(c.id) } }}>
                <td><div style={{ fontWeight: 600 }}>{c.patientName}</div><div style={{ fontSize: 12, lineHeight: '16px', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{fmtPhone(c.contactNumber)}</div></td>
                <td>{c.animalType}</td>
                <td><Badge kind="severity" value={c.severity} /></td>
                <td><Badge kind="report" value={c.status} /></td>
                <td>{c.source === 'hospital_direct' ? 'Walk-in' : 'App Report'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{fmtDay(c.incidentDatetime)}</td>
                <td style={{ whiteSpace: 'nowrap' }}><NextDoseCell c={c} /></td>
              </tr>
            ))}
            {data && cases.length === 0 && (
              <tr><td colSpan={7}><StateView icon={ClipboardList} title="No cases yet" body="Cases appear here when you accept an incoming report or register a walk-in patient."
                action={<Button kind="secondary" onClick={() => navigate('/register')}>Register New Bite</Button>} /></td></tr>
            )}
            {data && cases.length > 0 && filtered.length === 0 && (
              <tr><td colSpan={7}><StateView icon={Search} title={q ? `No cases match “${q}”` : 'No cases match these filters'} body="Check the spelling or the phone number, or clear the filters."
                action={<Button kind="secondary" onClick={clear}>Clear filters</Button>} /></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <nav aria-label="Pagination" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text-secondary)' }}>Showing {(page - 1) * PAGE + 1}–{Math.min(page * PAGE, filtered.length)} of {filtered.length} · {PAGE} per page</span>
          <Button kind="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span aria-current="page" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 36, height: 36, borderRadius: 999, background: 'var(--color-primary)', color: 'var(--color-on-primary)', fontWeight: 600 }}>{page}</span>
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>of {pages}</span>
          <Button kind="secondary" size="sm" iconRight={ChevronRight} disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </nav>
      )}

      {sel && <CasePanel c={sel} narrow={narrow} onClose={() => setSelId(null)} onChange={updateCase} onDeleteReport={() => setDeleting(sel)} />}

      {deleting && (
        <DeleteReportDialog reportId={deleting.biteReport.id} name={deleting.patientName} hasCase onClose={() => setDeleting(null)}
          onDeleted={() => {
            setSelId(null)
            setData(d => ({ ...d, cases: d.cases.filter(x => x.id !== deleting.id) }))
            toast(`Report and case for ${deleting.patientName} deleted.`)
            setDeleting(null)
          }} />
      )}
    </div>
  )
}
