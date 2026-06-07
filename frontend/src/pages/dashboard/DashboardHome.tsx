import { ShoppingBag, UtensilsCrossed, TableProperties, TrendingUp } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

const stats = [
  { label: 'Total Pesanan', value: '—', icon: ShoppingBag },
  { label: 'Item Menu',     value: '—', icon: UtensilsCrossed },
  { label: 'Meja Aktif',   value: '—', icon: TableProperties },
  { label: 'Pendapatan',   value: '—', icon: TrendingUp },
]

export default function DashboardHome() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div
        className="rounded-3xl p-7 text-white relative overflow-hidden"
        style={{
          background: 'var(--hero-bg)',
          border: '1px solid rgba(0,200,255,0.2)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div
          className="absolute"
          style={{ top: -40, right: -40, width: 240, height: 240, background: 'radial-gradient(circle, rgba(0,200,255,0.12) 0%, transparent 70%)', borderRadius: '50%' }}
        />
        <div className="relative z-10">
          <p className="text-sm font-medium mb-1" style={{ color: 'rgba(224,247,255,0.65)' }}>
            Selamat datang kembali 👋
          </p>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: '#00c8ff' }}>
            {user?.name}
          </h1>
          <span
            className="inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full"
            style={{ background: 'rgba(0,200,255,0.15)', border: '1px solid rgba(0,200,255,0.3)', color: '#7de8ff' }}
          >
            {user?.role}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
          Ringkasan
        </h2>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <div
                key={s.label}
                className="rounded-2xl p-5 transition-all"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}
                >
                  <Icon size={18} style={{ color: 'var(--accent-text)' }} />
                </div>
                <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
                <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent activity */}
      <div
        className="rounded-2xl p-6 transition-all"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}
      >
        <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
          Aktivitas Terbaru
        </h2>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}
          >
            <ShoppingBag size={28} style={{ color: 'var(--accent-text)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            Belum ada data pesanan
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
            Data akan muncul saat ada transaksi
          </p>
        </div>
      </div>
    </div>
  )
}
