import { useEffect, useState } from 'react'
import { Image as ImageIcon, ImageOff, Mic, Play, MessageSquareText } from 'lucide-react'
import api from '../services/api'
import { Button, Dialog, Skeleton } from './ui'

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/**
 * Loads a protected file (photo or voice note) with the session token and returns a
 * temporary object URL. The URL is created and revoked inside the same effect, so it
 * stays valid for as long as the component shows it.
 */
function useProtectedFile(path, enabled, attempt = 0) {
  const [state, setState] = useState({ url: null, failed: false })
  useEffect(() => {
    if (!enabled) return undefined
    let url = null
    let cancelled = false
    setState({ url: null, failed: false })
    api.get(path, { responseType: 'blob' })
      .then(res => {
        if (cancelled) return
        url = URL.createObjectURL(res.data)
        setState({ url, failed: false })
      })
      .catch(() => { if (!cancelled) setState({ url: null, failed: true }) })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [path, enabled, attempt])
  return state
}

export function WoundPhotoButton({ reportId, name }) {
  const [open, setOpen] = useState(false)
  const { url, failed } = useProtectedFile(`/reports/${reportId}/photo`, open)
  return (
    <>
      <Button kind="secondary" size="sm" icon={ImageIcon} onClick={() => setOpen(true)}>View wound photo</Button>
      {open && (
        <Dialog icon={ImageIcon} title={`Wound photo · ${name}`} onClose={() => setOpen(false)} maxWidth={760}
          actions={<Button onClick={() => setOpen(false)}>Close</Button>}>
          {failed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 24, justifyContent: 'center', color: 'var(--color-danger)' }}>
              <ImageOff size={20} aria-hidden />The photo could not be loaded. Check your connection and try again.
            </div>
          ) : url ? (
            <a href={url} target="_blank" rel="noreferrer" title="Open full size in a new tab">
              <img src={url} alt={`Wound photo sent by ${name}`} style={{ display: 'block', width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8, background: 'var(--color-surface-alt)' }} />
            </a>
          ) : <Skeleton h={320} />}
        </Dialog>
      )}
    </>
  )
}

export function VoiceNotePlayer({ reportId, seconds }) {
  const [attempt, setAttempt] = useState(0)
  const { url, failed } = useProtectedFile(`/reports/${reportId}/voice`, attempt > 0, attempt)
  const loading = attempt > 0 && !failed
  if (url) return <audio src={url} controls autoPlay preload="auto" style={{ width: '100%', maxWidth: 360, height: 40 }} aria-label="Patient’s voice note" />
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <Button kind="secondary" size="sm" icon={loading ? Mic : Play} disabled={loading} onClick={() => setAttempt(a => a + 1)}>
        {loading ? 'Loading voice note…' : `Play voice note${seconds ? ` (${mmss(seconds)})` : ''}`}
      </Button>
      {failed && <span style={{ fontSize: 13, color: 'var(--color-danger)' }}>Could not load the voice note. Try again.</span>}
    </div>
  )
}

/** The patient's own account of the bite: typed description, voice note and wound photo. */
export default function ReportMedia({ report, name, compact = false }) {
  if (!report) return null
  const hasVoice = report.voiceSeconds != null
  const hasAny = report.description || hasVoice || report.photoUrl
  if (!hasAny) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {report.description && (
        <p style={{ margin: 0, display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: compact ? 13 : 14, lineHeight: compact ? '18px' : '20px' }}>
          <MessageSquareText size={16} aria-hidden style={{ flex: 'none', marginTop: 2, color: 'var(--color-text-secondary)' }} />
          <span style={{ fontStyle: 'italic' }}>“{report.description}”</span>
        </p>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {report.photoUrl && <WoundPhotoButton reportId={report.id} name={name} />}
        {hasVoice && <VoiceNotePlayer reportId={report.id} seconds={report.voiceSeconds} />}
      </div>
    </div>
  )
}
