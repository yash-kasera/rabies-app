import { useCallback, useEffect, useState } from 'react'
import { ScrollText, Trash2, RefreshCw, ChevronLeft, ChevronRight, FileX, Hospital, UserX, Eraser } from 'lucide-react'
import api from '../services/api'
import { onReportRemoved } from '../services/socket'
import { Button, Dialog, Notice, Skeleton, StateView, useToast, fmtDateTime, statusLabel } from '../components/ui'

const ACTIONS = {
  report_deleted: [FileX, 'danger', 'Report deleted'],
  hospital_deleted: [Hospital, 'danger', 'Hospital deleted'],
  staff_removed: [UserX, 'warning', 'Staff removed'],
  log_cleared: [Eraser, 'neutral', 'Log cleared'],
}
const ROLES = {
  government_admin: 'Super admin', government: 'Government staff',
  hospital_admin: 'Hospital admin', hospital_staff: 'Hospital staff',
}

function Details({ log }) {
  const d = log.details || {}
  if (log.action === 'report_deleted') {
    return <>{[d.animalType, d.severity && statusLabel('severity', d.severity), d.status && statusLabel('report', d.status), d.tehsil,
      d.acceptedBy && `accepted by ${d.acceptedBy}`, d.dosesGiven ? `${d.dosesGiven} dose${d.dosesGiven === 1 ? '' : 's'} given` : null,
      d.reportedAt && `reported ${fmtDateTime(d.reportedAt)}`].filter(Boolean).join(' · ')}</>
  }
  if (log.action === 'hospital_deleted') {
    return <>{[d.logins?.length ? `${d.logins.length} login${d.logins.length === 1 ? '' : 's'} disabled` : null,
      d.reportsReturnedToWaiting?.length ? `${d.reportsReturnedToWaiting.length} report${d.reportsReturnedToWaiting.length === 1 ? '' : 's'} returned to waiting` : null,
      d.walkInCasesClosed ? `${d.walkInCasesClosed} walk-in case${d.walkInCasesClosed === 1 ? '' : 's'} closed` : null].filter(Boolean).join(' · ') || 'No open cases'}</>
  }
  if (log.action === 'staff_removed') return <>{d.hospital}</>
  if (log.action === 'log_cleared') return <>{d.entriesCleared ?? 0} entries cleared</>
  return null
}

export default function ActivityLog() {
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearing, setClearing] = useState(false)

  const load = useCallback(() => {
    setError(false)
    api.get('/government/logs', { params: { page } }).then(res => setData(res.data)).catch(() => setError(true))
  }, [page])
  useEffect(() => { load() }, [load])
  useEffect(() => onReportRemoved(() => { if (page === 1) load() }), [page, load])

  const clear = async () => {
    setClearing(true)
    try {
      const res = await api.delete('/government/logs')
      setConfirmClear(false)
      setPage(1)
      load()
      toast(`Activity log cleared (${res.data.cleared} entries).`)
    } catch (err) {
      toast(err.response?.data?.error || 'Could not clear the log.', { error: true })
    } finally {
      setClearing(false)
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 22, lineHeight: '30px', fontWeight: 600 }}>Activity Log</h1>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
            Deleted reports, deleted hospitals and removed hospital staff — by hospitals and government officers{data ? ` · ${data.total} entr${data.total === 1 ? 'y' : 'ies'}` : ''}
          </p>
        </div>
        {data?.canClear && <Button kind="secondary" icon={Trash2} disabled={!data.total} onClick={() => setConfirmClear(true)}>Clear log</Button>}
      </div>

      {error && <Notice title="Could not load the activity log." action={<Button kind="secondary" size="sm" icon={RefreshCw} onClick={load}>Retry</Button>}>Check your connection.</Notice>}

      <div className="rr-table-wrap">
        <table className="rr-table">
          <thead><tr><th scope="col">When</th><th scope="col">What</th><th scope="col">Record</th><th scope="col">By</th><th scope="col">Reason</th></tr></thead>
          <tbody>
            {!data && !error && [1, 2, 3].map(i => <tr key={i}>{[50, 60, 80, 70, 60].map((w, j) => <td key={j}><Skeleton w={`${w}%`} /></td>)}</tr>)}
            {data?.logs.map(l => {
              const [Icon, tone, label] = ACTIONS[l.action] || [ScrollText, 'neutral', l.action]
              return (
                <tr key={l.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(l.createdAt)}</td>
                  <td><span className={`rr-badge rr-badge--${tone}`}><Icon size={14} aria-hidden /><span>{label}</span></span></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{l.subject}</div>
                    <div style={{ fontSize: 12, lineHeight: '16px', color: 'var(--color-text-secondary)' }}><Details log={l} /></div>
                  </td>
                  <td>
                    <div>{l.actorName}</div>
                    <div style={{ fontSize: 12, lineHeight: '16px', color: 'var(--color-text-secondary)' }}>{[ROLES[l.actorRole] || l.actorRole, l.hospitalName].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td>{l.reason || <span style={{ color: 'var(--color-text-secondary)' }}>—</span>}</td>
                </tr>
              )
            })}
            {data?.logs.length === 0 && (
              <tr><td colSpan={5}><StateView icon={ScrollText} title="Nothing logged yet" body="When a hospital or officer deletes a report, deletes a hospital or removes hospital staff, it appears here." /></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.total > data.pageSize && (
        <nav aria-label="Pagination" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text-secondary)' }}>Page {page} of {pages}</span>
          <Button kind="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <Button kind="secondary" size="sm" iconRight={ChevronRight} disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </nav>
      )}

      {confirmClear && (
        <Dialog icon={Trash2} tone="danger" alert title="Clear the activity log?" onClose={() => setConfirmClear(false)}
          actions={<>
            <Button kind="text" onClick={() => setConfirmClear(false)}>Cancel</Button>
            <Button kind="danger" icon={Trash2} disabled={clearing} onClick={clear}>{clearing ? 'Clearing…' : `Clear ${data.total} entries`}</Button>
          </>}>
          <p style={{ margin: 0 }}>All {data.total} entries are permanently deleted. One entry is kept recording that you cleared the log, and when.</p>
        </Dialog>
      )}
    </div>
  )
}
