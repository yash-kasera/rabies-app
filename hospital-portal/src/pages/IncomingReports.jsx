import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Siren, Clock, Phone, MapPin, Check, Loader, Info, TriangleAlert, Droplets, Inbox, Bell, BellOff, RefreshCw, CircleSlash, Trash2 } from 'lucide-react'
import api from '../services/api'
import { onNewReport, onReportAccepted, onReportRemoved } from '../services/socket'
import { useUnread } from '../components/Layout'
import ReportMedia from '../components/ReportMedia'
import DeleteReportDialog from '../components/DeleteReportDialog'
import { Button, Notice, Skeleton, StateView, useToast, fmtPhone, fmtTime } from '../components/ui'

// [rank, label, icon, header background, header text]
const SEV = {
  MultipleBites: [4, 'Multiple Bites', Siren, 'var(--color-emergency)', 'var(--color-on-emergency)'],
  DeepWound: [3, 'Deep Wound', TriangleAlert, 'var(--color-danger-container)', 'var(--color-on-danger-container)'],
  BleedingWound: [2, 'Bleeding Wound', Droplets, 'var(--color-warning-container)', 'var(--color-on-warning-container)'],
  MinorScratch: [1, 'Minor Scratch', Info, 'var(--color-surface-alt)', 'var(--color-text-primary)'],
}
const CONDITION = {
  LookedHealthy: 'looked healthy', LookedSickOrAggressive: 'sick or aggressive', Stray: 'stray',
  OwnedAndVaccinated: 'pet, vaccinated', Unknown: 'condition unknown',
}
const minsSince = (d) => Math.max(0, Math.floor((Date.now() - new Date(d)) / 60000))
const ago = (m) => (m < 1 ? 'Just now' : m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ago`)
const waitText = (m) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`)

