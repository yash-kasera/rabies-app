import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export default function StaffAccounts() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [saving, setSaving] = useState(false)

  const loadStaff = useCallback(async () => {
    try {
      const res = await api.get('/government/staff')
      setStaff(res.data)
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { loadStaff() }, [loadStaff])

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/government/staff', form)
      setShowAdd(false)
      setForm({ fullName: '', email: '', password: '' })
      loadStaff()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create staff')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">Staff Accounts</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add Staff</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-alt dark:bg-surface-alt-dark text-text-secondary dark:text-text-secondary-dark">
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Email</th>
              <th className="text-left p-3 font-medium">Phone</th>
              <th className="text-left p-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.id} className="border-t border-border dark:border-border-dark">
                <td className="p-3 font-medium text-text-primary dark:text-text-primary-dark">{s.fullName}</td>
                <td className="p-3 text-text-secondary">{s.email}</td>
                <td className="p-3 text-text-secondary">{s.phoneNumber}</td>
                <td className="p-3 text-text-secondary">{new Date(s.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr><td colSpan="4" className="p-8 text-center text-text-secondary">No staff accounts yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-md bg-surface dark:bg-surface-dark rounded-xl p-6 m-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-text-primary dark:text-text-primary-dark mb-4">Add Staff Account</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <input type="text" placeholder="Full Name *" className="input-field" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} required />
              <input type="email" placeholder="Email *" className="input-field" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              <input type="password" placeholder="Password * (min 6 chars)" className="input-field" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 rounded-xl border border-border text-text-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Creating...' : 'Create Staff'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}