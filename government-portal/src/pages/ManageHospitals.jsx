import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function LocationPicker({ lat, lng, onChange }) {
  useMapEvents({
    click(e) { onChange(e.latlng.lat, e.latlng.lng) },
  })
  return lat && lng ? <Marker position={[lat, lng]} /> : null
}

export default function ManageHospitals() {
  const [hospitals, setHospitals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', cityId: 1, address: '', latitude: 22.7196, longitude: 75.8577, contactNumber: '', contactEmail: '', staffEmail: '', staffPassword: '' })
  const [saving, setSaving] = useState(false)
  const [newCredentials, setNewCredentials] = useState(null)

  const loadHospitals = useCallback(async () => {
    try {
      const res = await api.get('/government/hospitals')
      setHospitals(res.data)
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { loadHospitals() }, [loadHospitals])

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', cityId: 1, address: '', latitude: 22.7196, longitude: 75.8577, contactNumber: '', contactEmail: '', staffEmail: '', staffPassword: '' })
    setNewCredentials(null)
    setShowModal(true)
  }

  const openEdit = (h) => {
    setEditing(h)
    setForm({ name: h.name, cityId: h.cityId, address: h.address, latitude: h.latitude, longitude: h.longitude, contactNumber: h.contactNumber, contactEmail: h.contactEmail || '' })
    setNewCredentials(null)
    setShowModal(true)
  }

  const handleGeocode = async () => {
    if (!form.address) return
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.address)}`)
      const data = await res.json()
      if (data.length > 0) {
        setForm(f => ({ ...f, latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) }))
      }
    } catch {}
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await api.patch(`/government/hospitals/${editing.id}`, form)
        setShowModal(false)
        loadHospitals()
      } else {
        const res = await api.post('/government/hospitals', form)
        setNewCredentials(res.data.staffAccount)
        loadHospitals()
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save')
    } finally { setSaving(false) }
  }

  const toggleStatus = async (h) => {
    const newStatus = h.status === 'Active' ? 'Inactive' : 'Active'
    await api.patch(`/government/hospitals/${h.id}`, { status: newStatus })
    loadHospitals()
  }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">Manage Hospitals</h1>
        <button onClick={openAdd} className="btn-primary">+ Add Hospital</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-alt dark:bg-surface-alt-dark text-text-secondary dark:text-text-secondary-dark">
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">City</th>
              <th className="text-left p-3 font-medium">Contact</th>
              <th className="text-left p-3 font-medium">Cases</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {hospitals.map(h => (
              <tr key={h.id} className="border-t border-border dark:border-border-dark">
                <td className="p-3 font-medium text-text-primary dark:text-text-primary-dark">{h.name}</td>
                <td className="p-3 text-text-secondary dark:text-text-secondary-dark">{h.city?.name}</td>
                <td className="p-3 text-text-secondary dark:text-text-secondary-dark">{h.contactNumber}</td>
                <td className="p-3">{h._count?.cases || 0}</td>
                <td className="p-3">
                  <button onClick={() => toggleStatus(h)}
                    className={`text-xs px-2 py-1 rounded-full font-medium border ${
                      h.status === 'Active'
                        ? 'bg-success/10 text-success border-success/30'
                        : 'bg-text-secondary/10 text-text-secondary border-text-secondary/30'
                    }`}>
                    {h.status}
                  </button>
                </td>
                <td className="p-3">
                  <button onClick={() => openEdit(h)} className="text-primary dark:text-primary-dark text-sm hover:underline mr-3">Edit</button>
                  <button onClick={() => window.open(`/hospital-cases/${h.id}`, '_blank')} className="text-primary dark:text-primary-dark text-sm hover:underline">View Cases</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-2xl bg-surface dark:bg-surface-dark rounded-xl p-6 m-4 max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-text-primary dark:text-text-primary-dark mb-4">
              {editing ? 'Edit Hospital' : 'Add Hospital'}
            </h2>
            {newCredentials && (
              <div className="bg-success/10 border border-success/30 rounded-lg p-4 mb-4">
                <p className="text-sm font-bold text-success dark:text-success-dark mb-1">Hospital Created!</p>
                <p className="text-xs text-text-secondary">Login credentials for hospital staff:</p>
                <p className="text-sm mt-1"><b>Email/ID:</b> {newCredentials.email}</p>
                <p className="text-sm"><b>Temp Password:</b> {newCredentials.tempPassword}</p>
                <p className="text-xs text-warning mt-1">Share these securely. Hospital must change password on first login.</p>
              </div>
            )}
            <form onSubmit={handleSave} className="space-y-3">
              <input type="text" placeholder="Hospital Name *" className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              <input type="text" placeholder="Address *" className="input-field" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} required />
              <button type="button" onClick={handleGeocode} className="text-xs text-primary dark:text-primary-dark mb-1">📍 Auto-geocode from address</button>
              <div className="flex gap-3">
                <input type="number" step="any" placeholder="Latitude" className="input-field" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: parseFloat(e.target.value) || 0 }))} />
                <input type="number" step="any" placeholder="Longitude" className="input-field" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="h-48 rounded-lg overflow-hidden">
                <MapContainer center={[form.latitude || 22.7196, form.longitude || 75.8577]} zoom={10} className="h-full w-full" zoomControl={true}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}{r}.png" />
                  <LocationPicker lat={form.latitude} lng={form.longitude} onChange={(lat, lng) => setForm(f => ({ ...f, latitude: lat, longitude: lng }))} />
                </MapContainer>
              </div>
              <p className="text-xs text-text-secondary">Click on the map to set the hospital location</p>
              <input type="text" placeholder="Contact Number *" className="input-field" value={form.contactNumber} onChange={e => setForm(f => ({ ...f, contactNumber: e.target.value }))} required />
              <input type="email" placeholder="Contact Email" className="input-field" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} />
              {!editing && (
                <div className="border-t border-border dark:border-border-dark pt-3">
                  <p className="text-xs font-medium text-text-secondary mb-2">Hospital Login Credentials</p>
                  <div className="flex gap-3">
                    <input type="email" placeholder="Login Email/ID (optional)" className="input-field" value={form.staffEmail} onChange={e => setForm(f => ({ ...f, staffEmail: e.target.value }))} />
                    <input type="text" placeholder="Temp Password (optional)" className="input-field" value={form.staffPassword} onChange={e => setForm(f => ({ ...f, staffPassword: e.target.value }))} />
                  </div>
                  <p className="text-xs text-text-secondary mt-1">Leave blank to auto-generate</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 rounded-xl border border-border dark:border-border-dark text-text-secondary dark:text-text-secondary-dark">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : editing ? 'Update' : 'Add Hospital'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}