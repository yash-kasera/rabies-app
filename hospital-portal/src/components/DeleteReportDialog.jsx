import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import api from '../services/api'
import { Button, Dialog, Field, Notice } from './ui'

const REASONS = ['Duplicate report', 'Fake or prank report', 'Reported by mistake', 'Patient asked to remove it']

/**
 * Deletes a citizen's bite report (and this hospital's case for it, if accepted).
 * The government sees the deletion and the reason in its Activity Log.
 */
export default function DeleteReportDialog({ reportId, name, hasCase, onClose, onDeleted }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      await api.delete(`/hospital/reports/${reportId}`, { data: { reason: reason.trim() } })
      onDeleted()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete the report.')
      setBusy(false)
    }
  }

  return (
    <Dialog icon={Trash2} tone="danger" alert title={`Delete report from ${name}?`} onClose={onClose}
      actions={<>
        <Button kind="text" onClick={onClose}>Cancel</Button>
        <Button kind="danger" icon={Trash2} disabled={busy || !reason.trim()} onClick={submit}>{busy ? 'Deleting…' : 'Delete report'}</Button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0 }}>
          The report, its photo and voice note{hasCase ? ', and this case with its vaccine dose records,' : ''} will be permanently deleted.
          The deletion and your reason are sent to the government’s Activity Log.
        </p>
        {error && <Notice>{error}</Notice>}
        <Field label="Reason" htmlFor="del-reason">
          <input id="del-reason" className="rr-input" list="del-reasons" maxLength={500} value={reason} onChange={e => setReason(e.target.value)} placeholder="Choose or type a reason" />
          <datalist id="del-reasons">{REASONS.map(r => <option key={r} value={r} />)}</datalist>
        </Field>
      </div>
    </Dialog>
  )
}
