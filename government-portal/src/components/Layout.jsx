import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { LayoutDashboard, Hospital, Send, Users, LogOut, Sun, Moon } from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/hospitals', label: 'Manage Hospitals', icon: Hospital },
  { to: '/notifications', label: 'Notify Users', icon: Send },
  { to: '/staff', label: 'Staff Accounts', icon: Users },
]

export default function Layout() {
  const { logout, user } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()

  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-surface-alt dark:bg-surface-alt-dark border-r border-border dark:border-border-dark flex flex-col">
        <div className="p-4 border-b border-border dark:border-border-dark">
          <h1 className="text-lg font-bold text-primary dark:text-primary-dark">Government Portal</h1>
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">Rabies Response System</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-primary/10 text-primary dark:text-primary-dark'
                    : 'text-text-secondary dark:text-text-secondary-dark hover:bg-surface dark:hover:bg-surface-dark'
                }`
              }
            >
              <item.icon size={18} />
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
          <span className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
            {user?.fullName ? `Logged in as ${user.fullName}` : 'Government Dashboard'}
          </span>
          <button onClick={toggle} className="text-text-secondary dark:text-text-secondary-dark hover:text-primary dark:hover:text-primary-dark">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        <div className="p-6"><Outlet /></div>
      </main>
    </div>
  )
}