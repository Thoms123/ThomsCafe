import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Contact, Phone, ShoppingBag } from 'lucide-react'
import api from '../../../lib/axios'
import { Skeleton } from '../../../components/ui/Skeleton'

interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

interface CustomerReport {
  id: number
  name: string
  phone: string
  order_count: number
  total_spent: number
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

function fetchCustomers(month: string) {
  return api.get<ApiResponse<CustomerReport[]>>('/customers', { params: { month } }).then((r) => r.data.data)
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

const cardStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--card-shadow)',
}

const inputStyle: React.CSSProperties = {
  background: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  color: 'var(--text-primary)',
  borderRadius: 10,
  padding: '8px 12px',
  fontSize: 14,
  outline: 'none',
}

export default function CustomerPage() {
  const [month, setMonth] = useState(currentMonth())

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', month],
    queryFn: () => fetchCustomers(month),
  })

  const totalOrders = customers.reduce((sum, c) => sum + c.order_count, 0)
  const totalSpent = customers.reduce((sum, c) => sum + c.total_spent, 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Pelanggan</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Rekap pelanggan berdasarkan pesanan selesai per bulan
          </p>
        </div>
        <input
          type="month"
          style={inputStyle}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          max={currentMonth()}
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl p-5" style={cardStyle}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}>
            <Contact size={18} style={{ color: 'var(--accent-text)' }} />
          </div>
          <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{customers.length}</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>Pelanggan Aktif</p>
        </div>
        <div className="rounded-2xl p-5" style={cardStyle}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}>
            <ShoppingBag size={18} style={{ color: 'var(--accent-text)' }} />
          </div>
          <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{totalOrders}</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>Total Order</p>
        </div>
        <div className="rounded-2xl p-5" style={cardStyle}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}>
            <Phone size={18} style={{ color: 'var(--accent-text)' }} />
          </div>
          <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalSpent)}</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>Total Belanja</p>
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Daftar Pelanggan
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                <Skeleton style={{ width: 36, height: 36, borderRadius: 999 }} />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <Contact size={36} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada pelanggan bulan ini</p>
          </div>
        ) : (
          <ul>
            {customers.map((c, i) => (
              <li
                key={c.id}
                className="flex items-center gap-3 px-5 py-4"
                style={{ borderBottom: i < customers.length - 1 ? '1px solid var(--border)' : 'none' }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }}
                >
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.phone} · {c.order_count} order</p>
                </div>
                <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{formatCurrency(c.total_spent)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
