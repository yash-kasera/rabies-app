import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Siren, Phone, Hospital, Printer, ImageOff, Image as ImageIcon, RefreshCw, FileX,
  CircleCheck, Clock, CalendarClock, Circle, Mic, Play, Trash2,
} from 'lucide-react'
import api from '../services/api'
import { onReportAccepted, onReportRemoved } from '../services/socket'
import DeleteReportDialog from '../components/DeleteReportDialog'
import { Badge, Button, Dialog, Notice, Skeleton, StateView, useToast, fmtDateTime, fmtDay, fmtPhone, minutesAgo, reportNumber } from '../components/ui'

const ANIMAL_STATUS = {
  LookedHealthy: 'looked healthy', LookedSickOrAggressive: 'looked sick or aggressive', Stray: 'stray',
  OwnedAndVaccinated: 'owned and vaccinated', Unknown: 'status unknown',
}
const whoCategory = (s) => (s === 'MinorScratch' ? 'WHO Category II' : 'WHO Category III')
const ESCALATE_MIN = 30

const H2 = ({ children }) => <h2 style={{ margin: '0 0 10px', fontSize: 16, lineHeight: '24px', fontWeight: 600 }}>{children}</h2>
const Row = ({ label, children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '110px minmax(0,1fr)', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
    <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span><span>{children}</span>
  </div>
)

function WoundPhoto({ id }) {
  const [src, setSrc] = useState(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let url
    api.get(`/reports/${id}/photo`, { responseType: 'blob' })
      .then(res => { url = URL.createObjectURL(res.data); setSrc(url) })
      .catch(() => setFailed(true))
    return () => url && URL.revokeObjectURL(url)
  }, [id])
  if (failed) return <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)' }}><ImageOff size={18} aria-hidden />Photo could not be loaded.</div>
  if (!src) return <Skeleton h={160} />
  return (
    <a href={src} target="_blank" rel="noreferrer" title="Open full size">
      <img src={src} alt="Wound photo sent by the patient" style={{ display: 'block', maxWidth: '100%', maxHeight: 260, borderRadius: 8, border: '1px solid var(--color-border)' }} />
    </a>
  )
}

