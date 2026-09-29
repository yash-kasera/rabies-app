import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleAlert, ShieldCheck, KeyRound, ArrowLeft, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button, Field } from '../components/ui'

const Alert = ({ tone, icon: Icon, children }) => (
  <div role="alert" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 12,
    background: `var(--color-${tone}-container)`, color: `var(--color-on-${tone}-container)`, border: `1px solid var(--color-${tone}-border)` }}>
    <Icon size={20} aria-hidden style={{ flex: 'none', marginTop: 1 }} /><span>{children}</span>
  </div>
)

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null) // 'invalid' | 'govOnly' | string
  const [loading, setLoading] = useState(false)
  const [forgot, setForgot] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { mustChangePassword } = await login(email, password)
      navigate(mustChangePassword ? '/change-password' : '/', { replace: true })
    } catch (err) {
      setError(err.code === 'GOV_ONLY' ? 'govOnly' : err.response?.status === 401 ? 'invalid' : (err.response?.data?.error || 'Could not reach the server. Check your connection.'))
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--color-background)' }}>
      <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span aria-hidden="true" style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, border: '1px dashed var(--color-border-strong)', borderRadius: 8, background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)', font: '9px/1.1 var(--font-mono)', textAlign: 'center' }}>DEPT<br />LOGO</span>
          <div>
            <div style={{ fontSize: 18, lineHeight: '24px', fontWeight: 600 }}>Government Portal</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Rabies Response System · Jabalpur</div>
          </div>
        </div>

        <div className="rr-card rr-card--pad-lg" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!forgot ? (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h1 style={{ margin: 0, fontSize: 22, lineHeight: '30px', fontWeight: 600 }}>Log in</h1>
              {error === 'invalid' && <Alert tone="danger" icon={CircleAlert}><strong className="font-semibold">Invalid credentials.</strong> Check your email and password and try again.</Alert>}
              {error === 'govOnly' && <Alert tone="warning" icon={ShieldCheck}><strong className="font-semibold">This portal is for government accounts only.</strong> Hospital staff should use the Hospital Portal.</Alert>}
              {error && error !== 'invalid' && error !== 'govOnly' && <Alert tone="danger" icon={CircleAlert}>{error}</Alert>}
              <Field label="Email" htmlFor="g-email">
                <input id="g-email" className="rr-input" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} />
              </Field>
              <Field label="Password" htmlFor="g-pw">
                <input id="g-pw" className="rr-input" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
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
                  <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)' }}>Ask another government administrator to reset it from <strong className="font-semibold">Staff Accounts</strong>. For security, government passwords cannot be reset from this page.</p>
                </div>
              </div>
              <Button kind="secondary" block icon={ArrowLeft} onClick={() => setForgot(false)}>Back to login</Button>
            </>
          )}
        </div>
        <p style={{ margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-secondary)' }}>
          <Lock size={16} aria-hidden />Government accounts only — no public signup
        </p>
      </div>
    </div>
  )
}
