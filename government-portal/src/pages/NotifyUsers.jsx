import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export default function NotifyUsers() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', body: '', category: 'GeneralAwareness', targetType: 'all', targetCityId: '' })
  const [sending, setSending] = useState(false)
  const [confirm, setConfirm] = useState(false)

  const loadNotifications = useCallback(async () => {
    try {
      const res = await api.get('/government/notifications')
      setNotifications(res.data)
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { loadNotifications() }, [loadNotifications])

  const handleSend = async () => {
    setSending(true)
    try {
      await api.post('/government/notifications', form)
      setForm({ title: '', body: '', category: 'GeneralAwareness', targetType: 'all', targetCityId: '' })
      setConfirm(false)
      loadNotifications()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send')
    } finally { setSending(false) }
  }

  const categoryColors = {
    OutbreakAlert: 'bg-emergency/20 text-emergency dark:text-emergency-dark',
    GeneralAwareness: 'bg-primary/20 text-primary dark:text-primary-dark',
    NewHospital: 'bg-success/20 text-success dark:text-success-dark',
    MaintenanceNotice: 'bg-warning/20 text-warning dark:text-warning-dark',
  }

  const targetOptions = [
    { value: 'all', label: 'All Users' },
    { value: 'city', label: 'Specific City' },
  ]

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary dark:text-text-primary-dark mb-6">Notify Users</h1>

      <div className="card p-6 mb-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark">Send Notification</h2>
        <input type="text" placeholder="Title *" className="input-field" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        <textarea placeholder="Message body *" className="input-field h-24" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
        <div className="flex gap-3">
          <select className="input-field" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            <option value="GeneralAwareness">General Awareness</option>
            <option value="OutbreakAlert">Outbreak Alert</option>
            <option value="NewHospital">New Hospital</option>
            <option value="MaintenanceNotice">Maintenance Notice</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-text-secondary dark:text-text-secondary-dark block mb-2">Target Audience</label>
          <div className="flex rounded-xl border border-border dark:border-border-dark overflow-hidden">
            {targetOptions.map(o => (
              <button key={o.value} type="button"
                className={`flex-1 py-2 text-sm font-medium transition ${
                  form.targetType === o.value
                    ? 'bg-primary text-white'
                    : 'bg-surface dark:bg-surface-dark text-text-secondary dark:text-text-secondary-dark hover:bg-surface-alt dark:hover:bg-surface-alt-dark'
                }`}
                onClick={() => setForm(f => ({ ...f, targetType: o.value }))}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
        {form.targetType === 'city' && (
          <input type="number" placeholder="City ID" className="input-field" value={form.targetCityId} onChange={e => setForm(f => ({ ...f, targetCityId: e.target.value }))} />
        )}
        {!confirm ? (
          <button onClick={() => { if (form.title && form.body) setConfirm(true) }} className="btn-primary w-full">Review & Send</button>
        ) : (
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 space-y-3">
            <p className="text-sm font-bold text-warning dark:text-warning-dark">⚠ Confirm sending to all {form.targetType === 'all' ? 'users' : `users in city ${form.targetCityId}`}</p>
            <p className="text-xs text-text-secondary">{form.title}: {form.body.slice(0, 100)}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(false)} className="flex-1 px-4 py-2 rounded-xl border border-border text-text-secondary">Cancel</button>
              <button onClick={handleSend} disabled={sending} className="btn-primary flex-1">{sending ? 'Sending...' : 'Confirm Send'}</button>
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark mb-4">Notification History</h2>
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
        ) : notifications.length === 0 ? (
          <div className="card p-8 text-center text-text-secondary">No notifications sent yet</div>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => (
              <div key={n.id} className="card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[n.category] || ''}`}>
                    {n.category.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="text-xs text-text-secondary dark:text-text-secondary-dark">
                    {new Date(n.sentAt).toLocaleString()}
                  </span>
                  <span className="text-xs text-text-secondary dark:text-text-secondary-dark ml-auto">
                    Target: {n.targetType}
                  </span>
                </div>
                <p className="font-semibold text-text-primary dark:text-text-primary-dark">{n.title}</p>
                <p className="text-sm text-text-secondary dark:text-text-secondary-dark">{n.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}