import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Hospital, Inbox, ClipboardList, CirclePlus, Users, Sun, Moon, LogOut, WifiOff, RefreshCw, Bell } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import api from '../services/api'
import { connectHospital, disconnect, reconnect, useSocketStatus, onNewReport, onReportAccepted, onReportRemoved } from '../services/socket'
import { fmtTime, statusLabel, useToast } from './ui'

/** Reports waiting in Incoming (nav + header badges) and the new-report sound setting. */
export const UnreadContext = createContext({ unread: 0, refresh: () => {}, sound: true, setSound: () => {} })

const SOUND_KEY = 'rr-hospital-sound'
const readSound = () => { try { return localStorage.getItem(SOUND_KEY) !== 'off' } catch { return true } }

/** Short two-tone chime (no audio file to download). Browsers may block it until the page is clicked once. */
function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    ;[[880, 0], [660, 0.18]].forEach(([f, t]) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.frequency.value = f
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t)
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.16)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + t)
      o.stop(ctx.currentTime + t + 0.18)
    })
    setTimeout(() => ctx.close(), 600)
  } catch { /* no audio available */ }
}
export const useUnread = () => useContext(UnreadContext)

function useWide() {
  const q = '(min-width: 1280px)'
  const [wide, setWide] = useState(() => window.matchMedia?.(q).matches ?? true)
  useEffect(() => {
    const m = window.matchMedia?.(q)
    if (!m) return
    const on = () => setWide(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return wide
}

export default function Layout() {
  const { logout, user, token, hospitalName } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const wide = useWide()
  const { connected, since } = useSocketStatus()
  const [unread, setUnread] = useState(0)
  const [sound, setSoundState] = useState(readSound)
  const toast = useToast()

  const setSound = (on) => {
    setSoundState(on)
    try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off') } catch { /* private mode */ }
  }

  const refresh = useCallback(() => {
    api.get('/hospital/incoming-reports').then(res => setUnread(res.data.length)).catch(() => {})
  }, [])
  useEffect(() => { refresh() }, [refresh])

  // New reports: badge, sound and a notice with a shortcut, on every page.
  useEffect(() => {
    const onNew = (r) => {
      refresh()
      if (readSound()) chime()
      toast(`New report: ${r.victimName} — ${statusLabel('severity', r.severity)}, ${r.animalType}`, { action: { label: 'View', onClick: () => navigate('/incoming') } })
    }
    const a = onNewReport(onNew), b = onReportAccepted(refresh), c = onReportRemoved(refresh)
    return () => { a(); b(); c() }
  }, [refresh, toast, navigate])

  // One live connection for the session; pages subscribe to events.
  useEffect(() => {
    if (!token) return
    connectHospital(token)
    return () => disconnect()
  }, [token])

  const NAV = [
    { to: '/incoming', label: 'Incoming Reports', icon: Inbox, badge: unread },
    { to: '/cases', label: 'My Cases', icon: ClipboardList },
    { to: '/register', label: 'Register New Bite', icon: CirclePlus },
    { to: '/staff', label: 'Staff', icon: Users },
  ]

  const sideBtn = (active) => ({
    position: 'relative', display: 'flex', alignItems: 'center', justifyContent: wide ? 'flex-start' : 'center', gap: 10, minHeight: 42,
    padding: '8px 12px', border: 0, borderRadius: 999, background: active ? 'var(--color-primary-container)' : 'transparent',
    color: active ? 'var(--color-on-primary-container)' : 'var(--color-text-secondary)', font: 'inherit', fontSize: 14,
    fontWeight: active ? 600 : 400, textDecoration: 'none', cursor: 'pointer',
  })
  const Count = ({ n, floating }) => (
    <span style={{
      ...(floating ? { position: 'absolute', top: 0, right: 2 } : {}),
      minWidth: 22, height: 22, padding: '0 6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999,
      background: 'var(--color-emergency)', color: 'var(--color-on-emergency)', fontSize: 12, lineHeight: '16px', fontWeight: 600, fontVariantNumeric: 'tabular-nums',
    }}>{n}</span>
  )

  return (
    <UnreadContext.Provider value={{ unread, refresh, sound, setSound }}>
      <div style={{ display: 'flex', height: '100vh', background: 'var(--color-background)' }}>
        <aside className="rr-noprint" style={{ flex: 'none', width: wide ? 240 : 68, display: 'flex', flexDirection: 'column', background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 64, padding: 12, borderBottom: '1px solid var(--color-border)' }}>
            <span aria-hidden style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 10, background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
              <Hospital size={22} />
            </span>
            {wide && (
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, lineHeight: '18px', fontWeight: 600 }}>Hospital Portal</div>
                <div style={{ fontSize: 12, lineHeight: '16px', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hospitalName}</div>
              </div>
            )}
          </div>
          <nav aria-label="Main" style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 8 }}>
            {NAV.map(({ to, label, icon: Icon, badge }) => {
              const active = pathname.startsWith(to)
              const aria = badge ? `${label}, ${badge} waiting` : label
              return (
                <NavLink key={to} to={to} aria-current={active ? 'page' : undefined} aria-label={aria} title={aria} style={sideBtn(active)}>
                  <Icon size={20} aria-hidden />
                  {wide && <span style={{ flex: 1 }}>{label}</span>}
                  {badge > 0 && <Count n={badge} floating={!wide} />}
                </NavLink>
              )
            })}
          </nav>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 2, padding: 8, borderTop: '1px solid var(--color-border)' }}>
            <button type="button" onClick={toggle} aria-label={dark ? 'Light mode' : 'Dark mode'} title={dark ? 'Light mode' : 'Dark mode'} style={sideBtn(false)}>
              {dark ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}{wide && <span>{dark ? 'Light mode' : 'Dark mode'}</span>}
            </button>
            <button type="button" onClick={() => { logout(); navigate('/login') }} aria-label="Log out" title="Log out" style={sideBtn(false)}>
              <LogOut size={20} aria-hidden />{wide && <span>Log out</span>}
            </button>
          </div>
        </aside>

        <div style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <header className="rr-noprint" style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, padding: '6px 12px 6px 20px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <strong style={{ fontWeight: 600 }}>{hospitalName}</strong>
              <span style={{ color: 'var(--color-text-secondary)' }}> · {user?.fullName}{user?.isAdmin ? ' (admin)' : ''}</span>
            </span>
            {connected ? (
              <span role="status" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-success)', whiteSpace: 'nowrap' }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--color-success)' }} /><strong style={{ fontWeight: 600 }}>Live</strong>
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-on-warning-container)', whiteSpace: 'nowrap' }}>
                <WifiOff size={16} aria-hidden /><strong style={{ fontWeight: 600 }}>Offline</strong>
              </span>
            )}
            <button type="button" onClick={() => navigate('/incoming')} aria-label={`${unread} reports waiting`} title={`${unread} reports waiting`}
              style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, border: 0, borderRadius: 999, background: 'transparent', color: 'var(--color-text-primary)', cursor: 'pointer' }}>
              <Bell size={22} aria-hidden />
              {unread > 0 && (
                <span style={{ position: 'absolute', top: 4, right: 2, minWidth: 20, height: 20, padding: '0 5px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, background: 'var(--color-emergency)', color: 'var(--color-on-emergency)', border: '2px solid var(--color-surface)', fontSize: 11, lineHeight: '14px', fontWeight: 600 }}>{unread}</span>
              )}
            </button>
          </header>
          {!connected && (
            <div role="alert" className="rr-noprint" style={{ flex: 'none', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 10px', padding: '8px 20px', background: 'var(--color-warning-container)', color: 'var(--color-on-warning-container)', borderBottom: '1px solid var(--color-warning-border)', fontSize: 13 }}>
              <WifiOff size={18} aria-hidden />
              <span style={{ flex: 1, minWidth: 240 }}><strong style={{ fontWeight: 600 }}>Live updates disconnected — reconnecting…</strong> New reports may not appear. Last update {fmtTime(since).slice(0, 5)}.</span>
              <button type="button" onClick={reconnect} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 36, padding: '0 14px', border: '1px solid var(--color-warning-border)', borderRadius: 999, background: 'var(--color-surface)', color: 'var(--color-on-warning-container)', font: 'inherit', fontWeight: 600, cursor: 'pointer' }}>
                <RefreshCw size={16} aria-hidden />Retry now
              </button>
            </div>
          )}
          <main style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 20 }}>
            <Outlet />
          </main>
        </div>
      </div>
    </UnreadContext.Provider>
  )
}
