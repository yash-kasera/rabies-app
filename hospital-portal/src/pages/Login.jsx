import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const { login } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await login(identifier, password)
      navigate(result.mustChangePassword ? '/change-password' : '/', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg dark:bg-bg-dark p-4">
      <div className="w-full max-w-md card p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">
            {showForgot ? 'Forgot Password' : 'Hospital Login'}
          </h1>
          <button onClick={toggle} className="text-text-secondary dark:text-text-secondary-dark hover:text-primary dark:hover:text-primary-dark text-xl">
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
        {error && !showForgot && <div className="bg-danger/10 text-danger dark:text-danger-dark p-3 rounded-lg text-sm mb-4">{error}</div>}
        {!showForgot ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">Username or Email</label>
              <input type="text" className="input-field" value={identifier} onChange={e => setIdentifier(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">Password</label>
              <input type="password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : 'Login'}
            </button>
            <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-primary dark:text-primary-dark hover:underline w-full text-center block">
              Forgot Password?
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
              Hospital accounts are managed by the government health department. Ask your government
              administrator to reset your password from <b>Manage Hospitals</b>. You will receive a new
              temporary password and be asked to change it when you log in.
            </p>
            <button type="button" onClick={() => setShowForgot(false)} className="btn-primary w-full">
              Back to Login
            </button>
          </div>
        )}
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark text-center mt-4">
          No sign-up — hospital accounts created by the government
        </p>
      </div>
    </div>
  )
}
