import { useCallback, useEffect, useState } from 'react'
import { UserPlus, KeyRound, RefreshCw, Users, UserX, ShieldCheck } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import CredentialsDialog from '../components/CredentialsDialog'
import { Button, Dialog, Field, Notice, Skeleton, StateView, useToast, fmtDate, fmtPhone } from '../components/ui'

const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')

function AddStaff({ onClose, onCreated }) {
  const [form, setForm] = useState({ fullName: '', email: '', phoneNumber: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.fullName.trim()) errs.fullName = 'Enter the staff member’s full name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Enter a valid email address.'
    if (form.phoneNumber && !/^\+?[\d\s-]{10,17}$/.test(form.phoneNumber.trim())) errs.phoneNumber = 'Enter a 10-digit mobile number.'
    setErrors(errs)
    setServerError('')
    if (Object.keys(errs).length) return
    setSaving(true)
    try {
      const res = await api.post('/hospital/staff', { fullName: form.fullName.trim(), email: form.email.trim(), phoneNumber: form.phoneNumber.trim() || undefined })
      onCreated(res.data)
    } catch (err) {
      setServerError(err.response?.data?.error || 'Could not create the account.')
      setSaving(false)
    }
  }

  return (
    <Dialog icon={UserPlus} title="Add staff" onClose={onClose} maxWidth={520}>
      <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {serverError && <Notice>{serverError}</Notice>}
        <Field label="Full name" htmlFor="s-name" error={errors.fullName}>
          <input id="s-name" className="rr-input" autoComplete="off" value={form.fullName} onChange={set('fullName')} aria-invalid={!!errors.fullName} />
        </Field>
        <Field label="Email (login)" htmlFor="s-email" error={errors.email} hint="They log in to the Hospital Portal with this.">
          <input id="s-email" className="rr-input" type="email" autoComplete="off" value={form.email} onChange={set('email')} aria-invalid={!!errors.email} />
        </Field>
        <Field label="Mobile number (optional)" htmlFor="s-phone" error={errors.phoneNumber}>
          <input id="s-phone" className="rr-input" type="tel" inputMode="tel" value={form.phoneNumber} onChange={set('phoneNumber')} aria-invalid={!!errors.phoneNumber} />
        </Field>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>
          Staff can see incoming reports, accept them and treat cases. They cannot add other staff.
          A temporary password is shown once after creating the account; they set their own at first login.
        </p>
        <div className="rr-dialog__actions" style={{ padding: 0 }}>
          <Button kind="text" onClick={onClose}>Cancel</Button>
          <button type="submit" className="rr-btn rr-btn--primary" disabled={saving}><span className="rr-btn__label">{saving ? 'Creating…' : 'Create account'}</span></button>
        </div>
      </form>
    </Dialog>
  )
}

export default function Staff() {
  const { user } = useAuth()
  const toast = useToast()
  const [staff, setStaff] = useState(null)
  const [error, setError] = useState(false)
  const [adding, setAdding] = useState(false)
  const [creds, setCreds] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [busy, setBusy] = useState(false)
  const admin = !!user?.isAdmin

  const load = useCallback(() => {
    setError(false)
    api.get('/hospital/staff').then(res => setStaff(res.data)).catch(() => setError(true))
  }, [])
  useEffect(() => { load() }, [load])

  const reset = async (s) => {
    try {
      const res = await api.post(`/hospital/staff/${s.id}/reset-password`)
      setCreds({ title: 'Password reset', intro: `New temporary password for ${s.fullName}.`, login: res.data.email, password: res.data.tempPassword })
      load()
    } catch (err) {
      toast(err.response?.data?.error || 'Could not reset the password.', { error: true })
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await api.delete(`/hospital/staff/${removing.id}`)
      toast(`${removing.fullName} removed. Their login no longer works.`)
      setRemoving(null)
      load()
    } catch (err) {
      toast(err.response?.data?.error || 'Could not remove the account.', { error: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 22, lineHeight: '30px', fontWeight: 600 }}>Staff</h1>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
            People who can use this hospital’s portal{staff ? ` · ${staff.length} account${staff.length === 1 ? '' : 's'}` : ''}
            {!admin && ' · only your hospital admin can add or remove staff'}
          </p>
        </div>
        {admin && <Button icon={UserPlus} onClick={() => setAdding(true)}>Add staff</Button>}
      </div>

      {error && <Notice title="Could not load staff accounts." action={<Button kind="secondary" size="sm" icon={RefreshCw} onClick={load}>Retry</Button>}>Check your connection.</Notice>}

      <div className="rr-table-wrap">
        <table className="rr-table">
          <thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Phone</th><th scope="col">Added</th>{admin && <th scope="col"><span className="sr-only">Actions</span></th>}</tr></thead>
          <tbody>
            {!staff && !error && [1, 2].map(i => <tr key={i}>{[60, 70, 40, 40].map((w, j) => <td key={j}><Skeleton w={`${w}%`} /></td>)}{admin && <td><Skeleton w="50%" /></td>}</tr>)}
            {staff?.map(s => {
              const me = s.id === user?.id
              return (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span aria-hidden style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 999, background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)', fontSize: 12, fontWeight: 600 }}>{initials(s.fullName)}</span>
                      <span style={{ fontWeight: 600 }}>{s.fullName}</span>
                      {s.isAdmin && <span className="rr-badge rr-badge--info"><ShieldCheck size={14} aria-hidden /><span>Hospital admin</span></span>}
                      {me && <span className="rr-badge rr-badge--primary">You</span>}
                      {s.mustChangePassword && !me && <span className="rr-badge rr-badge--warning">Temporary password</span>}
                    </div>
                  </td>
                  <td>{s.email || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtPhone(s.phoneNumber)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(s.createdAt)}</td>
                  {admin && (
                    <td>
                      {!me && !s.isAdmin && (
                        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          <Button kind="text" size="sm" icon={KeyRound} onClick={() => reset(s)}>Reset Password</Button>
                          <Button kind="text" size="sm" icon={UserX} style={{ color: 'var(--color-danger)' }} onClick={() => setRemoving(s)}>Remove</Button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
            {staff?.length === 0 && <tr><td colSpan={admin ? 5 : 4}><StateView icon={Users} title="No staff accounts" /></td></tr>}
          </tbody>
        </table>
      </div>

      {adding && <AddStaff onClose={() => setAdding(false)} onCreated={(s) => {
        setAdding(false)
        load()
        setCreds({ title: 'Account created', intro: `${s.fullName} can now log in to the Hospital Portal.`, login: s.email, password: s.tempPassword })
      }} />}
      {creds && <CredentialsDialog {...creds} onClose={() => setCreds(null)} />}
      {removing && (
        <Dialog icon={UserX} tone="danger" alert title={`Remove ${removing.fullName}?`} onClose={() => setRemoving(null)}
          actions={<>
            <Button kind="text" onClick={() => setRemoving(null)}>Cancel</Button>
            <Button kind="danger" icon={UserX} disabled={busy} onClick={remove}>{busy ? 'Removing…' : 'Remove'}</Button>
          </>}>
          <p style={{ margin: 0 }}>Their login stops working immediately. Cases they worked on are not affected. This is recorded in the government’s Activity Log.</p>
        </Dialog>
      )}
    </div>
  )
}
