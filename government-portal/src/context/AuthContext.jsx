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
  return { id: payload.id, role: payload.role, fullName: payload.fullName || '', mustChangePassword: !!payload.mustChangePassword }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
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
        setToken(null)
        setUser(null)
      }
    }
    setLoading(false)
  }, [token])

  const login = async (identifier, password) => {
    const res = await api.post('/auth/login', { identifier, password })
    const { token: newToken, user: account } = res.data
    if (account?.role !== 'government') {
      throw { code: 'GOV_ONLY', response: { data: { error: 'This portal is for government accounts only' } } }
    }
    localStorage.setItem('token', newToken)
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    setUser(userFromPayload(decodeToken(newToken)))
    setToken(newToken)
    return { mustChangePassword: !!res.data.mustChangePassword }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    delete api.defaults.headers.common['Authorization']
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
