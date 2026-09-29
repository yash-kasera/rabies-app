import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import { Spinner } from './components/ui'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import Dashboard from './pages/Dashboard'
import CaseDetail from './pages/CaseDetail'
import ManageHospitals from './pages/ManageHospitals'
import HospitalCases from './pages/HospitalCases'
import NotifyUsers from './pages/NotifyUsers'
import StaffAccounts from './pages/StaffAccounts'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user || user.role !== 'government') return <Navigate to="/login" replace />
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />
  return children
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  return (
    <Routes>
      <Route path="/login" element={user?.role === 'government' ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/change-password" element={user ? <ChangePassword /> : <Navigate to="/login" replace />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="cases/:id" element={<CaseDetail />} />
        <Route path="hospitals" element={<ManageHospitals />} />
        <Route path="hospitals/:id/cases" element={<HospitalCases />} />
        <Route path="notifications" element={<NotifyUsers />} />
        <Route path="staff" element={<StaffAccounts />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
