import { useCallback, useEffect, useState } from 'react'
import { Send, MapPin, Users, Siren, Megaphone, Info, Bell, RefreshCw } from 'lucide-react'
import api from '../services/api'
import useCities from '../hooks/useCities'
import { Badge, Button, Dialog, Field, Notice, Segmented, Select, Skeleton, useToast, fmtDateTime, statusLabel, NOTICE_CATEGORIES } from '../components/ui'

const TITLE_MAX = 60
const BODY_MAX = 240
const Count = ({ n, max }) => <span className="rr-hint rr-tabular" style={{ alignSelf: 'flex-end', color: n > max ? 'var(--color-danger)' : undefined }}>{n} / {max}</span>

export default function NotifyUsers() {
  const toast = useToast()
  const cities = useCities()
  const city = cities[0]
  const [category, setCategory] = useState('GeneralAwareness')
  const [target, setTarget] = useState('city')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState(null)
  const [history, setHistory] = useState(null)
  const [historyError, setHistoryError] = useState(false)
  const [review, setReview] = useState(false)
  const [sending, setSending] = useState(false)

  const loadHistory = useCallback(() => {
    setHistoryError(false)
    api.get('/government/notifications').then(res => setHistory(res.data)).catch(() => setHistoryError(true))
  }, [])
  useEffect(() => { loadHistory() }, [loadHistory])
  useEffect(() => {
    if (!city) return
    api.get('/government/audience', { params: { cityId: city.id } }).then(res => setAudience(res.data)).catch(() => {})
  }, [city])

  const outbreak = category === 'OutbreakAlert'
  const targetName = target === 'city' ? `${city?.name || 'Jabalpur'} users` : 'all users'
  const reachN = audience ? (target === 'city' ? audience.city : audience.all) : null
  const reach = reachN == null ? 'Everyone in this group who opens the app' : `About ${reachN.toLocaleString('en-IN')} app user${reachN === 1 ? '' : 's'}`
  const valid = title.trim() && body.trim() && title.length <= TITLE_MAX && body.length <= BODY_MAX && (target === 'all' || city)

  const send = async () => {
    setSending(true)
    try {
      await api.post('/government/notifications', {
        title: title.trim(), body: body.trim(), category, targetType: target,
        ...(target === 'city' ? { targetCityId: city.id } : {}),
      })
      setReview(false)
      setTitle(''); setBody('')
      toast(`Notification sent to ${targetName}.`)
      loadHistory()
    } catch (err) {
      setReview(false)
      toast(err.response?.data?.error || 'The notification was not sent.', { error: true, action: { label: 'Try again', onClick: () => setReview(true) } })
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, alignItems: 'start' }}>
      <section className="rr-card rr-card--pad-lg" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, lineHeight: '28px', fontWeight: 600 }}>Send a notification</h1>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>Appears in the citizen app's Alerts tab the next time people open it.</p>
        </div>
        <Field label="Category" htmlFor="n-cat">
          <Select id="n-cat" value={category} onChange={e => setCategory(e.target.value)}>
            {NOTICE_CATEGORIES.map(c => <option key={c} value={c}>{statusLabel('notice', c)}</option>)}
          </Select>
        </Field>
        <div className="rr-field">
          <span className="rr-label">Send to</span>
          <Segmented label="Send to" value={target} onChange={setTarget}
            options={[{ value: 'city', label: `${city?.name || 'Jabalpur'} only`, icon: MapPin }, { value: 'all', label: 'All users', icon: Users }]} />
          <span className="rr-hint">{reach} {target === 'city' ? `registered in ${city?.name || 'Jabalpur'}.` : 'across every city.'}</span>
        </div>
        <Field label="Title" htmlFor="n-title" count={<Count n={title.length} max={TITLE_MAX} />}>
          <input id="n-title" className="rr-input" maxLength={TITLE_MAX} value={title} onChange={e => setTitle(e.target.value)} />
        </Field>
        <Field label="Message" htmlFor="n-body" count={<Count n={body.length} max={BODY_MAX} />}>
          <textarea id="n-body" className="rr-input" rows={4} maxLength={BODY_MAX} value={body} onChange={e => setBody(e.target.value)} style={{ resize: 'vertical', minHeight: 96 }} />
        </Field>
        {outbreak && (
          <Notice tone="warning" icon={Siren} title="Outbreak alerts are shown at the top of the Alerts tab.">
            There is no SMS or push delivery yet — people see it only when they open the app. Phone the ward offices for anything urgent.
          </Notice>
        )}
        <Button kind={outbreak ? 'emergency' : 'primary'} icon={Send} disabled={!valid} onClick={() => setReview(true)} style={{ alignSelf: 'flex-start' }}>Review and send</Button>
      </section>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <section className="rr-card" aria-label="Preview">
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Bell size={14} aria-hidden />Preview in the citizen app</div>
          <div style={{ maxWidth: 340, padding: 12, borderRadius: 16, border: `${outbreak ? 2 : 1}px solid ${outbreak ? 'var(--color-emergency)' : 'var(--color-border)'}`, background: 'var(--color-surface)' }}>
            <Badge kind="notice" value={category} />
            <div style={{ marginTop: 6, fontWeight: 600, wordBreak: 'break-word' }}>{title || <span style={{ color: 'var(--color-text-secondary)' }}>Title</span>}</div>
            <div style={{ marginTop: 2, fontSize: 14, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{body || <span style={{ color: 'var(--color-text-secondary)' }}>Your message appears here.</span>}</div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>Just now</div>
          </div>
        </section>

        <section className="rr-card">
          <h2 style={{ margin: '0 0 8px', fontSize: 16, lineHeight: '24px', fontWeight: 600 }}>Sent</h2>
          {historyError && <Notice title="Could not load sent notifications." action={<Button kind="secondary" size="sm" icon={RefreshCw} onClick={loadHistory}>Retry</Button>} />}
          {!history && !historyError && <div className="rr-skel-stack"><Skeleton /><Skeleton w="70%" /><Skeleton w="50%" /></div>}
          {history?.length === 0 && <p style={{ margin: 0, color: 'var(--color-text-secondary)', display: 'flex', gap: 6, alignItems: 'center' }}><Megaphone size={16} aria-hidden />No notifications sent yet.</p>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 520, overflowY: 'auto' }}>
            {history?.map(n => (
              <li key={n.id} style={{ padding: '10px 0', borderTop: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Badge kind="notice" value={n.category} />
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{fmtDateTime(n.sentAt)} · to {n.targetType === 'city' ? `${n.city?.name} users` : n.targetType === 'all' ? 'all users' : 'nearby users'}</span>
                </div>
                <div style={{ marginTop: 4, fontWeight: 600 }}>{n.title}</div>
                <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>{n.body}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {review && (
        <Dialog icon={outbreak ? Siren : Info} tone={outbreak ? 'emergency' : undefined} alert title={`Send to ${targetName}?`} onClose={() => setReview(false)}
          actions={<>
            <Button kind="text" onClick={() => setReview(false)}>Edit</Button>
            <Button kind={outbreak ? 'emergency' : 'primary'} icon={Send} disabled={sending} onClick={send}>{sending ? 'Sending…' : 'Send now'}</Button>
          </>}>
          <p style={{ margin: '0 0 10px' }}>{reach}. Sent notifications cannot be recalled.</p>
          <div style={{ padding: 10, borderRadius: 12, background: 'var(--color-surface-alt)' }}>
            <Badge kind="notice" value={category} />
            <div style={{ marginTop: 4, fontWeight: 600 }}>{title}</div>
            <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{body}</div>
          </div>
        </Dialog>
      )}
    </div>
  )
}
