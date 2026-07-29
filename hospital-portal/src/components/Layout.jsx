import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useState, useEffect } from 'react'
import { connectHospital, disconnect, onNewReport } from '../services/socket'
import { Inbox, ClipboardList, Plus, Sun, Moon, LogOut, Bell } from 'lucide-react'

const navItems = [
  { to: '/incoming', label: 'Incoming Reports', icon: Inbox },
  { to: '/cases', label: 'My Cases', icon: ClipboardList },
  { to: '/register', label: 'Register New Bite', icon: Plus },
]

export default function Layout() {
  const { logout, user, hospitalName } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [newCount, setNewCount] = useState(0)
  const [showToast, setShowToast] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  useEffect(() => {
    if (user?.hospitalId) {
      connectHospital(user.hospitalId)
      const cleanup = onNewReport((report) => {
        setNewCount(c => c + 1)
        setToastMsg(`New report: ${report.victimName}`)
        setShowToast(true)
        setTimeout(() => setShowToast(false), 4000)
      })
      return () => { cleanup(); disconnect() }
    }
  }, [user])

  return (
    <div className="flex h-screen relative">
      {showToast && (
        <div className="fixed top-4 right-4 z-50 bg-primary dark:bg-primary-dark text-white px-4 py-3 rounded-lg shadow-lg animate-slide-in">
          {toastMsg}
        </div>
      )}
      <aside className="w-64 bg-surface-alt dark:bg-surface-alt-dark border-r border-border dark:border-border-dark flex flex-col">
        <div className="p-4 border-b border-border dark:border-border-dark">
          <h1 className="text-lg font-bold text-primary dark:text-primary-dark">Hospital Portal</h1>
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">{hospitalName || 'Rabies Response System'}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => { if (item.to === '/incoming') setNewCount(0) }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-primary/10 text-primary dark:text-primary-dark'
                    : 'text-text-secondary dark:text-text-secondary-dark hover:bg-surface dark:hover:bg-surface-dark'
                }`
              }
            >
              <span className="relative">
                <item.icon size={18} />
                {item.to === '/incoming' && newCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-emergency text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {newCount}
                  </span>
                )}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border dark:border-border-dark space-y-2">
          <button onClick={toggle}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary dark:text-text-secondary-dark hover:bg-surface dark:hover:bg-surface-dark rounded-lg transition">
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button onClick={() => { logout(); navigate('/login') }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-danger dark:text-danger-dark hover:bg-danger/10 rounded-lg transition">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-bg dark:bg-bg-dark">
        <div className="sticky top-0 z-30 bg-bg/80 dark:bg-bg-dark/80 backdrop-blur-sm border-b border-border dark:border-border-dark px-6 py-3 flex items-center justify-between">
          <div className="text-sm">
            <span className="font-medium text-text-primary dark:text-text-primary-dark">{hospitalName || 'Hospital'}</span>
            <span className="text-text-secondary dark:text-text-secondary-dark ml-2">· {user?.fullName || ''}</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/incoming')}
              className="relative p-2 text-text-secondary dark:text-text-secondary-dark hover:text-primary dark:hover:text-primary-dark transition">
              <Bell size={18} />
              {newCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-emergency text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {newCount}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="p-6"><Outlet /></div>
      </main>
    </div>
  )
}