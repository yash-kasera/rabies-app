import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ManageHospitals from './pages/ManageHospitals'
import NotifyUsers from './pages/NotifyUsers'
import StaffAccounts from './pages/StaffAccounts'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
  if (!user || user.role !== 'government') return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
  return (
    <Routes>
      <Route path="/login" element={user?.role === 'government' ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="hospitals" element={<ManageHospitals />} />
        <Route path="notifications" element={<NotifyUsers />} />
        <Route path="staff" element={<StaffAccounts />} />
      </Route>
    </Routes>
  )
}