function ReportCard({ r, isNew, busy, onAccept, onDelete }) {
  const [rank, label, Icon, headBg, headFg] = SEV[r.severity] || SEV.MinorScratch
  const severe = rank >= 3
  const m = minsSince(r.createdAt)
  return (
    <article aria-label={`${r.victimName}, ${label}, ${ago(m)}`} style={{
      display: 'flex', flexDirection: 'column', borderRadius: 16, overflow: 'hidden',
      background: isNew && !severe ? 'var(--color-primary-container)' : 'var(--color-surface)',
      border: severe ? '2px solid var(--color-emergency)' : isNew ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 40, padding: '6px 14px', background: headBg, color: headFg }}>
        <Icon size={18} aria-hidden />
        <strong style={{ flex: 1, fontWeight: 600 }}>{label}{severe ? ' · severe' : ''}</strong>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}><Clock size={14} aria-hidden />{ago(m)}</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: severe ? 18 : 17, lineHeight: '26px', fontWeight: 600 }}>{r.victimName}</span>
          {isNew && <span className="rr-badge rr-badge--danger-solid" style={{ padding: '0 8px', fontSize: 11, lineHeight: '18px' }}>NEW</span>}
        </div>
        <a href={`tel:${r.contactNumber}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 32, fontWeight: 600, fontVariantNumeric: 'tabular-nums', textDecoration: 'none' }}>
          <Phone size={16} aria-hidden />{fmtPhone(r.contactNumber)}
        </a>
        <span>{r.animalType} · {CONDITION[r.animalStatus] || r.animalStatus}</span>
        <a href={`https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`} target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 6, alignSelf: 'flex-start' }}>
          <MapPin size={16} aria-hidden style={{ flex: 'none', marginTop: 3 }} />
          {r.tehsil ? `${r.tehsil} · ` : ''}{r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
        </a>
        {m >= 15 && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-danger)' }}>Waiting {waitText(m)}{severe ? ' — no hospital has accepted yet' : ''}</span>}
        <div style={{ marginTop: 4 }}><ReportMedia report={r} name={r.victimName} compact /></div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 14px 12px' }}>
        <button type="button" className={`rr-btn rr-btn--block ${severe ? 'rr-btn--lg rr-btn--emergency' : 'rr-btn--primary'}${busy ? ' is-loading' : ''}`}
          style={severe ? undefined : { minHeight: 48 }} disabled={busy} aria-busy={busy} onClick={onAccept}>
          {busy ? <Loader size={20} aria-hidden /> : <Check size={20} aria-hidden />}
          <span className="rr-btn__label">{busy ? 'Accepting…' : 'Accept'}</span>
        </button>
        <Button kind="text" size="sm" icon={Trash2} style={{ alignSelf: 'center', color: 'var(--color-text-secondary)' }} onClick={onDelete}>Delete report</Button>
      </div>
    </article>
  )
}

export default function IncomingReports() {
  const navigate = useNavigate()
  const toast = useToast()
  const { refresh: refreshCount, sound, setSound } = useUnread()
  const [reports, setReports] = useState(null)
  const [error, setError] = useState('')
  const [accepting, setAccepting] = useState(null)
  const [taken, setTaken] = useState({}) // id -> report shown as "accepted elsewhere" for a few seconds
  const [deleting, setDeleting] = useState(null)
  const newIds = useRef(new Set())
  const [, force] = useState(0)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/hospital/incoming-reports')
      setReports(res.data)
      setError('')
    } catch (err) {
      setError(err.response ? `The server returned an error (${err.response.status} · ${fmtTime(new Date()).slice(0, 5)}).` : `The server did not respond (${fmtTime(new Date()).slice(0, 5)}).`)
    }
  }, [])

  useEffect(() => { load() }, [load])
  // Keep "12m ago" and waiting times current.
  useEffect(() => { const t = setInterval(() => force(x => x + 1), 30000); return () => clearInterval(t) }, [])

  useEffect(() => {
    const a = onNewReport((r) => { newIds.current.add(r.id); load() })
    const b = onReportAccepted(({ reportId }) => {
      setReports(list => {
        const r = list?.find(x => x.id === reportId)
        if (r && accepting !== reportId) {
          setTaken(t => ({ ...t, [reportId]: r }))
          setTimeout(() => setTaken(t => { const { [reportId]: _, ...rest } = t; return rest }), 8000)
        }
        return list?.filter(x => x.id !== reportId) ?? list
      })
    })
    const c = onReportRemoved(({ reportId }) => setReports(list => list?.filter(x => x.id !== reportId) ?? list))
    return () => { a(); b(); c() }
  }, [load, accepting])

  const accept = async (r) => {
    if (accepting) return
    setAccepting(r.id)
    try {
      await api.post(`/hospital/reports/${r.id}/accept`)
      setReports(list => list.filter(x => x.id !== r.id))
      refreshCount()
      toast(`Accepted ${r.victimName}. Added to My Cases.`, { action: { label: 'View', onClick: () => navigate('/cases') } })
    } catch (err) {
      if (err.response?.status === 409) {
        setReports(list => list.filter(x => x.id !== r.id))
        toast(`${r.victimName} was already accepted by another hospital.`, { error: true })
      } else {
        toast(err.response?.data?.error || 'Could not accept the report. Try again.', { error: true, action: { label: 'Try again', onClick: () => accept(r) } })
      }
    } finally {
      setAccepting(null)
    }
  }

  const rank = (r) => (SEV[r.severity] || SEV.MinorScratch)[0]
  const newestFirst = (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  const list = reports || []
  const severe = list.filter(r => rank(r) >= 3).sort((a, b) => rank(b) - rank(a) || newestFirst(a, b))
  const other = list.filter(r => rank(r) < 3).sort(newestFirst)
  const takenCards = Object.values(taken)

  const card = (r) => (
    <ReportCard key={r.id} r={r} isNew={newIds.current.has(r.id)} busy={accepting === r.id}
      onAccept={() => accept(r)} onDelete={() => setDeleting(r)} />
  )
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ margin: 0, fontSize: 22, lineHeight: '30px', fontWeight: 600 }}>
            Incoming Reports <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>({list.length})</span>
          </h1>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Unaccepted bite reports in Jabalpur · severe first, then newest</div>
        </div>
        <Button kind="secondary" size="sm" icon={sound ? Bell : BellOff} aria-pressed={sound} onClick={() => setSound(!sound)}>{sound ? 'Sound on' : 'Sound off'}</Button>
      </div>

      {error && (
        <Notice title="Could not load incoming reports." action={<Button kind="secondary" size="sm" icon={RefreshCw} onClick={load}>Retry</Button>}>
          {error} Patients may be waiting — try again or call the District control room.
        </Notice>
      )}

      {!reports && !error && (
        <div style={grid}>
          {[1, 2, 3].map(i => (
            <div key={i} className="rr-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Skeleton w={120} h={24} pill /><Skeleton w="60%" h={18} /><Skeleton w="45%" /><Skeleton w="75%" /><Skeleton h={48} pill />
            </div>
          ))}
        </div>
      )}

      {reports && list.length === 0 && takenCards.length === 0 && (
        <div className="rr-card" style={{ padding: 0 }}>
          <StateView icon={Inbox} title="No incoming reports" body="New bite reports from your city will appear here instantly, with a sound and a notice at the top right." />
        </div>
      )}

      {takenCards.length > 0 && (
        <div style={grid}>
          {takenCards.map(r => (
            <div key={r.id} role="status" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, minHeight: 120, padding: 16, borderRadius: 16, border: '1px dashed var(--color-border-strong)', background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-primary)', fontWeight: 600 }}><CircleSlash size={18} aria-hidden />Accepted by another hospital</span>
              <span>{r.victimName} was accepted by another hospital. Removed from your list.</span>
            </div>
          ))}
        </div>
      )}

      {severe.length > 0 && (
        <section aria-labelledby="sev-h" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 id="sev-h" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 15, lineHeight: '22px', fontWeight: 600, color: 'var(--color-emergency)' }}>
            <Siren size={18} aria-hidden />Severe — accept first ({severe.length})
          </h2>
          <div style={grid}>{severe.map(card)}</div>
        </section>
      )}

      {other.length > 0 && (
        <section aria-labelledby="oth-h" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 id="oth-h" style={{ margin: 0, fontSize: 15, lineHeight: '22px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Other reports ({other.length})</h2>
          <div style={grid}>{other.map(card)}</div>
        </section>
      )}

      {deleting && (
        <DeleteReportDialog reportId={deleting.id} name={deleting.victimName} hasCase={false} onClose={() => setDeleting(null)}
          onDeleted={() => {
            setReports(list => list.filter(x => x.id !== deleting.id))
            refreshCount()
            toast(`Report from ${deleting.victimName} deleted.`)
            setDeleting(null)
          }} />
      )}
    </div>
  )
}
