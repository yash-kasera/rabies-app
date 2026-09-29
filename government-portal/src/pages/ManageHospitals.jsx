import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Hospital, Pencil, ClipboardList, KeyRound, PowerOff, RefreshCw, Trash2, ExternalLink, MapPin } from 'lucide-react'
import api from '../services/api'
import useCities from '../hooks/useCities'
import { PinPicker } from '../components/TehsilMap'
import CredentialsDialog from '../components/CredentialsDialog'
import { Badge, Button, Dialog, Field, Notice, Skeleton, StateView, useToast, fmtPhone } from '../components/ui'

const EMPTY = { name: '', address: '', contactNumber: '', staffEmail: '', latitude: '', longitude: '' }

// Jabalpur district, roughly. Outside this box we warn (typo or wrong place), but still allow it.
const inDistrict = (lat, lng) => lat > 22.7 && lat < 23.9 && lng > 79.3 && lng < 80.7

/**
 * Reads coordinates from what people copy out of Google Maps: "23.1815, 79.9864",
 * "23.1815° N, 79.9864° E", or a maps link containing "@23.18,79.98" or "q=23.18,79.98".
 */
export function parseCoords(text) {
  const t = String(text || '').trim()
  const m = t.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)
    || t.match(/[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)
    || t.match(/^\(?\s*(-?\d+(?:\.\d+)?)\s*°?\s*([NS])?\s*[,\s]\s*(-?\d+(?:\.\d+)?)\s*°?\s*([EW])?\s*\)?$/i)
  if (!m) return null
  let lat, lng
  if (m.length === 5) {
    lat = +m[1] * (/s/i.test(m[2] || '') ? -1 : 1)
    lng = +m[3] * (/w/i.test(m[4] || '') ? -1 : 1)
  } else {
    lat = +m[1]; lng = +m[2]
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { latitude: +lat.toFixed(6), longitude: +lng.toFixed(6) }
}

const mapsSearchUrl = (form) => 'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent([form.name, form.address, /jabalpur/i.test(form.address) ? '' : 'Jabalpur'].filter(Boolean).join(', ') || 'hospitals in Jabalpur')

function HospitalForm({ editing, cityId, onClose, onSaved }) {
  const [form, setForm] = useState(editing
    ? { name: editing.name, address: editing.address, contactNumber: editing.contactNumber, staffEmail: editing.accounts?.[0]?.email || '', latitude: String(editing.latitude), longitude: String(editing.longitude) }
    : EMPTY)
  const [paste, setPaste] = useState('')
  const [pasteError, setPasteError] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const latitude = Number(form.latitude), longitude = Number(form.longitude)
    if (form.latitude === '' || form.longitude === '' || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      return setError('Enter the hospital’s location: paste coordinates from Google Maps, type them, or click the map.')
    }
    setSaving(true)
    try {
      const body = { name: form.name, address: form.address, contactNumber: form.contactNumber, latitude, longitude }
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
        <fieldset className="rr-field" style={{ margin: 0, padding: 0, border: 0, minWidth: 0 }}>
          <legend className="rr-label" style={{ padding: 0, marginBottom: 6 }}>Location</legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, borderRadius: 12, background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }}>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: '20px', color: 'var(--color-text-secondary)' }}>
              <li>
                <a href={mapsSearchUrl(form)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                  Find this hospital on Google Maps<ExternalLink size={14} aria-hidden />
                </a>
              </li>
              <li>Right-click (or long-press) the hospital’s pin. The first line of the menu is its coordinates — click it to copy.</li>
              <li>Paste below.</li>
            </ol>
            <Field label="Paste coordinates" htmlFor="h-paste" error={pasteError} hint="For example 23.1815, 79.9864 — a Google Maps link also works.">
              <input id="h-paste" className="rr-input rr-tabular" value={paste} placeholder="23.1815, 79.9864"
                onChange={e => {
                  const v = e.target.value
                  setPaste(v)
                  const c = parseCoords(v)
                  setPasteError(v.trim() && !c ? 'Couldn’t read coordinates from that. Copy them again from Google Maps.' : '')
                  if (c) setForm(f => ({ ...f, latitude: String(c.latitude), longitude: String(c.longitude) }))
                }} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Latitude" htmlFor="h-lat">
                <input id="h-lat" className="rr-input rr-tabular" inputMode="decimal" value={form.latitude} onChange={set('latitude')} placeholder="23.1815" />
              </Field>
              <Field label="Longitude" htmlFor="h-lng">
                <input id="h-lng" className="rr-input rr-tabular" inputMode="decimal" value={form.longitude} onChange={set('longitude')} placeholder="79.9864" />
              </Field>
            </div>
            {form.latitude !== '' && form.longitude !== '' && Number.isFinite(+form.latitude) && Number.isFinite(+form.longitude) && !inDistrict(+form.latitude, +form.longitude) && (
              <Notice tone="warning" icon={MapPin}>This point is outside Jabalpur district. Check the numbers (latitude first, then longitude).</Notice>
            )}
            <details>
              <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}>Check on the district map (or click to set it roughly)</summary>
              <div style={{ marginTop: 8 }}>
                <PinPicker lat={form.latitude === '' ? null : +form.latitude} lng={form.longitude === '' ? null : +form.longitude}
                  onPick={(latitude, longitude) => setForm(f => ({ ...f, latitude: String(latitude), longitude: String(longitude) }))} />
              </div>
            </details>
          </div>
        </fieldset>
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
  const [removing, setRemoving] = useState(null)
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
                      <Button kind="text" size="sm" icon={Trash2} style={{ color: 'var(--color-danger)' }} onClick={() => setRemoving(h)}>Delete</Button>
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

      {removing && <DeleteHospitalDialog hospital={removing} onClose={() => setRemoving(null)}
        onDeleted={(r) => {
          setRemoving(null)
          load()
          toast(`${removing.name} deleted.` + (r.reportsReturnedToWaiting ? ` ${r.reportsReturnedToWaiting} report${r.reportsReturnedToWaiting === 1 ? '' : 's'} went back to waiting for a hospital.` : ''))
        }} />}
      {creds && <CredentialsDialog {...creds} onClose={() => setCreds(null)} />}
    </div>
  )
}

