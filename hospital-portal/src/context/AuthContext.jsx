import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

// Returns the token's claims, or null if it is malformed or expired.
function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (payload.exp && payload.exp * 1000 < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

function userFromPayload(payload) {
  return {
    id: payload.id,
    role: payload.role,
    hospitalId: payload.hospitalId,
    fullName: payload.fullName || '',
    mustChangePassword: !!payload.mustChangePassword,
    // The hospital's admin account (created by the government) can manage staff.
    isAdmin: !!payload.isAdmin,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [hospitalName, setHospitalName] = useState(localStorage.getItem('hospitalName') || '')
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      const payload = decodeToken(token)
      if (payload) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        setUser(userFromPayload(payload))
      } else {
        localStorage.removeItem('token')
        localStorage.removeItem('hospitalName')
        setToken(null)
        setUser(null)
      }
    }
    setLoading(false)
  }, [token])

  /** Throws { code: 'HOSPITAL_ONLY' } for non-hospital accounts; returns { mustChangePassword }. */
  const login = async (identifier, password) => {
    const res = await api.post('/auth/login', { identifier, password })
    const { token: newToken, mustChangePassword, hospitalName: hospName, user: account } = res.data
    if (account?.role !== 'hospital') {
      const err = new Error('This portal is for hospital accounts only')
      err.code = 'HOSPITAL_ONLY'
      throw err
    }
    localStorage.setItem('token', newToken)
    if (hospName) localStorage.setItem('hospitalName', hospName)
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    setUser(userFromPayload(decodeToken(newToken)))
    setHospitalName(hospName || '')
    setToken(newToken)
    return { mustChangePassword: !!mustChangePassword }
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
