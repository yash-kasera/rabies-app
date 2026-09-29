import { useState, useEffect } from 'react'
import api from '../services/api'

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// The patient's spoken description of the bite. Loaded only when staff press play,
// with the session token (never a public link).
export default function VoiceNote({ reportId, seconds }) {
  const [url, setUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/reports/${reportId}/voice`, { responseType: 'blob' })
      setUrl(URL.createObjectURL(res.data))
    } catch {
      setError('Could not load the voice note')
    } finally {
      setLoading(false)
    }
  }

  if (url) return <audio src={url} controls autoPlay preload="auto" className="w-full max-w-sm h-10" aria-label="Patient's voice note" />
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={load} disabled={loading}
        className="text-sm text-primary dark:text-primary-dark font-medium hover:underline disabled:opacity-60">
        {loading ? 'Loading voice note…' : `🎤 Play voice note${seconds ? ` (${fmt(seconds)})` : ''}`}
      </button>
      {error && <span className="text-sm text-danger dark:text-danger-dark">{error}</span>}
    </div>
  )
}
