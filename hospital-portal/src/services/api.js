import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const isAuthCall = err.config?.url?.startsWith('/auth/')
    // Auth endpoints return 401 for a wrong password; let the form show that error.
    if (status === 401 && !isAuthCall) {
      localStorage.removeItem('token')
      localStorage.removeItem('hospitalName')
      window.location.href = '/login'
    } else if (status === 403 && err.response?.data?.code === 'MUST_CHANGE_PASSWORD') {
      window.location.href = '/change-password'
    }
    return Promise.reject(err)
  }
)

export default api
