import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Hospital, Phone, Mail, MapPin, Printer, ClipboardList, RefreshCw, FileX } from 'lucide-react'
import api from '../services/api'
import { Badge, Button, Notice, Skeleton, StateView, fmtDate, fmtDateTime, fmtPhone } from '../components/ui'

export default function HospitalCases() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setError(null)
    api.get(`/government/hospitals/${id}/cases`)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.status === 404 ? 'notfound' : 'error'))
  }, [id])
  useEffect(() => { load() }, [load])

  const back = <Link to="/hospitals" className="rr-btn rr-btn--text rr-btn--sm rr-noprint" style={{ alignSelf: 'flex-start' }}><ArrowLeft size={16} aria-hidden /><span className="rr-btn__label">Back to hospitals</span></Link>
  if (error === 'notfound') return <div>{back}<StateView icon={FileX} title="Hospital not found" /></div>

  const h = data?.hospital
  const email = h?.contactEmail

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {back}
      {error && <Notice title="Could not load this hospital's cases." action={<Button kind="secondary" size="sm" icon={RefreshCw} onClick={load}>Retry</Button>}>Check your connection.</Notice>}

      <section className="rr-card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <span style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 999, background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)' }}><Hospital size={22} aria-hidden /></span>
        {h ? (
          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 22, lineHeight: '30px', fontWeight: 600 }}>{h.name}</h1>
              <Badge kind="hospital" value={h.status} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: 4, color: 'var(--color-text-secondary)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={14} aria-hidden />{h.address}, {h.city?.name}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Phone size={14} aria-hidden />{fmtPhone(h.contactNumber)}</span>
              {email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Mail size={14} aria-hidden />{email}</span>}
            </div>
          </div>
        ) : <div style={{ flex: 1 }} className="rr-skel-stack"><Skeleton w="40%" h={24} /><Skeleton w="60%" /></div>}
        <Button kind="secondary" size="sm" icon={Printer} className="rr-noprint" onClick={() => window.print()}>Print</Button>
      </section>

      <div className="rr-print-only" style={{ fontSize: 12 }}>Printed {fmtDate(new Date())}</div>

      <div className="rr-table-wrap">
        <table className="rr-table">
          <thead><tr><th scope="col">Patient</th><th scope="col">Animal</th><th scope="col">Severity</th><th scope="col">Status</th><th scope="col">Source</th><th scope="col">Doses given</th><th scope="col" className="is-num">Date</th></tr></thead>
          <tbody>
            {!data && !error && [1, 2, 3].map(i => <tr key={i}>{[60, 40, 50, 50, 40, 60, 50].map((w, j) => <td key={j}><Skeleton w={`${w}%`} /></td>)}</tr>)}
            {data?.cases.map(c => {
              const given = c.doses.filter(d => d.givenDate).length
              const row = (
                <>
                  <td style={{ fontWeight: 600 }}>{c.patientName}</td>
                  <td>{c.animalType}</td>
                  <td><Badge kind="severity" value={c.severity} /></td>
                  <td><Badge kind="report" value={c.status} /></td>
                  <td>{c.source === 'hospital_direct' ? 'Walk-in' : 'App Report'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ display: 'block', width: 70, height: 6, borderRadius: 999, background: 'var(--color-surface-alt)' }}>
                        <span style={{ display: 'block', width: `${given * 20}%`, height: 6, borderRadius: 999, background: given === 5 ? 'var(--color-success)' : 'var(--color-primary)' }} />
                      </span>
                      <span className="rr-tabular">{given} / 5</span>
                    </div>
                  </td>
                  <td className="is-num" style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(c.createdAt)}</td>
                </>
              )
              return c.biteReportId
                ? <tr key={c.id} className="is-clickable" tabIndex={0} aria-label={`Open case: ${c.patientName}`} onClick={() => navigate(`/cases/${c.biteReportId}`)} onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/cases/${c.biteReportId}`) }}>{row}</tr>
                : <tr key={c.id}>{row}</tr>
            })}
            {data?.cases.length === 0 && (
              <tr><td colSpan={7}><StateView icon={ClipboardList} title="No cases at this hospital yet" body="Cases appear here when the hospital accepts a bite report or registers a walk-in patient." /></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
