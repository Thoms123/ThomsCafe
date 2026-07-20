import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Circle, Coffee, UtensilsCrossed } from 'lucide-react'
import api from '../../lib/axios'
import { useCartStore } from '../../store/cartStore'
import { useOrderStatusSocket } from '../../hooks/useOrderStatusSocket'
import { Skeleton } from '../../components/ui/Skeleton'
import PageFrame from '../../components/shared/PageFrame'

interface OrderItem {
  id: number
  menu_id: number
  menu_name: string
  qty: number
  price: number
  note: string
}

interface OrderData {
  id: number
  order_number: string
  table_number: string
  status: string
  total: number
  customer_name: string | null
  items: OrderItem[]
}

const ACCENT = '#e8491d'

const STEPS = [
  { key: 'pending', label: 'Pending' },
  { key: 'diproses', label: 'Diproses' },
  { key: 'ready', label: 'Siap' },
  { key: 'done', label: 'Selesai' },
]

// Backend flow (pending → confirmed → preparing → ready → done) collapses
// confirmed/preparing into a single "Diproses" step for the customer view.
function stepIndex(status: string) {
  switch (status) {
    case 'pending':
      return 0
    case 'confirmed':
    case 'preparing':
      return 1
    case 'ready':
      return 2
    case 'done':
      return 3
    default:
      return 0
  }
}

function fetchOrder(id: string) {
  return api.get<{ data: OrderData }>(`/public/orders/${id}`).then((r) => r.data.data)
}

function formatPrice(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

export default function OrderStatusPage() {
  const { id } = useParams<{ id: string }>()
  const tableToken = useCartStore((s) => s.token)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['order-status', id],
    queryFn: () => fetchOrder(id!),
    enabled: !!id,
    refetchInterval: 30000, // safety net — useOrderStatusSocket below is the primary update path
    retry: false,
  })

  useOrderStatusSocket(id)

  if (isLoading) {
    return (
      <PageFrame>
        <div className="pt-safe px-4">
          <Skeleton style={{ height: 100, borderRadius: 16, marginTop: 24 }} />
          <div className="flex flex-col gap-2 mt-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} style={{ height: 56, borderRadius: 12 }} />
            ))}
          </div>
        </div>
      </PageFrame>
    )
  }

  if (isError || !data) {
    return (
      <PageFrame>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
          <UtensilsCrossed size={48} style={{ color: ACCENT, opacity: 0.4 }} />
          <h1 className="text-xl font-black text-gray-900">Pesanan tidak ditemukan</h1>
        </div>
      </PageFrame>
    )
  }

  const current = stepIndex(data.status)

  return (
    <PageFrame>
      <div className="sticky top-0 z-10 px-4 pt-safe pb-4 flex items-center gap-3 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#fdece5' }}>
          <Coffee size={17} style={{ color: ACCENT }} />
        </div>
        <div>
          <p className="font-black text-sm leading-tight text-gray-900">ThomsCafe</p>
          <p className="text-xs text-gray-400">Status Pesanan</p>
        </div>
      </div>

      <div className="px-4 pt-6 pb-4">
        <div className="rounded-2xl p-5 text-center mb-6 bg-gray-50 border border-gray-100">
          <p className="text-xs uppercase tracking-widest text-gray-400">Nomor Pesanan</p>
          <p className="text-2xl font-black mt-1" style={{ color: ACCENT }}>#{data.order_number}</p>
          <p className="text-xs mt-1 text-gray-400">Meja {data.table_number}</p>
        </div>

        {/* Status stepper */}
        <div className="flex items-center justify-between mb-8 px-2 max-w-2xl mx-auto">
          {STEPS.map((step, idx) => (
            <div key={step.key} className={`flex items-center ${idx < STEPS.length - 1 ? 'flex-1' : ''}`}>
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0" style={{ width: 64 }}>
                {idx <= current ? (
                  <CheckCircle2 size={22} style={{ color: ACCENT }} />
                ) : (
                  <Circle size={22} className="text-gray-200" />
                )}
                <span className="text-[11px] font-bold text-center" style={{ color: idx <= current ? ACCENT : '#d1d5db' }}>
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-1" style={{ background: idx < current ? ACCENT : '#f3f4f6' }} />
              )}
            </div>
          ))}
        </div>

        {/* Items */}
        <p className="text-xs font-bold uppercase tracking-widest mb-3 text-gray-300">Detail Pesanan</p>
        <div className="flex flex-col gap-2 mb-4">
          {data.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
              <div>
                <p className="text-sm font-bold text-gray-900">{item.menu_name}</p>
                <p className="text-xs text-gray-400">{item.qty} x {formatPrice(item.price)}</p>
                {item.note && (
                  <p className="text-xs italic mt-0.5 text-gray-400">catatan: {item.note}</p>
                )}
              </div>
              <p className="text-sm font-black" style={{ color: ACCENT }}>{formatPrice(item.qty * item.price)}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-8" style={{ background: '#fdece5' }}>
          <span className="text-sm font-bold text-gray-900">Total</span>
          <span className="text-lg font-black" style={{ color: ACCENT }}>{formatPrice(data.total)}</span>
        </div>

        {tableToken && (
          <Link
            to={`/menu/${tableToken}`}
            className="block text-center py-3 rounded-2xl text-sm font-bold border-[1.5px]"
            style={{ borderColor: ACCENT, color: ACCENT }}
          >
            Kembali ke Menu
          </Link>
        )}
      </div>
    </PageFrame>
  )
}
