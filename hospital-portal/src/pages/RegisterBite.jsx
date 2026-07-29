import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function RegisterBite() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    patientName: '', contactNumber: '', address: '',
    incidentDatetime: new Date().toISOString().slice(0, 16),
    animalType: 'Dog', animalStatus: 'Unknown', severity: 'MinorScratch',
    treatmentNotes: '', handledBy: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/hospital/cases', form)
      navigate('/cases')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register case')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary dark:text-text-primary-dark mb-6">Register New Bite</h1>
      {error && <div className="bg-danger/10 text-danger dark:text-danger-dark p-3 rounded-lg text-sm mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark mb-3">Patient Info</h2>
          <div className="space-y-3">
            <input type="text" name="patientName" placeholder="Patient Name *" className="input-field" value={form.patientName} onChange={handleChange} required />
            <input type="text" name="contactNumber" placeholder="Contact Number *" className="input-field" value={form.contactNumber} onChange={handleChange} required />
            <input type="text" name="address" placeholder="Address" className="input-field" value={form.address} onChange={handleChange} />
          </div>
        </div>
        <div className="border-t border-border dark:border-border-dark pt-4">
          <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark mb-3">Incident Info</h2>
          <div className="space-y-3">
            <input type="datetime-local" name="incidentDatetime" className="input-field" value={form.incidentDatetime} onChange={handleChange} />
            <select name="animalType" className="input-field" value={form.animalType} onChange={handleChange}>
              <option value="Dog">Dog</option>
              <option value="Cat">Cat</option>
              <option value="Monkey">Monkey</option>
              <option value="Bat">Bat</option>
              <option value="Other">Other</option>
            </select>
            <select name="animalStatus" className="input-field" value={form.animalStatus} onChange={handleChange}>
              <option value="LookedHealthy">Looked Healthy</option>
              <option value="LookedSickOrAggressive">Looked Sick or Aggressive</option>
              <option value="Stray">Stray</option>
              <option value="OwnedAndVaccinated">Owned & Vaccinated</option>
              <option value="Unknown">Unknown</option>
            </select>
            <select name="severity" className="input-field" value={form.severity} onChange={handleChange}>
              <option value="MinorScratch">Minor Scratch</option>
              <option value="BleedingWound">Bleeding Wound</option>
              <option value="DeepWound">Deep Wound</option>
              <option value="MultipleBites">Multiple Bites</option>
            </select>
          </div>
        </div>
        <div className="border-t border-border dark:border-border-dark pt-4">
          <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark mb-3">Treatment Info</h2>
          <textarea name="treatmentNotes" placeholder="Treatment notes / vaccine given..." className="input-field h-24" value={form.treatmentNotes} onChange={handleChange} />
          <input type="text" name="handledBy" placeholder="Doctor/Staff handling case" className="input-field" value={form.handledBy} onChange={handleChange} />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Registering...' : 'Register Case'}
        </button>
      </form>
    </div>
  )
}