function DeleteHospitalDialog({ hospital, onClose, onDeleted }) {
  const [confirm, setConfirm] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const matches = confirm.trim().toLowerCase() === hospital.name.trim().toLowerCase()
  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await api.delete(`/government/hospitals/${hospital.id}`, { data: { reason: reason.trim() } })
      onDeleted(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete the hospital.')
      setBusy(false)
    }
  }
  return (
    <Dialog icon={Trash2} tone="danger" alert title={`Delete ${hospital.name}?`} onClose={onClose} maxWidth={540}
      actions={<>
        <Button kind="text" onClick={onClose}>Cancel</Button>
        <Button kind="danger" icon={Trash2} disabled={!matches || busy} onClick={submit}>{busy ? 'Deleting…' : 'Delete hospital'}</Button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li>All of its logins (admin and staff) stop working immediately.</li>
          {hospital.openCases > 0
            ? <li><strong style={{ fontWeight: 600 }}>{hospital.openCases} open case{hospital.openCases === 1 ? '' : 's'}</strong> will be closed. Those bite reports go back to <em>waiting for a hospital</em> so another hospital can accept them.</li>
            : <li>It has no open cases.</li>}
          <li>Finished cases stay in the records. The deletion is recorded in the Activity Log.</li>
        </ul>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>To pause a hospital instead, turn off its status switch.</p>
        {error && <Notice>{error}</Notice>}
        <Field label="Reason (optional)" htmlFor="dh-reason"><input id="dh-reason" className="rr-input" maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></Field>
        <Field label={`Type the hospital name to confirm: ${hospital.name}`} htmlFor="dh-confirm">
          <input id="dh-confirm" className="rr-input" autoComplete="off" value={confirm} onChange={e => setConfirm(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  )
}
