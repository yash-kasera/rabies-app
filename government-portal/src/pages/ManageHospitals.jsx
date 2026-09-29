import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Hospital, Pencil, ClipboardList, KeyRound, PowerOff, RefreshCw } from 'lucide-react'
import api from '../services/api'
import useCities from '../hooks/useCities'
import { PinPicker } from '../components/TehsilMap'
import CredentialsDialog from '../components/CredentialsDialog'
import { Badge, Button, Dialog, Field, Notice, Skeleton, StateView, useToast, fmtPhone } from '../components/ui'

const EMPTY = { name: '', address: '', contactNumber: '', staffEmail: '', latitude: null, longitude: null }

function HospitalForm({ editing, cityId, onClose, onSaved }) {
  const [form, setForm] = useState(editing
    ? { name: editing.name, address: editing.address, contactNumber: editing.contactNumber, staffEmail: editing.accounts?.[0]?.email || '', latitude: editing.latitude, longitude: editing.longitude }
    : EMPTY)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.latitude == null) return setError('Click the map to place the hospital.')
    setSaving(true)
    try {
      const body = { name: form.name, address: form.address, contactNumber: form.contactNumber, latitude: form.latitude, longitude: form.longitude }
      if (editing) {
        await api.patch(`/government/hospitals/${editing.id}`, body)
        onSaved(null, `${form.name} updated.`)
      } else {
        const res = await api.post('/government/hospitals', { ...body, cityId, staffEmail: form.staffEmail || undefined })
        onSaved(res.data.staffAccount, `${form.name} added.`)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save the hospital.')
      setSaving(false)
    }
  }

  return (
    <Dialog icon={Hospital} title={editing ? `Edit ${editing.name}` : 'Add hospital'} onClose={onClose} maxWidth={680}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <Notice>{error}</Notice>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          <Field label="Hospital name" htmlFor="h-name"><input id="h-name" className="rr-input" required value={form.name} onChange={set('name')} /></Field>
          <Field label="Contact number" htmlFor="h-phone"><input id="h-phone" className="rr-input" type="tel" inputMode="tel" required value={form.contactNumber} onChange={set('contactNumber')} /></Field>
        </div>
        <Field label="Address" htmlFor="h-addr"><input id="h-addr" className="rr-input" required value={form.address} onChange={set('address')} /></Field>
        <Field label="Login email" htmlFor="h-login" hint={editing ? 'The login email cannot be changed here.' : 'Hospital staff log in to the Hospital Portal with this. Leave blank to generate one.'}>
          <input id="h-login" className="rr-input" type="email" value={form.staffEmail} onChange={set('staffEmail')} readOnly={!!editing} />
        </Field>
        <div className="rr-field">
          <span className="rr-label">Location</span>
          <PinPicker lat={form.latitude} lng={form.longitude} onPick={(latitude, longitude) => setForm(f => ({ ...f, latitude, longitude }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input aria-label="Latitude" className="rr-input rr-tabular" readOnly value={form.latitude ?? ''} placeholder="Latitude" />
            <input aria-label="Longitude" className="rr-input rr-tabular" readOnly value={form.longitude ?? ''} placeholder="Longitude" />
          </div>
          <span className="rr-hint">{form.latitude == null ? 'Click the map to place the hospital.' : 'Click again to move the pin.'}</span>
        </div>
        <div className="rr-dialog__actions" style={{ padding: 0 }}>
          <Button kind="text" onClick={onClose}>Cancel</Button>
          <button type="submit" className="rr-btn rr-btn--primary" disabled={saving}><span className="rr-btn__label">{saving ? 'Saving…' : editing ? 'Save changes' : 'Create hospital'}</span></button>
        </div>
      </form>
    </Dialog>
  )
}

export default function ManageHospitals() {
  const navigate = useNavigate()
  const toast = useToast()
  const cities = useCities()
  const [hospitals, setHospitals] = useState(null)
  const [error, setError] = useState(false)
  const [form, setForm] = useState(null) // { editing } | null
  const [creds, setCreds] = useState(null)
  const [deactivate, setDeactivate] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setError(false)
    api.get('/government/hospitals').then(res => setHospitals(res.data)).catch(() => setError(true))
  }, [])
  useEffect(() => { load() }, [load])

  const setStatus = async (h, status) => {
    setBusy(true)
    try {
      await api.patch(`/government/hospitals/${h.id}`, { status })
      toast(status === 'Active' ? `${h.name} is active and will receive bite reports.` : `${h.name} deactivated.`)
      setDeactivate(null)
      load()
    } catch (err) {
      toast(err.response?.data?.error || 'Could not change the status.', { error: true })
    } finally {
      setBusy(false)
    }
  }

  const resetPassword = async (h) => {
    try {
      const res = await api.post(`/government/hospitals/${h.id}/reset-staff-password`)
      setCreds({ title: 'Password reset', intro: `New temporary password for ${h.name}.`, login: res.data.staffAccount.email, password: res.data.staffAccount.tempPassword })
    } catch (err) {
      toast(err.response?.data?.error || 'Could not reset the password.', { error: true })
    }
  }

  const active = hospitals?.filter(h => h.status === 'Active').length ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 22, lineHeight: '30px', fontWeight: 600 }}>Manage Hospitals</h1>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
            {hospitals ? `${hospitals.length} registered · ${active} active · receiving bite reports in Jabalpur` : 'Loading…'}
          </p>
        </div>
        <Button icon={Plus} onClick={() => setForm({ editing: null })} disabled={!cities.length}>Add Hospital</Button>
      </div>

      {error && <Notice title="Could not load hospitals." action={<Button kind="secondary" size="sm" icon={RefreshCw} onClick={load}>Retry</Button>}>Check your connection.</Notice>}

      <div className="rr-table-wrap">
        <table className="rr-table">
          <thead><tr><th scope="col">Name</th><th scope="col">City</th><th scope="col">Contact</th><th scope="col" className="is-num">Cases</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
          <tbody>
            {!hospitals && !error && [1, 2, 3].map(i => <tr key={i}>{[70, 40, 50, 20, 60, 80].map((w, j) => <td key={j}><Skeleton w={`${w}%`} /></td>)}</tr>)}
            {hospitals?.map(h => {
              const on = h.status === 'Active'
              return (
                <tr key={h.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{h.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{h.accounts?.[0]?.email || 'No login account'}</div>
                  </td>
                  <td>{h.city?.name}{h.tehsil && h.tehsil !== h.city?.name ? <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{h.tehsil} tehsil</div> : null}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtPhone(h.contactNumber)}</td>
                  <td className="is-num">
                    <div className="rr-tabular" style={{ fontWeight: 600 }}>{h._count?.cases ?? 0}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{h.openCases} open</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button type="button" role="switch" aria-checked={on} aria-label={`${h.name} receives reports`} disabled={busy}
                        className={`rr-toggle${on ? ' is-on' : ''}`} onClick={() => (on ? setDeactivate(h) : setStatus(h, 'Active'))} />
                      <Badge kind="hospital" value={h.status} />
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      <Button kind="text" size="sm" icon={Pencil} onClick={() => setForm({ editing: h })}>Edit</Button>
                      <Button kind="text" size="sm" icon={ClipboardList} onClick={() => navigate(`/hospitals/${h.id}/cases`)}>View Cases</Button>
                      <Button kind="text" size="sm" icon={KeyRound} onClick={() => resetPassword(h)}>Reset Password</Button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {hospitals?.length === 0 && (
              <tr><td colSpan={6}><StateView icon={Hospital} title="No hospitals yet" body="Add the first hospital so bite reports have somewhere to go." action={<Button icon={Plus} onClick={() => setForm({ editing: null })}>Add Hospital</Button>} /></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {form && (
        <HospitalForm editing={form.editing} cityId={cities[0]?.id} onClose={() => setForm(null)}
          onSaved={(account, message) => {
            setForm(null)
            load()
            if (account) setCreds({ title: 'Hospital created', intro: 'Give these login details to the hospital staff.', login: account.email, password: account.tempPassword })
            else toast(message)
          }} />
      )}

      {deactivate && (
        <Dialog icon={PowerOff} tone="danger" alert title={`Deactivate ${deactivate.name}?`} onClose={() => setDeactivate(null)}
          actions={<>
            <Button kind="text" onClick={() => setDeactivate(null)}>Cancel</Button>
            <Button kind="danger" disabled={busy} onClick={() => setStatus(deactivate, 'Inactive')}>Deactivate</Button>
          </>}>
          <p style={{ margin: 0 }}>
            It will stop receiving new bite reports and its staff can no longer log in.{' '}
            {deactivate.openCases > 0
              ? <><strong style={{ fontWeight: 600 }}>{deactivate.openCases} open case{deactivate.openCases === 1 ? '' : 's'}</strong> will stay with this hospital — make sure those patients can still get their doses.</>
              : 'It has no open cases.'}
          </p>
        </Dialog>
      )}

      {creds && <CredentialsDialog {...creds} onClose={() => setCreds(null)} />}
    </div>
  )
}
