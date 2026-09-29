import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Hospital, Megaphone, Users, Sun, Moon, LogOut, WifiOff, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { connectGovernment, disconnect, reconnect, onNewReport, onReportAccepted, useSocketStatus } from '../services/socket'
import { fmtTime } from './ui'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: ['/dashboard', '/cases'] },
  { to: '/hospitals', label: 'Manage Hospitals', icon: Hospital, match: ['/hospitals'] },
  { to: '/notifications', label: 'Notify Users', icon: Megaphone, match: ['/notifications'] },
  { to: '/staff', label: 'Staff Accounts', icon: Users, match: ['/staff'] },
]

const TITLES = [
  [/^\/cases\//, 'Case details'], [/^\/hospitals\/\d+/, 'Hospital Cases'], [/^\/hospitals/, 'Manage Hospitals'],
  [/^\/notifications/, 'Notify Users'], [/^\/staff/, 'Staff Accounts'], [/.*/, 'All Cases'],
]

function useWide() {
  const q = '(min-width: 1200px)'
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

const LogoSlot = ({ size }) => (
  <span aria-hidden="true" style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size,
    border: '1px dashed var(--color-border-strong)', borderRadius: 8, background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)',
    font: '8px/1.1 var(--font-mono)', textAlign: 'center' }}>DEPT<br />LOGO</span>
)

export default function Layout() {
  const { logout, user, token } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const wide = useWide()
  const { connected } = useSocketStatus()
  const [updated, setUpdated] = useState(new Date())

  // One live connection for the session; pages subscribe to events.
  useEffect(() => {
    if (!token) return
    connectGovernment(token)
    return () => disconnect()
  }, [token])

  useEffect(() => {
    const bump = () => setUpdated(new Date())
    const a = onNewReport(bump), b = onReportAccepted(bump)
    return () => { a(); b() }
  }, [])
  useEffect(() => { if (connected) setUpdated(new Date()) }, [connected])

  const title = TITLES.find(([re]) => re.test(pathname))[1]
  const sideBtn = (active) => ({
    display: 'flex', alignItems: 'center', justifyContent: wide ? 'flex-start' : 'center', gap: 10, minHeight: 40, padding: '8px 12px',
    border: 0, borderRadius: 999, background: active ? 'var(--color-primary-container)' : 'transparent',
    color: active ? 'var(--color-on-primary-container)' : 'var(--color-text-secondary)', font: 'inherit', fontSize: 14,
    fontWeight: active ? 600 : 400, textDecoration: 'none', cursor: 'pointer',
  })

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--color-background)' }}>
      <aside className="rr-noprint" style={{ flex: 'none', width: wide ? 240 : 64, display: 'flex', flexDirection: 'column', background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 64, padding: 12, borderBottom: '1px solid var(--color-border)' }}>
          <LogoSlot size={36} />
          {wide && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, lineHeight: '18px', fontWeight: 600 }}>Government Portal</div>
              <div style={{ fontSize: 12, lineHeight: '16px', color: 'var(--color-text-secondary)' }}>Rabies Response System</div>
            </div>
          )}
        </div>
        <nav aria-label="Main" style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 8 }}>
          {NAV.map(({ to, label, icon: Icon, match }) => {
            const active = match.some(m => pathname.startsWith(m))
            return (
              <NavLink key={to} to={to} aria-current={active ? 'page' : undefined} aria-label={label} title={label} style={sideBtn(active)}>
                <Icon size={20} aria-hidden />{wide && <span style={{ flex: 1 }}>{label}</span>}
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

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header className="rr-noprint" style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, minHeight: 52, padding: '6px 20px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
          <span style={{ flex: 1, minWidth: 0, fontWeight: 600 }}>{title}</span>
          {connected && (
            <span role="status" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-success)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--color-success)' }} />
              <strong style={{ fontWeight: 600 }}>Live</strong>
              <span style={{ color: 'var(--color-text-secondary)' }}>updated {fmtTime(updated)}</span>
            </span>
          )}
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Logged in as <strong style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{user?.fullName}</strong>
          </span>
        </header>
        {!connected && (
          <div role="alert" className="rr-noprint" style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px', background: 'var(--color-warning-container)', color: 'var(--color-on-warning-container)', borderBottom: '1px solid var(--color-warning-border)', fontSize: 13 }}>
            <WifiOff size={18} aria-hidden />
            <span style={{ flex: 1 }}><strong style={{ fontWeight: 600 }}>Connection lost — live updates paused.</strong> Showing data from {fmtTime(updated).slice(0, 5)}. Reconnecting automatically.</span>
            <button type="button" onClick={reconnect} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 32, padding: '0 12px', border: '1px solid var(--color-warning-border)', borderRadius: 999, background: 'var(--color-surface)', color: 'var(--color-on-warning-container)', font: 'inherit', fontWeight: 600, cursor: 'pointer' }}>
              <RefreshCw size={16} aria-hidden />Retry now
            </button>
          </div>
        )}
        <main style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 20 }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
