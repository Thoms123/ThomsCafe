import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export function getWsBaseUrl(): string {
  const wsUrl = import.meta.env.VITE_WS_URL
  if (wsUrl) return wsUrl
  const apiUrl: string = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'
  return apiUrl.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '')
}

export default api
