import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleCheck, KeyRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { Button, Field, Notice } from '../components/ui'

const MIN = 8

export default function ChangePassword() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (next !== confirm) return setError('New passwords do not match')
    setSaving(true)
    try {
      await api.post('/auth/change-password', { currentPassword: current, newPassword: next })
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not change the password')
    } finally {
      setSaving(false)
    }
  }

  const again = () => { logout(); navigate('/login', { replace: true }) }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="rr-card rr-card--pad-lg" style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {done ? (
          <>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ flex: 'none', display: 'inline-flex', width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 999, background: 'var(--color-success-container)', color: 'var(--color-on-success-container)' }}><CircleCheck size={20} aria-hidden /></span>
              <div><h1 style={{ margin: 0, fontSize: 20, lineHeight: '28px', fontWeight: 600 }}>Password changed</h1><p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)' }}>Log in again with your new password.</p></div>
            </div>
            <Button block onClick={again}>Log in again</Button>
          </>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ flex: 'none', display: 'inline-flex', width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 999, background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)' }}><KeyRound size={20} aria-hidden /></span>
              <div>
                <h1 style={{ margin: 0, fontSize: 20, lineHeight: '28px', fontWeight: 600 }}>Set a new password</h1>
                <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)' }}>
                  {user?.mustChangePassword ? 'You are using a temporary password. Set your own to continue.' : 'Choose a new password for your account.'}
                </p>
              </div>
            </div>
            {error && <Notice>{error}</Notice>}
            <Field label="Current password" htmlFor="cp-cur">
              <input id="cp-cur" className="rr-input" type="password" autoComplete="current-password" required value={current} onChange={e => setCurrent(e.target.value)} />
            </Field>
            <Field label="New password" htmlFor="cp-new" hint={`At least ${MIN} characters`}>
              <input id="cp-new" className="rr-input" type="password" autoComplete="new-password" minLength={MIN} required value={next} onChange={e => setNext(e.target.value)} />
            </Field>
            <Field label="Confirm new password" htmlFor="cp-conf">
              <input id="cp-conf" className="rr-input" type="password" autoComplete="new-password" minLength={MIN} required value={confirm} onChange={e => setConfirm(e.target.value)} />
            </Field>
            <button type="submit" className="rr-btn rr-btn--primary rr-btn--block" disabled={saving}><span className="rr-btn__label">{saving ? 'Saving…' : 'Change password'}</span></button>
            <Button kind="text" style={{ alignSelf: 'center' }} onClick={again}>Log out</Button>
          </form>
        )}
      </div>
    </div>
  )
}
