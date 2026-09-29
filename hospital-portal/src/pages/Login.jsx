import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleAlert, CircleSlash, ShieldCheck, KeyRound, ArrowLeft, Lock, Hospital } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button, Field } from '../components/ui'

const Alert = ({ tone, icon: Icon, children }) => (
  <div role="alert" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 12,
    background: `var(--color-${tone}-container)`, color: `var(--color-on-${tone}-container)`, border: `1px solid var(--color-${tone}-border)` }}>
    <Icon size={20} aria-hidden style={{ flex: 'none', marginTop: 1 }} /><span>{children}</span>
  </div>
)

export default function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null) // 'invalid' | 'inactive' | 'removed' | 'hospitalOnly' | string
  const [loading, setLoading] = useState(false)
  const [forgot, setForgot] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { mustChangePassword } = await login(identifier, password)
      navigate(mustChangePassword ? '/change-password' : '/', { replace: true })
    } catch (err) {
      const code = err.code || err.response?.data?.code
      setError(
        code === 'HOSPITAL_ONLY' ? 'hospitalOnly'
          : code === 'HOSPITAL_INACTIVE' ? 'inactive'
            : code === 'HOSPITAL_REMOVED' || code === 'ACCOUNT_REMOVED' ? 'removed'
              : err.response?.status === 401 ? 'invalid'
                : err.response?.data?.error || 'Could not reach the server. Check your connection.')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--color-background)' }}>
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span aria-hidden style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 12, background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
            <Hospital size={26} />
          </span>
          <div>
            <div style={{ fontSize: 18, lineHeight: '24px', fontWeight: 600 }}>Hospital Portal</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Rabies Response System · Jabalpur</div>
          </div>
        </div>

        <div className="rr-card rr-card--pad-lg" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!forgot ? (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h1 style={{ margin: 0, fontSize: 22, lineHeight: '30px', fontWeight: 600 }}>Log in</h1>
              {error === 'invalid' && <Alert tone="danger" icon={CircleAlert}><strong style={{ fontWeight: 600 }}>Invalid credentials.</strong> Check your username and password and try again.</Alert>}
              {error === 'inactive' && <Alert tone="danger" icon={CircleSlash}><strong style={{ fontWeight: 600 }}>This hospital has been deactivated.</strong> It no longer receives bite reports. Contact the District Health Office to reactivate it.</Alert>}
              {error === 'removed' && <Alert tone="danger" icon={CircleSlash}><strong style={{ fontWeight: 600 }}>This account has been removed.</strong> Ask your hospital admin or the District Health Office for access.</Alert>}
              {error === 'hospitalOnly' && <Alert tone="warning" icon={ShieldCheck}><strong style={{ fontWeight: 600 }}>This portal is for hospital accounts only.</strong> Government officers should use the Government Portal.</Alert>}
              {error && !['invalid', 'inactive', 'removed', 'hospitalOnly'].includes(error) && <Alert tone="danger" icon={CircleAlert}>{error}</Alert>}
              <Field label="Username or email" htmlFor="h-user">
                <input id="h-user" className="rr-input" autoComplete="username" required value={identifier} onChange={e => setIdentifier(e.target.value)} aria-invalid={error === 'invalid'} />
              </Field>
              <Field label="Password" htmlFor="h-pw">
                <input id="h-pw" className="rr-input" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} aria-invalid={error === 'invalid'} />
              </Field>
              <button type="submit" className="rr-btn rr-btn--primary rr-btn--block" disabled={loading}>
                <span className="rr-btn__label">{loading ? 'Logging in…' : 'Log in'}</span>
              </button>
              <Button kind="text" style={{ alignSelf: 'center' }} onClick={() => setForgot(true)}>Forgot password?</Button>
            </form>
          ) : (
            <>
              <div role="status" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 999, background: 'var(--color-info-container)', color: 'var(--color-on-info-container)' }}><KeyRound size={20} aria-hidden /></span>
                <div>
                  <h1 style={{ margin: 0, fontSize: 20, lineHeight: '28px', fontWeight: 600 }}>Forgot your password?</h1>
                  <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)' }}>
                    Staff: ask your <strong style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>hospital admin</strong> to reset it from <strong style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Staff</strong>.
                    Hospital admin: ask the government administrator to reset it from <strong style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Manage Hospitals</strong>.
                    You’ll get a temporary password and set a new one when you log in.
                  </p>
                </div>
              </div>
              <Button kind="secondary" block icon={ArrowLeft} onClick={() => setForgot(false)}>Back to login</Button>
            </>
          )}
        </div>
        <p style={{ margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
          <Lock size={16} aria-hidden />No sign-up — hospital accounts are created by the government
        </p>
      </div>
    </div>
  )
}
