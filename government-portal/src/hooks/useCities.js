import { useState, useEffect } from 'react'
import api from '../services/api'

let cached = null

export default function useCities() {
  const [cities, setCities] = useState(cached || [])

  useEffect(() => {
    if (cached) return
    api.get('/cities')
      .then(res => { cached = res.data; setCities(res.data) })
      .catch(() => {})
  }, [])

  return cities
}
