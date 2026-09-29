import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import api from '../services/api'
import { Button, Dialog, Field, Notice } from './ui'

const REASONS = ['Duplicate report', 'Fake or prank report', 'Reported by mistake', 'Patient asked to remove it']

/** Deletes a bite report after asking why. The deletion and reason go to the Activity Log. */
export default function DeleteReportDialog({ report, onClose, onDeleted }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const hasCase = report.status !== 'Reported' && report.status !== 'Cancelled'

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      await api.delete(`/government/reports/${report.id}`, { data: { reason: reason.trim() } })
      onDeleted()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete the report.')
      setBusy(false)
    }
  }

  return (
    <Dialog icon={Trash2} tone="danger" alert title={`Delete report from ${report.victimName}?`} onClose={onClose}
      actions={<>
        <Button kind="text" onClick={onClose}>Cancel</Button>
        <Button kind="danger" icon={Trash2} disabled={busy || !reason.trim()} onClick={submit}>{busy ? 'Deleting…' : 'Delete report'}</Button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0 }}>
          The report, its photo and voice note{hasCase ? ', and the hospital’s case with its vaccine dose records,' : ''} will be permanently deleted.
          It disappears from the citizen’s app too. A summary is kept in the Activity Log.
        </p>
        {error && <Notice>{error}</Notice>}
        <Field label="Reason" htmlFor="del-reason" hint="Recorded in the Activity Log.">
          <input id="del-reason" className="rr-input" list="del-reasons" maxLength={500} value={reason} onChange={e => setReason(e.target.value)} placeholder="Choose or type a reason" />
          <datalist id="del-reasons">{REASONS.map(r => <option key={r} value={r} />)}</datalist>
        </Field>
      </div>
    </Dialog>
  )
}
