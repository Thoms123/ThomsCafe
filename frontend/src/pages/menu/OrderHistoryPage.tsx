import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ReceiptText, UtensilsCrossed } from 'lucide-react'
import api from '../../lib/axios'
import { PHONE_REGEX } from '../../lib/phone'
import { useCartStore } from '../../store/cartStore'
import PageFrame from '../../components/shared/PageFrame'

interface OrderItem {
  id: number
  menu_id: number
  menu_name: string
  qty: number
  price: number
}

interface OrderSummary {
  id: number
  order_number: string
  table_number: string
  status: string
  total: number
  customer_name: string | null
  created_at: string
  items: OrderItem[]
}

const ACCENT = '#e8491d'

function fetchOrdersByPhone(phone: string) {
  return api.get<{ data: OrderSummary[] }>('/public/orders', { params: { phone } }).then((r) => r.data.data)
}

function formatPrice(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}

function statusLabel(status: string): { label: string; color: string } {
  switch (status) {
    case 'pending':
      return { label: 'Pending', color: '#9ca3af' }
    case 'confirmed':
    case 'preparing':
      return { label: 'Diproses', color: ACCENT }
    case 'ready':
      return { label: 'Siap', color: ACCENT }
    case 'done':
      return { label: 'Selesai', color: '#16a34a' }
    default:
      return { label: status, color: '#9ca3af' }
  }
}

export default function OrderHistoryPage() {
  const navigate = useNavigate()
  const phone = useCartStore((s) => s.phone)
  const hasPhone = PHONE_REGEX.test(phone.trim())

  const { data: orders, isLoading, isError } = useQuery({
    queryKey: ['order-history', phone],
    queryFn: () => fetchOrdersByPhone(phone.trim()),
    enabled: hasPhone,
    retry: false,
  })

  return (
    <PageFrame>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-safe pb-3 flex items-center gap-3 bg-white/95 backdrop-blur border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 text-gray-500 flex-shrink-0">
          <ChevronLeft size={18} />
        </button>
        <div>
          <p className="font-black text-base leading-tight text-gray-900">Riwayat Pesanan</p>
          <p className="text-xs text-gray-400 mt-0.5">Semua pesananmu di ThomsCafe</p>
        </div>
      </div>

      {/* Results */}
      <div className="px-4 pt-4 pb-8">
        {!hasPhone ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <ReceiptText size={36} className="text-gray-200" />
            <p className="text-sm text-gray-400 text-center">Belum ada data pemesan. Pesan dulu lewat menu untuk melihat riwayat di sini.</p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <UtensilsCrossed size={36} className="text-gray-200" />
            <p className="text-sm text-gray-400">Gagal memuat riwayat. Coba lagi.</p>
          </div>
        ) : orders && orders.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <ReceiptText size={36} className="text-gray-200" />
            <p className="text-sm text-gray-400 text-center">Belum ada riwayat pesanan</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orders?.map((order) => {
              const status = statusLabel(order.status)
              const itemsLabel =
                order.items.length === 0
                  ? ''
                  : order.items.length === 1
                    ? order.items[0].menu_name
                    : `${order.items[0].menu_name} +${order.items.length - 1} lainnya`
              return (
                <Link
                  key={order.id}
                  to={`/order/${order.id}/status`}
                  className="block rounded-2xl border border-gray-100 px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-gray-900">Pesanan #{order.order_number}</p>
                    <span className="text-xs font-bold" style={{ color: status.color }}>{status.label}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.created_at)} · Meja {order.table_number}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-500 truncate pr-2">{itemsLabel}</p>
                    <p className="text-sm font-black flex-shrink-0" style={{ color: ACCENT }}>{formatPrice(order.total)}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </PageFrame>
  )
}
