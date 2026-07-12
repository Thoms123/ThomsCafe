import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShoppingBag, Clock, ChevronRight, RotateCcw } from 'lucide-react'
import type { AxiosError } from 'axios'
import api from '../../../lib/axios'
import { PermissionGate } from '../../../components/shared/PermissionGate'
import { useToast } from '../../../hooks/useToast'
import { Skeleton } from '../../../components/ui/Skeleton'

interface OrderItem {
  id: number
  menu_id: number
  menu_name: string
  qty: number
  price: number
}

interface Order {
  id: number
  table_id: number
  table_number: string
  status: string
  total: number
  customer_name: string | null
  created_at: string
  items: OrderItem[]
}

interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

const STATUSES = [
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Dikonfirmasi' },
  { key: 'preparing', label: 'Diproses' },
  { key: 'ready', label: 'Siap' },
  { key: 'done', label: 'Selesai' },
]

const NEXT_STATUS: Record<string, string | null> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'done',
  done: null,
}

function statusLabel(status: string) {
  return STATUSES.find((s) => s.key === status)?.label ?? status
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function formatPrice(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function fetchOrders(date: string | null) {
  const params = date ? { date } : {}
  return api.get<ApiResponse<Order[]>>('/orders', { params }).then((r) => r.data.data)
}

const cardStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--card-shadow)',
}

export default function OrderPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const [date, setDate] = useState<string>(todayStr())
  const [showAllDates, setShowAllDates] = useState(false)

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', showAllDates ? null : date],
    queryFn: () => fetchOrders(showAllDates ? null : date),
    refetchInterval: 30000, // safety net — WS-driven invalidation (useOrdersSocket) is the primary update path
  })

  const advanceMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['orders-pending-count'] })
      toast.success('Status pesanan berhasil diperbarui')
    },
    onError: (e: AxiosError<{ message: string }>) => {
      toast.error(e.response?.data?.message ?? 'Gagal memperbarui status pesanan')
    },
  })

  const grouped = STATUSES.map((s) => ({
    ...s,
    orders: orders.filter((o) => o.status === s.key).sort((a, b) => a.created_at.localeCompare(b.created_at)),
  }))

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Pesanan</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Kelola dan update status pesanan masuk
          </p>
        </div>

        {/* Date filter */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            disabled={showAllDates}
            onChange={(e) => setDate(e.target.value)}
            style={{
              background: 'var(--input-bg)', border: '1px solid var(--input-border)',
              color: 'var(--text-primary)', borderRadius: 10, padding: '8px 12px',
              fontSize: 13, outline: 'none', opacity: showAllDates ? 0.5 : 1,
            }}
          />
          <button
            onClick={() => setShowAllDates((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-2"
            style={
              showAllDates
                ? { background: 'var(--accent)', color: '#000', border: 'none' }
                : { background: 'var(--accent-dim)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }
            }
          >
            <RotateCcw size={13} /> Semua Tanggal
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {STATUSES.map((s) => (
            <div key={s.key} className="flex flex-col gap-3 flex-shrink-0" style={{ width: 280 }}>
              <Skeleton className="h-3" style={{ width: '50%' }} />
              <div className="rounded-2xl p-4 flex flex-col gap-3" style={cardStyle}>
                <Skeleton className="h-4" style={{ width: '60%' }} />
                <Skeleton className="h-3" style={{ width: '80%' }} />
                <Skeleton className="h-3" style={{ width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {grouped.map((col) => (
            <div key={col.key} className="flex flex-col gap-3 flex-shrink-0" style={{ width: 280 }}>
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  {col.label}
                </p>
                <span
                  className="text-xs font-black px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }}
                >
                  {col.orders.length}
                </span>
              </div>

              <div className="flex flex-col gap-3 min-h-[80px]">
                {col.orders.length === 0 ? (
                  <div className="flex flex-col items-center py-8 gap-2 rounded-2xl" style={cardStyle}>
                    <ShoppingBag size={22} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Kosong</p>
                  </div>
                ) : (
                  col.orders.map((order) => {
                    const next = NEXT_STATUS[order.status]
                    return (
                      <div key={order.id} className="rounded-2xl p-4 flex flex-col gap-3" style={cardStyle}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-black" style={{ color: 'var(--accent)' }}>
                              Meja {order.table_number}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {order.customer_name || 'Tanpa nama'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                            <Clock size={11} />
                            {formatTime(order.created_at)}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          {order.items.map((item) => (
                            <p key={item.id} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {item.qty}x {item.menu_name}
                            </p>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                          <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                            {formatPrice(order.total)}
                          </span>
                          <PermissionGate permission="order:update">
                            {next && (
                              <button
                                onClick={() => advanceMut.mutate({ id: order.id, status: next })}
                                disabled={advanceMut.isPending}
                                className="flex items-center gap-1 text-xs font-bold rounded-lg px-2.5 py-1.5"
                                style={{ background: 'var(--accent)', color: '#000', border: 'none' }}
                              >
                                {statusLabel(next)} <ChevronRight size={12} />
                              </button>
                            )}
                          </PermissionGate>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