function VoiceNote({ id, seconds }) {
  const [src, setSrc] = useState(null)
  const [state, setState] = useState('idle') // idle | loading | failed
  useEffect(() => () => src && URL.revokeObjectURL(src), [src])
  const load = () => {
    setState('loading')
    api.get(`/reports/${id}/voice`, { responseType: 'blob' })
      .then(res => { setSrc(URL.createObjectURL(res.data)); setState('idle') })
      .catch(() => setState('failed'))
  }
  if (src) return <audio src={src} controls autoPlay style={{ width: '100%', maxWidth: 360 }} aria-label="Patient's voice note" />
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <Button kind="secondary" size="sm" icon={Play} disabled={state === 'loading'} onClick={load}>
        {state === 'loading' ? 'Loading…' : `Play voice note${seconds ? ` (${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')})` : ''}`}
      </Button>
      {state === 'failed' && <span style={{ color: 'var(--color-danger)' }}>Could not load the voice note.</span>}
    </div>
  )
}

function timeline(r) {
  const ev = [{ at: r.createdAt, text: `Reported by ${r.user?.fullName || 'citizen'} via the citizen app` }]
  const c = r.case_
  const acceptedAt = c?.createdAt ? new Date(c.createdAt) : null
  const escAt = new Date(new Date(r.createdAt).getTime() + ESCALATE_MIN * 60000)
  if ((acceptedAt && acceptedAt > escAt) || (r.status === 'Reported' && Date.now() > escAt)) {
    ev.push({ at: escAt, text: `Escalated — not accepted within ${ESCALATE_MIN} minutes`, tone: 'emergency' })
  }
  if (c) {
    ev.push({
      at: c.createdAt,
      text: c.creator?.role === 'government'
        ? `Assigned to ${r.hospital?.name} by ${c.creator.fullName}`
        : `Accepted by ${r.hospital?.name}`,
    })
    c.doses.filter(d => d.givenDate).forEach(d => ev.push({ at: d.givenDate, text: `Dose ${d.doseNumber} given` }))
  }
  if (r.status === 'Cancelled') ev.push({ at: r.updatedAt, text: 'Report cancelled' })
  return ev.sort((a, b) => new Date(a.at) - new Date(b.at))
}

export default function CaseDetail() {
  const { id } = useParams()
  const toast = useToast()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const [r, setR] = useState(null)
  const [error, setError] = useState(null) // 'notfound' | 'error'
  const [assignOpen, setAssignOpen] = useState(false)
  const [choice, setChoice] = useState(null)
  const [assigning, setAssigning] = useState(false)

  const load = useCallback(() => {
    setError(null)
    api.get(`/government/reports/${id}`)
      .then(res => setR(res.data))
      .catch(err => setError(err.response?.status === 404 ? 'notfound' : 'error'))
  }, [id])
  useEffect(() => { load() }, [load])
  useEffect(() => onReportAccepted((e) => { if (String(e?.reportId ?? e?.id) === String(id)) load() }), [id, load])
  useEffect(() => onReportRemoved((e) => { if (String(e?.reportId) === String(id)) setError('notfound') }), [id])

  const assign = async () => {
    setAssigning(true)
    try {
      const res = await api.post(`/government/reports/${id}/assign`, { hospitalId: choice })
      setAssignOpen(false)
      toast(`Assigned to ${res.data.hospital.name}.`)
      load()
    } catch (err) {
      setAssignOpen(false)
      toast(err.response?.status === 409 ? 'Another hospital accepted this report first.' : (err.response?.data?.error || 'Could not assign the hospital.'), { error: true })
      load()
    } finally {
      setAssigning(false)
    }
  }

  const back = <Link to="/dashboard" className="rr-btn rr-btn--text rr-btn--sm rr-noprint" style={{ alignSelf: 'flex-start' }}><ArrowLeft size={16} aria-hidden /><span className="rr-btn__label">Back to all cases</span></Link>

  if (error === 'notfound') return <div>{back}<StateView icon={FileX} title="Report not found" body="It may have been removed, or the link is wrong." /></div>
  if (error) return <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{back}<Notice title="Could not load this case." action={<Button kind="secondary" size="sm" icon={RefreshCw} onClick={load}>Retry</Button>}>Check your connection.</Notice></div>
  if (!r) return <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{back}<div className="rr-card rr-skel-stack"><Skeleton w="30%" /><Skeleton w="50%" h={24} /><Skeleton w="40%" /></div></div>

  const unaccepted = r.status === 'Reported'
  const doses = r.case_?.doses || []
  const given = doses.filter(d => d.givenDate).length
  const nextDue = doses.find(d => !d.givenDate)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {back}
      {unaccepted && (
        <Notice tone="emergency" icon={Siren} strong title={`No hospital has accepted this report for ${minutesAgo(r.minutesWaiting)}.`}>
          Call the patient, then assign the nearest active hospital.
        </Notice>
      )}

      <section className="rr-card" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}><span style={{ fontFamily: 'var(--font-mono)' }}>{reportNumber(r.id)}</span> · reported {fmtDateTime(r.createdAt)}</div>
          <h1 style={{ margin: '2px 0 8px', fontSize: 24, lineHeight: '32px', fontWeight: 600 }}>{r.victimName}</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <Badge kind="report" value={r.status} lg />
            <Badge kind="severity" value={r.severity} lg pips />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{whoCategory(r.severity)}</span>
          </div>
        </div>
        <div className="rr-noprint" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <a className="rr-btn rr-btn--secondary" href={`tel:${r.contactNumber}`}><Phone size={20} aria-hidden /><span className="rr-btn__label">Call {fmtPhone(r.contactNumber)}</span></a>
          {unaccepted && <Button kind="emergency" icon={Hospital} onClick={() => { setChoice(r.nearestHospitals[0]?.id ?? null); setAssignOpen(true) }}>Assign hospital</Button>}
          <Button kind="text" icon={Printer} onClick={() => window.print()}>Print</Button>
          <Button kind="text" icon={Trash2} style={{ color: 'var(--color-danger)' }} onClick={() => setDeleting(true)}>Delete</Button>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <section className="rr-card">
            <H2>Bite details</H2>
            <Row label="Animal">{r.animalType} · {ANIMAL_STATUS[r.animalStatus] || r.animalStatus}</Row>
            <Row label="Bitten at">{fmtDateTime(r.incidentDatetime)}</Row>
            <Row label="Location">{r.tehsil ? `${r.tehsil} tehsil` : 'Outside Jabalpur district'} · <span className="rr-tabular">{r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}</span></Row>
            <Row label="Notes">{r.description || <span style={{ color: 'var(--color-text-secondary)' }}>{r.voiceSeconds != null ? 'See voice note below' : 'No description given'}</span>}</Row>
            {r.voiceSeconds != null && (
              <div style={{ marginTop: 10 }}>
                <div style={{ marginBottom: 6, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}><Mic size={16} aria-hidden />Voice note from the patient</div>
                <VoiceNote id={r.id} seconds={r.voiceSeconds} />
              </div>
            )}
            <div style={{ marginTop: 10 }}>
              <div style={{ marginBottom: 6, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}><ImageIcon size={16} aria-hidden />Wound photo</div>
              {r.hasPhoto ? <WoundPhoto id={r.id} /> : <div style={{ padding: 16, borderRadius: 8, border: '1px dashed var(--color-border-strong)', color: 'var(--color-text-secondary)' }}>No photo attached</div>}
            </div>
          </section>

          <section className="rr-card">
            <H2>Vaccine schedule</H2>
            {doses.length === 0 ? (
              <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>The 5-dose schedule starts when a hospital accepts the report.</p>
            ) : <>
              <div style={{ marginBottom: 8, fontWeight: 600 }}><span className="rr-tabular">{given} / 5</span> doses given</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 6 }}>
                {doses.map(d => {
                  const done = !!d.givenDate
                  const next = d === nextDue && r.status !== 'Cancelled'
                  const [bg, fg, Icon, label] = done
                    ? ['var(--color-success-container)', 'var(--color-on-success-container)', CircleCheck, 'Given']
                    : next ? ['var(--color-warning-container)', 'var(--color-on-warning-container)', Clock, 'Due next']
                      : ['var(--color-surface-alt)', 'var(--color-text-secondary)', Circle, 'Scheduled']
                  return (
                    <div key={d.id} style={{ padding: '8px 6px', borderRadius: 8, background: bg, color: fg, textAlign: 'center', fontSize: 12, lineHeight: '16px' }}>
                      <Icon size={16} aria-hidden />
                      <div style={{ fontWeight: 600 }}>Dose {d.doseNumber}</div>
                      <div>{label}</div>
                      <div>{fmtDay(d.givenDate || d.scheduledDate)}</div>
                    </div>
                  )
                })}
              </div>
            </>}
          </section>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <section className="rr-card">
            <H2>Patient</H2>
            <Row label="Phone"><a href={`tel:${r.contactNumber}`} style={{ color: 'var(--color-primary)' }}>{fmtPhone(r.contactNumber)}</a></Row>
            <Row label="Reported by">{r.user?.fullName}{r.user?.phoneNumber && r.user.phoneNumber !== r.contactNumber ? ` · ${fmtPhone(r.user.phoneNumber)}` : ''}</Row>
          </section>

          <section className="rr-card">
            <H2>Hospital</H2>
            {r.hospital ? <>
              <div style={{ fontWeight: 600 }}>{r.hospital.name}</div>
              <div style={{ color: 'var(--color-text-secondary)' }}>{r.hospital.address}</div>
              <a href={`tel:${r.hospital.contactNumber}`} style={{ color: 'var(--color-primary)' }}>{fmtPhone(r.hospital.contactNumber)}</a>
            </> : <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>{r.status === 'Cancelled' ? 'The report was cancelled before a hospital accepted it.' : 'Not accepted by any hospital yet.'}</p>}
          </section>

          <section className="rr-card">
            <H2>Activity</H2>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {timeline(r).map((e, i) => (
                <li key={i} style={{ display: 'grid', gridTemplateColumns: '18px minmax(0,1fr)', gap: 10, padding: '6px 0' }}>
                  <CalendarClock size={16} aria-hidden style={{ marginTop: 2, color: e.tone ? 'var(--color-emergency)' : 'var(--color-text-secondary)' }} />
                  <div>
                    <div style={e.tone ? { color: 'var(--color-emergency)', fontWeight: 600 } : undefined}>{e.text}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{fmtDateTime(e.at)}</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      {deleting && (
        <DeleteReportDialog report={r} onClose={() => setDeleting(false)}
          onDeleted={() => { toast(`Report from ${r.victimName} deleted. Recorded in the Activity Log.`); navigate('/dashboard', { replace: true }) }} />
      )}

      {assignOpen && (
        <Dialog icon={Hospital} tone="emergency" title="Assign a hospital" onClose={() => setAssignOpen(false)} maxWidth={560}
          actions={<>
            <Button kind="text" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button kind="emergency" disabled={!choice || assigning} onClick={assign}>{assigning ? 'Assigning…' : 'Assign'}</Button>
          </>}>
          {r.nearestHospitals.length === 0 ? <p style={{ margin: 0 }}>No active hospitals in {r.city?.name}. Add or activate one in Manage Hospitals.</p> : <>
            <p style={{ margin: '0 0 10px', color: 'var(--color-text-secondary)' }}>Nearest active hospitals to where the bite was reported. The hospital will see this case in its list immediately.</p>
            <div role="radiogroup" aria-label="Hospital" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {r.nearestHospitals.map(h => (
                <label key={h.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 12, cursor: 'pointer', border: `${choice === h.id ? 2 : 1}px solid ${choice === h.id ? 'var(--color-primary)' : 'var(--color-border)'}`, background: choice === h.id ? 'var(--color-primary-container)' : 'var(--color-surface)' }}>
                  <input type="radio" name="hosp" checked={choice === h.id} onChange={() => setChoice(h.id)} style={{ marginTop: 4 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 600 }}>{h.name}</span>
                    <span style={{ display: 'block', fontSize: 13, color: 'var(--color-text-secondary)' }}>{h.address} · {h.openCases} active case{h.openCases === 1 ? '' : 's'}</span>
                  </span>
                  <span className="rr-tabular" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{h.distanceKm} km</span>
                </label>
              ))}
            </div>
          </>}
        </Dialog>
      )}
    </div>
  )
}
