import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import api from '../services/api'

export default function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMsg, setForgotMsg] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const { login } = useAuth()
  const { dark, toggle } = useTheme()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(identifier, password)
      window.location.href = '/'
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
      setLoading(false)
    }
  }

  const handleForgot = async (e) => {
    e.preventDefault()
    setForgotError('')
    setForgotMsg('')
    setForgotLoading(true)
    try {
      await api.post('/auth/forgot-password', { identifier: forgotEmail })
      setForgotMsg('If an account exists, a reset token has been generated.')
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Request failed')
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg dark:bg-bg-dark p-4">
      <div className="w-full max-w-md card p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">
            {showForgot ? 'Forgot Password' : 'Government Login'}
          </h1>
          <button onClick={toggle} className="text-text-secondary dark:text-text-secondary-dark text-xl">{dark ? '\u2600\ufe0f' : '\ud83c\udf19'}</button>
        </div>
        {error && !showForgot && <div className="bg-danger/10 text-danger dark:text-danger-dark p-3 rounded-lg text-sm mb-4">{error}</div>}
        {!showForgot ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">Email</label>
              <input type="text" className="input-field" value={identifier} onChange={e => setIdentifier(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">Password</label>
              <input type="password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : 'Login'}
            </button>
            <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-primary dark:text-primary-dark hover:underline w-full text-center block mt-2">
              Forgot Password?
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgot} className="space-y-4">
            {forgotMsg && <div className="bg-success/10 text-success dark:text-success-dark p-3 rounded-lg text-sm mb-2">{forgotMsg}</div>}
            {forgotError && <div className="bg-danger/10 text-danger dark:text-danger-dark p-3 rounded-lg text-sm mb-2">{forgotError}</div>}
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">Email or Phone</label>
              <input type="text" className="input-field" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required placeholder="Enter your email or phone" />
            </div>
            <button type="submit" disabled={forgotLoading} className="btn-primary w-full">
              {forgotLoading ? 'Sending...' : 'Send Reset Token'}
            </button>
            <button type="button" onClick={() => { setShowForgot(false); setForgotMsg(''); setForgotError('') }} className="text-xs text-text-secondary dark:text-text-secondary-dark hover:underline w-full text-center block">
              Back to Login
            </button>
          </form>
        )}
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark text-center mt-4">
          Government accounts only — no public signup
        </p>
      </div>
    </div>
  )
}
