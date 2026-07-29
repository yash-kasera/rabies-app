import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [hospitalName, setHospitalName] = useState(localStorage.getItem('hospitalName') || '')
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUser({ id: payload.id, role: payload.role, hospitalId: payload.hospitalId, fullName: payload.fullName || '' })
      } catch {}
    }
    setLoading(false)
  }, [token])

  const login = async (identifier, password) => {
    const res = await api.post('/auth/login', { identifier, password })
    const { token: newToken, mustChangePassword, hospitalName: hospName } = res.data
    localStorage.setItem('token', newToken)
    if (hospName) localStorage.setItem('hospitalName', hospName)
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    const payload = JSON.parse(atob(newToken.split('.')[1]))
    setUser({ id: payload.id, role: payload.role, hospitalId: payload.hospitalId, fullName: payload.fullName || '' })
    setHospitalName(hospName || '')
    setToken(newToken)
    if (mustChangePassword) return { mustChangePassword: true }
    return {}
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('hospitalName')
    setToken(null)
    setUser(null)
    setHospitalName('')
    delete api.defaults.headers.common['Authorization']
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, hospitalName }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)