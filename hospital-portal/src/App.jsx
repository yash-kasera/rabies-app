import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import { Spinner } from './components/ui'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import IncomingReports from './pages/IncomingReports'
import MyCases from './pages/MyCases'
import RegisterBite from './pages/RegisterBite'
import Staff from './pages/Staff'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user || user.role !== 'hospital') return <Navigate to="/login" replace />
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />
  return children
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  return (
    <Routes>
      <Route path="/login" element={user?.role === 'hospital' && !user.mustChangePassword ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/change-password" element={user ? <ChangePassword /> : <Navigate to="/login" replace />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/incoming" replace />} />
        <Route path="incoming" element={<IncomingReports />} />
        <Route path="cases" element={<MyCases />} />
        <Route path="register" element={<RegisterBite />} />
        <Route path="staff" element={<Staff />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
