import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import IncomingReports from './pages/IncomingReports'
import MyCases from './pages/MyCases'
import RegisterBite from './pages/RegisterBite'
import ChangePassword from './pages/ChangePassword'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
  if (!user || user.role !== 'hospital') return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
  return (
    <Routes>
      <Route path="/login" element={user?.role === 'hospital' ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/incoming" replace />} />
        <Route path="incoming" element={<IncomingReports />} />
        <Route path="cases" element={<MyCases />} />
        <Route path="register" element={<RegisterBite />} />
      </Route>
    </Routes>
  )
}