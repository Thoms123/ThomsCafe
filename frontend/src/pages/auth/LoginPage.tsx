import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import api from '../../lib/axios'
import type { ApiResponse, User } from '../../types'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post<ApiResponse<{ token: string; user: User }>>('/auth/login', {
        email,
        password,
      })
      const { token, user } = res.data.data
      setAuth(user, token)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Login gagal, coba lagi'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — dark navy, sama di kedua mode */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center p-12 text-white"
        style={{ background: 'linear-gradient(150deg, #0d1b2e 0%, #0f2e4a 45%, #0a3d5e 100%)' }}
      >
        <div className="absolute" style={{ top: -60, right: -60, width: 320, height: 320, background: 'radial-gradient(circle, rgba(0,200,255,0.12) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div className="absolute" style={{ bottom: -40, left: -40, width: 280, height: 280, background: 'radial-gradient(circle, rgba(0,120,200,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />

        <div className="relative z-10 text-center">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6 text-4xl"
            style={{ background: 'rgba(0,200,255,0.12)', border: '1px solid rgba(0,200,255,0.3)', boxShadow: '0 0 30px rgba(0,200,255,0.15)' }}
          >
            ☕
          </div>
          <h1 className="text-5xl font-black tracking-tight mb-2" style={{ color: '#e0f7ff' }}>ThomsCafe</h1>
          <p className="text-lg font-medium" style={{ color: 'rgba(224,247,255,0.6)' }}>Point of Sale Dashboard</p>

          <div className="mt-10 flex flex-col gap-3 text-left max-w-xs mx-auto">
            {['Kelola menu & kategori', 'Monitor pesanan real-time', 'Laporan penjualan'].map((t) => (
              <div
                key={t}
                className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ background: 'rgba(0,200,255,0.07)', border: '1px solid rgba(0,200,255,0.15)' }}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#00c8ff', boxShadow: '0 0 6px #00c8ff' }} />
                <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — menggunakan CSS variable supaya responsive ke dark/light */}
      <div className="flex-1 flex items-center justify-center p-6" style={{ background: 'var(--bg-app)' }}>
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-black" style={{ background: '#0d1b2e', color: '#00c8ff' }}>☕</div>
            <span className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>ThomsCafe</span>
          </div>

          <div
            className="rounded-3xl p-8"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--accent-border)', boxShadow: '0 20px 60px rgba(0,100,180,0.15)' }}
          >
            <div className="mb-8">
              <h2 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Selamat datang! 👋</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Masuk ke dashboard ThomsCafe</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }} htmlFor="email">Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input
                    id="email"
                    type="email"
                    placeholder="owner@thomscafe.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{ background: 'var(--input-bg)', border: '1.5px solid var(--input-border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }} htmlFor="password">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{ background: 'var(--input-bg)', border: '1.5px solid var(--input-border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
                style={{ background: '#00c8ff', color: '#0d1b2e', boxShadow: '0 0 24px rgba(0,200,255,0.4), 0 4px 12px rgba(0,150,200,0.3)' }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <><span>Masuk</span><ArrowRight size={16} /></>}
              </button>
            </form>
          </div>

          <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
            ThomsCafe POS &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
