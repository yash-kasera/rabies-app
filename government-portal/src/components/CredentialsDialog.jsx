import { useState } from 'react'
import { KeyRound, Copy, Check, TriangleAlert } from 'lucide-react'
import { Button, Dialog } from './ui'

/** Shows a login + temporary password once (there is no SMS/email delivery). */
export default function CredentialsDialog({ title, intro, login, password, onClose }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Login: ${login}\nTemporary password: ${password}`)
      setCopied(true)
    } catch { /* clipboard blocked: the values stay visible to copy by hand */ }
  }
  const box = { display: 'block', padding: '8px 10px', borderRadius: 8, background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', fontFamily: 'var(--font-mono)', fontSize: 15, userSelect: 'all', wordBreak: 'break-all' }
  return (
    <Dialog icon={KeyRound} tone="success" title={title} onClose={onClose} dismissable={false}
      actions={<>
        <Button kind="secondary" icon={copied ? Check : Copy} onClick={copy}>{copied ? 'Copied' : 'Copy login details'}</Button>
        <Button onClick={onClose}>Done</Button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {intro && <p style={{ margin: 0 }}>{intro}</p>}
        <div><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Login</div><code style={box}>{login}</code></div>
        <div><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Temporary password</div><code style={box}>{password}</code></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 8, background: 'var(--color-warning-container)', color: 'var(--color-on-warning-container)' }}>
          <TriangleAlert size={18} aria-hidden style={{ flex: 'none', marginTop: 1 }} />
          <span><strong style={{ fontWeight: 600 }}>This password is shown only once.</strong> Share it in person or by phone. They must set their own password at first login.</span>
        </div>
      </div>
    </Dialog>
  )
}
