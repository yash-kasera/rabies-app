import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Loader, CircleAlert, Info, Droplets, TriangleAlert, Siren } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Field, Select, useToast } from '../components/ui'

const ANIMALS = ['Dog', 'Cat', 'Monkey', 'Bat', 'Other']
const CONDITIONS = [
  ['LookedHealthy', 'Looked healthy'], ['Stray', 'Stray'], ['LookedSickOrAggressive', 'Sick or aggressive'],
  ['OwnedAndVaccinated', 'Pet, vaccinated'], ['Unknown', 'Unknown / ran away'],
]
const SEVERITIES = [
  ['MinorScratch', 'Minor Scratch', 'neutral', Info, 'Skin grazed, no bleeding'],
  ['BleedingWound', 'Bleeding Wound', 'warning', Droplets, 'Skin broken, some bleeding'],
  ['DeepWound', 'Deep Wound', 'orange', TriangleAlert, 'Deep puncture or tear'],
  ['MultipleBites', 'Multiple Bites', 'danger-solid', Siren, 'Several bites, or head / neck / face'],
]
const pad = (n) => String(n).padStart(2, '0')
const localNow = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` }

function Chips({ label, id, options, value, onChange }) {
  return (
    <div className="rr-field">
      <span className="rr-label" id={id}>{label}</span>
      <div role="radiogroup" aria-labelledby={id} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map(([v, l]) => (
          <button key={v} type="button" className="rr-chip" role="radio" aria-checked={value === v} aria-pressed={value === v} onClick={() => onChange(v)}>{l}</button>
        ))}
      </div>
    </div>
  )
}

export default function RegisterBite() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const [f, setF] = useState({ patientName: '', contactNumber: '', address: '', when: localNow(), animalType: 'Dog', animalStatus: 'Stray', severity: 'BleedingWound', treatmentNotes: '', handledBy: '' })
  const [errors, setErrors] = useState(null)
  const [serverError, setServerError] = useState('')
  const [busy, setBusy] = useState(false)
  const [staff, setStaff] = useState([])
  const summaryRef = useRef(null)
  const set = (k) => (e) => setF(x => ({ ...x, [k]: e?.target ? e.target.value : e }))

  useEffect(() => {
    api.get('/hospital/staff').then(res => setStaff(res.data)).catch(() => {})
  }, [])
  useEffect(() => { if (user && !f.handledBy) setF(x => ({ ...x, handledBy: user.fullName })) }, [user]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (errors) summaryRef.current?.focus() }, [errors])

  const validate = () => {
    const e = {}
    if (!f.patientName.trim()) e.patientName = ['r-name', 'Patient name is required', 'Enter the patient’s name.']
    if (!/^[6-9]\d{9}$/.test(f.contactNumber.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, ''))) e.contactNumber = ['r-phone', 'Contact number must be 10 digits', 'Enter a 10-digit mobile number.']
    if (!f.when || new Date(f.when) > new Date(Date.now() + 60000)) e.when = ['r-when', 'Date & time cannot be in the future', `Cannot be in the future. Now is ${localNow().replace('T', ', ')}.`]
    return e
  }

  const submit = async (ev) => {
    ev.preventDefault()
    const e = validate()
    setServerError('')
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors(null)
    setBusy(true)
    try {
      await api.post('/hospital/cases', {
        patientName: f.patientName.trim(),
        contactNumber: f.contactNumber.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, ''),
        address: f.address.trim() || undefined,
        incidentDatetime: new Date(f.when).toISOString(),
        animalType: f.animalType, animalStatus: f.animalStatus, severity: f.severity,
        treatmentNotes: f.treatmentNotes.trim() || undefined,
        handledBy: f.handledBy || undefined,
      })
      toast(`Case registered for ${f.patientName.trim()}. Day 0 dose is scheduled.`, { action: { label: 'View', onClick: () => navigate('/cases') } })
      navigate('/cases')
    } catch (err) {
      setServerError(err.response?.data?.error || 'Could not register the case. Check your connection and try again.')
      setBusy(false)
    }
  }

  const err = (k) => errors?.[k]
  const ErrText = ({ k }) => err(k) ? <span className="rr-errortext"><CircleAlert size={16} aria-hidden />{err(k)[2]}</span> : null
  const legend = { float: 'left', width: '100%', padding: 0, margin: '0 0 2px', fontSize: 16, lineHeight: '24px', fontWeight: 600 }
  const card = { margin: 0, display: 'flex', flexDirection: 'column', gap: 12, border: '1px solid var(--color-border)' }

  return (
    <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 880 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, lineHeight: '30px', fontWeight: 600 }}>Register New Bite</h1>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>For walk-in patients. Fields marked * are required. Press Tab to move between fields.</div>
      </div>

      {errors && (
        <div ref={summaryRef} role="alert" tabIndex={-1} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12, background: 'var(--color-danger-container)', color: 'var(--color-on-danger-container)', border: '1px solid var(--color-danger-border)' }}>
          <CircleAlert size={20} aria-hidden style={{ flex: 'none', marginTop: 1 }} />
          <div>
            <strong style={{ fontWeight: 600 }}>Fix {Object.keys(errors).length} field{Object.keys(errors).length === 1 ? '' : 's'} to register this case.</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
              {Object.values(errors).map(([id, text]) => <li key={id}><a href={`#${id}`} style={{ color: 'inherit' }} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.focus() }}>{text}</a></li>)}
            </ul>
          </div>
        </div>
      )}
      {serverError && <div role="alert" style={{ padding: '10px 14px', borderRadius: 12, background: 'var(--color-danger-container)', color: 'var(--color-on-danger-container)', border: '1px solid var(--color-danger-border)' }}>{serverError}</div>}

      <fieldset className="rr-card" style={card}>
        <legend style={legend}>1 · Patient</legend>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div className="rr-field">
            <label className="rr-label" htmlFor="r-name">Patient name *</label>
            <input id="r-name" className="rr-input" autoComplete="off" value={f.patientName} onChange={set('patientName')} aria-invalid={!!err('patientName')} required />
            <ErrText k="patientName" />
          </div>
          <div className="rr-field">
            <label className="rr-label" htmlFor="r-phone">Contact number *</label>
            <input id="r-phone" className="rr-input" type="tel" inputMode="numeric" value={f.contactNumber} onChange={set('contactNumber')} aria-invalid={!!err('contactNumber')} required />
            {err('contactNumber') ? <ErrText k="contactNumber" /> : <span className="rr-hint">10-digit mobile, used to call about missed doses.</span>}
          </div>
        </div>
        <div className="rr-field">
          <label className="rr-label" htmlFor="r-addr">Address <span className="rr-label__opt">(optional)</span></label>
          <input id="r-addr" className="rr-input" value={f.address} onChange={set('address')} placeholder="House, street, area" />
        </div>
      </fieldset>

      <fieldset className="rr-card" style={{ ...card, gap: 14 }}>
        <legend style={legend}>2 · Incident</legend>
        <div className="rr-field" style={{ maxWidth: 300 }}>
          <label className="rr-label" htmlFor="r-when">Date &amp; time of bite</label>
          <input id="r-when" className="rr-input" type="datetime-local" max={localNow()} value={f.when} onChange={set('when')} aria-invalid={!!err('when')} />
          {err('when') ? <ErrText k="when" /> : <span className="rr-hint">Defaults to now. Change it if the bite happened earlier.</span>}
        </div>
        <Chips label="Animal type" id="r-an" options={ANIMALS.map(a => [a, a])} value={f.animalType} onChange={set('animalType')} />
        <Chips label="Animal condition" id="r-cd" options={CONDITIONS} value={f.animalStatus} onChange={set('animalStatus')} />
        <div className="rr-field">
          <span className="rr-label" id="r-sv">Severity</span>
          <div role="radiogroup" aria-labelledby="r-sv" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 }}>
            {SEVERITIES.map(([v, label, tone, Icon, desc]) => {
              const on = f.severity === v
              return (
                <button key={v} type="button" role="radio" aria-checked={on} onClick={() => set('severity')(v)} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, minHeight: 84, padding: '10px 12px', borderRadius: 12,
                  border: on ? '2px solid var(--color-primary)' : '1px solid var(--color-border-strong)', background: on ? 'var(--color-primary-container)' : 'var(--color-surface)',
                  color: 'var(--color-text-primary)', font: 'inherit', textAlign: 'left', cursor: 'pointer',
                }}>
                  <span className={`rr-badge rr-badge--${tone}`}><Icon size={14} aria-hidden /><span>{label}</span></span>
                  <span style={{ fontSize: 13, lineHeight: '18px', color: 'var(--color-text-secondary)' }}>{desc}</span>
                </button>
              )
            })}
          </div>
        </div>
      </fieldset>

      <fieldset className="rr-card" style={card}>
        <legend style={legend}>3 · Treatment</legend>
        <div className="rr-field">
          <label className="rr-label" htmlFor="r-notes">Treatment notes <span className="rr-label__opt">(optional)</span></label>
          <textarea id="r-notes" className="rr-input rr-textarea" style={{ minHeight: 88 }} placeholder="Wound washed, RIG given, Day 0 dose, allergies…" value={f.treatmentNotes} onChange={set('treatmentNotes')} />
        </div>
        <Field label="Doctor / staff handling the case" htmlFor="r-doc">
          <Select id="r-doc" value={f.handledBy} onChange={set('handledBy')}>
            {user && <option value={user.fullName}>{user.fullName} (you)</option>}
            {staff.filter(s => s.id !== user?.id).map(s => <option key={s.id} value={s.fullName}>{s.fullName}</option>)}
          </Select>
        </Field>
      </fieldset>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button type="submit" className={`rr-btn rr-btn--primary rr-btn--lg${busy ? ' is-loading' : ''}`} disabled={busy} aria-busy={busy}>
          {busy ? <Loader size={20} aria-hidden /> : <Check size={20} aria-hidden />}
          <span className="rr-btn__label">{busy ? 'Registering…' : 'Register Case'}</span>
        </button>
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Day 0 dose is scheduled for today. You can mark it given from My Cases.</span>
      </div>
    </form>
  )
}
