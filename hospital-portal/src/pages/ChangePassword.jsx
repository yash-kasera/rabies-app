import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const MIN_PASSWORD_LENGTH = 8

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword })
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const loginAgain = () => {
    logout()
    navigate('/login', { replace: true })
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg dark:bg-bg-dark p-4">
        <div className="w-full max-w-md card p-8 text-center">
          <p className="text-4xl mb-4">✅</p>
          <h1 className="text-xl font-bold text-text-primary dark:text-text-primary-dark mb-2">Password Changed</h1>
          <p className="text-text-secondary dark:text-text-secondary-dark mb-6">Log in again with your new password.</p>
          <button onClick={loginAgain} className="btn-primary w-full">
            Login Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg dark:bg-bg-dark p-4">
      <div className="w-full max-w-md card p-8">
        <h1 className="text-xl font-bold text-text-primary dark:text-text-primary-dark mb-2">Change Your Password</h1>
        <p className="text-sm text-text-secondary dark:text-text-secondary-dark mb-6">
          {user?.mustChangePassword
            ? 'You are using a temporary password. Set a new password to continue.'
            : 'Set a new password for your account.'}
        </p>
        {error && <div className="bg-danger/10 text-danger dark:text-danger-dark p-3 rounded-lg text-sm mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">Current Password</label>
            <input type="password" className="input-field" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">New Password</label>
            <input type="password" className="input-field" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={MIN_PASSWORD_LENGTH} />
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">At least {MIN_PASSWORD_LENGTH} characters</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">Confirm New Password</label>
            <input type="password" className="input-field" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={MIN_PASSWORD_LENGTH} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Saving...' : 'Change Password'}
          </button>
          <button type="button" onClick={loginAgain} className="text-xs text-text-secondary dark:text-text-secondary-dark hover:underline w-full text-center block">
            Log out
          </button>
        </form>
      </div>
    </div>
  )
}
