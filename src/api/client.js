import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
  timeout: 15000,
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('oz_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('oz_token')
      localStorage.removeItem('oz_user')
      window.location.href = '/login'
    }
    // Normalise les erreurs texte brut en objet { error: "..." }
    const data = err.response?.data
    if (typeof data === 'string' && data.trim()) {
      err.response.data = { error: data.trim() }
    }
    return Promise.reject(err)
  }
)

export default client
