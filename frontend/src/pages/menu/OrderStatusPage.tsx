import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Circle, Coffee, UtensilsCrossed } from 'lucide-react'
import api from '../../lib/axios'
import { useCartStore } from '../../store/cartStore'
import { useOrderStatusSocket } from '../../hooks/useOrderStatusSocket'
import { Skeleton } from '../../components/ui/Skeleton'

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
  table_number: string
  status: string
  total: number
  customer_name: string | null
  items: OrderItem[]
}

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
    const darkSkeleton: React.CSSProperties = {
      background: 'linear-gradient(90deg, rgba(0,200,255,0.05) 25%, rgba(0,200,255,0.14) 50%, rgba(0,200,255,0.05) 75%)',
      backgroundSize: '200% 100%',
    }
    return (
      <div className="min-h-screen pt-safe px-4" style={{ background: '#0f1e30' }}>
        <Skeleton style={{ ...darkSkeleton, height: 100, borderRadius: 16, marginTop: 24 }} />
        <div className="flex flex-col gap-2 mt-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={{ ...darkSkeleton, height: 56, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6" style={{ background: '#0f1e30' }}>
        <UtensilsCrossed size={48} style={{ color: '#00c8ff', opacity: 0.5 }} />
        <h1 className="text-xl font-black text-white">Pesanan tidak ditemukan</h1>
      </div>
    )
  }

  const current = stepIndex(data.status)

  return (
    <div className="min-h-screen" style={{ background: '#0f1e30' }}>
      <div
        className="sticky top-0 z-10 px-4 pt-safe pb-4 flex items-center gap-3"
        style={{ background: 'rgba(15,30,48,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,200,255,0.12)' }}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,200,255,0.1)', border: '1px solid rgba(0,200,255,0.25)' }}>
          <Coffee size={17} style={{ color: '#00c8ff' }} />
        </div>
        <div>
          <p className="font-black text-sm leading-tight text-white">ThomsCafe</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Status Pesanan</p>
        </div>
      </div>

      <div className="px-4 pt-6 pb-4">
        <div
          className="rounded-2xl p-5 text-center mb-6"
          style={{ background: 'rgba(22,40,64,0.8)', border: '1px solid rgba(0,200,255,0.1)' }}
        >
          <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>Nomor Pesanan</p>
          <p className="text-3xl font-black mt-1" style={{ color: '#00c8ff' }}>#{data.id}</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Meja {data.table_number}</p>
        </div>

        {/* Status stepper */}
        <div className="flex items-center justify-between mb-8 px-2 max-w-2xl mx-auto">
          {STEPS.map((step, idx) => (
            <div key={step.key} className={`flex items-center ${idx < STEPS.length - 1 ? 'flex-1' : ''}`}>
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0" style={{ width: 64 }}>
                {idx <= current ? (
                  <CheckCircle2 size={22} style={{ color: '#00c8ff' }} />
                ) : (
                  <Circle size={22} style={{ color: 'rgba(255,255,255,0.2)' }} />
                )}
                <span className="text-[11px] font-bold text-center" style={{ color: idx <= current ? '#00c8ff' : 'rgba(255,255,255,0.35)' }}>
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-1" style={{ background: idx < current ? '#00c8ff' : 'rgba(255,255,255,0.12)' }} />
              )}
            </div>
          ))}
        </div>

        {/* Items */}
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(0,200,255,0.7)' }}>Detail Pesanan</p>
        <div className="flex flex-col gap-2 mb-4">
          {data.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: 'rgba(22,40,64,0.6)', border: '1px solid rgba(0,200,255,0.08)' }}>
              <div>
                <p className="text-sm font-bold text-white">{item.menu_name}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{item.qty} x {formatPrice(item.price)}</p>
                {item.note && (
                  <p className="text-xs italic mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>catatan: {item.note}</p>
                )}
              </div>
              <p className="text-sm font-black" style={{ color: '#00c8ff' }}>{formatPrice(item.qty * item.price)}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-8" style={{ background: 'rgba(0,200,255,0.08)', border: '1px solid rgba(0,200,255,0.2)' }}>
          <span className="text-sm font-bold text-white">Total</span>
          <span className="text-lg font-black" style={{ color: '#00c8ff' }}>{formatPrice(data.total)}</span>
        </div>

        {tableToken && (
          <Link
            to={`/menu/${tableToken}`}
            className="block text-center py-3 rounded-2xl text-sm font-bold"
            style={{ background: 'rgba(0,200,255,0.1)', border: '1px solid rgba(0,200,255,0.25)', color: '#00c8ff' }}
          >
            Kembali ke Menu
          </Link>
        )}
      </div>
    </div>
  )
}
