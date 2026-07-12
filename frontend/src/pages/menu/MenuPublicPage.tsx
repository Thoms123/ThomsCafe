import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { UtensilsCrossed, Coffee, ShoppingBag, Minus, Plus, X } from 'lucide-react'
import { motion, useDragControls } from 'framer-motion'
import api from '../../lib/axios'
import { useCartStore } from '../../store/cartStore'
import { Skeleton } from '../../components/ui/Skeleton'

interface MenuItemPublic {
  id: number
  name: string
  price: number
  image: string
  category: string
  category_id: number
  is_available: boolean
}

interface PublicData {
  table: { id: number; table_number: string }
  menus: MenuItemPublic[]
}

interface CreateOrderResponse {
  id: number
}

function fetchPublicMenu(token: string) {
  return api.get<{ data: PublicData }>(`/public/menu/${token}`).then((r) => r.data.data)
}

function createOrder(token: string, customerName: string, items: { menu_id: number; qty: number }[]) {
  return api
    .post<{ data: CreateOrderResponse }>('/public/orders', {
      token,
      customer_name: customerName,
      items,
    })
    .then((r) => r.data.data)
}

function formatPrice(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function groupByCategory(menus: MenuItemPublic[]) {
  return menus.reduce<Record<string, MenuItemPublic[]>>((acc, m) => {
    if (!acc[m.category]) acc[m.category] = []
    acc[m.category].push(m)
    return acc
  }, {})
}

export default function MenuPublicPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [cartOpen, setCartOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')

  const cart = useCartStore()
  const dragControls = useDragControls()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-menu', token],
    queryFn: () => fetchPublicMenu(token!),
    enabled: !!token,
    retry: false,
  })

  useEffect(() => {
    if (token) cart.setTable(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const orderMutation = useMutation({
    mutationFn: () => createOrder(token!, customerName.trim(), cart.items.map((i) => ({ menu_id: i.menuId, qty: i.qty }))),
    onSuccess: (order) => {
      cart.clear()
      navigate(`/order/${order.id}/status`)
    },
  })

  if (isLoading) {
    const darkSkeleton: React.CSSProperties = {
      background: 'linear-gradient(90deg, rgba(0,200,255,0.05) 25%, rgba(0,200,255,0.14) 50%, rgba(0,200,255,0.05) 75%)',
      backgroundSize: '200% 100%',
    }
    return (
      <div className="min-h-screen pt-safe" style={{ background: '#0f1e30' }}>
        <div className="px-4 py-4">
          <Skeleton style={{ ...darkSkeleton, height: 36, width: 160 }} />
        </div>
        <div className="px-4 pt-6 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={{ ...darkSkeleton, height: 90, borderRadius: 16 }} />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6" style={{ background: '#0f1e30' }}>
        <UtensilsCrossed size={48} style={{ color: '#00c8ff', opacity: 0.5 }} />
        <h1 className="text-xl font-black text-white">Meja tidak ditemukan</h1>
        <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>
          QR code tidak valid atau sudah tidak aktif.
        </p>
      </div>
    )
  }

  const grouped = groupByCategory(data.menus)
  const categories = Object.keys(grouped).sort()

  const cartCount = cart.items.reduce((sum, i) => sum + i.qty, 0)
  const cartTotal = cart.items.reduce((sum, i) => sum + i.qty * i.price, 0)

  return (
    <div className="min-h-screen" style={{ background: '#0f1e30' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 pt-safe pb-4 flex items-center justify-between"
        style={{
          background: 'rgba(15,30,48,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,200,255,0.12)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(0,200,255,0.1)', border: '1px solid rgba(0,200,255,0.25)' }}
          >
            <Coffee size={17} style={{ color: '#00c8ff' }} />
          </div>
          <div>
            <p className="font-black text-sm leading-tight text-white">ThomsCafe</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>POS System</p>
          </div>
        </div>

        {/* Table badge */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(0,200,255,0.12)', border: '1px solid rgba(0,200,255,0.3)' }}
        >
          <span className="text-xs font-medium" style={{ color: 'rgba(0,200,255,0.8)' }}>Meja</span>
          <span className="text-sm font-black" style={{ color: '#00c8ff' }}>{data.table.table_number}</span>
        </div>
      </div>

      {/* Welcome */}
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-black text-white">Halo! 👋</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Kamu sedang di <span style={{ color: '#00c8ff', fontWeight: 700 }}>Meja {data.table.table_number}</span>.
          Berikut menu yang tersedia.
        </p>
      </div>

      {/* Menu per category */}
      <div className="px-4 pb-32 flex flex-col gap-8 mt-4">
        {categories.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <UtensilsCrossed size={36} style={{ color: 'rgba(255,255,255,0.2)' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Menu belum tersedia</p>
          </div>
        ) : (
          categories.map((category) => (
            <div key={category}>
              <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(0,200,255,0.7)' }}>
                {category}
              </h2>
              <div className="flex flex-col gap-3">
                {grouped[category].map((item) => {
                  const inCart = cart.items.find((i) => i.menuId === item.id)
                  return (
                    <div
                      key={item.id}
                      className="flex gap-3 rounded-2xl overflow-hidden"
                      style={{
                        background: 'rgba(22,40,64,0.8)',
                        border: '1px solid rgba(0,200,255,0.1)',
                      }}
                    >
                      {/* Image */}
                      <div style={{ width: 90, height: 90, flexShrink: 0, background: 'rgba(0,200,255,0.05)' }}>
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <UtensilsCrossed size={24} style={{ color: 'rgba(255,255,255,0.15)' }} />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 py-3 pr-3 flex flex-col justify-between">
                        <p className="text-sm font-bold text-white leading-tight">{item.name}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-base font-black" style={{ color: '#00c8ff' }}>
                            {formatPrice(item.price)}
                          </p>
                          {inCart ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => cart.updateQty(item.id, inCart.qty - 1)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(0,200,255,0.1)', border: '1px solid rgba(0,200,255,0.25)', color: '#00c8ff' }}
                              >
                                <Minus size={13} />
                              </button>
                              <span className="text-sm font-black text-white w-4 text-center">{inCart.qty}</span>
                              <button
                                onClick={() => cart.updateQty(item.id, inCart.qty + 1)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center"
                                style={{ background: '#00c8ff', color: '#0f1e30' }}
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() =>
                                cart.addItem({ menuId: item.id, name: item.name, price: item.price, image: item.image })
                              }
                              className="px-3 py-1.5 rounded-lg text-xs font-black"
                              style={{ background: '#00c8ff', color: '#0f1e30' }}
                            >
                              Tambah
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="pb-6 text-center">
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Silakan hubungi pelayan untuk memesan
        </p>
      </div>

      {/* Cart bottom bar */}
      {cartCount > 0 && !cartOpen && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-safe pt-3 z-20" style={{ background: 'rgba(15,30,48,0.98)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(0,200,255,0.12)' }}>
          <button
            onClick={() => setCartOpen(true)}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl"
            style={{ background: '#00c8ff' }}
          >
            <span className="flex items-center gap-2" style={{ color: '#0f1e30' }}>
              <ShoppingBag size={17} />
              <span className="text-sm font-black">Lihat Keranjang</span>
              <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.15)' }}>
                {cartCount}
              </span>
            </span>
            <span className="text-sm font-black" style={{ color: '#0f1e30' }}>{formatPrice(cartTotal)}</span>
          </button>
        </div>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <>
          <div className="fixed inset-0 z-30" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setCartOpen(false)} />
          <motion.div
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 1 }}
            dragSnapToOrigin
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) setCartOpen(false)
            }}
            className="fixed bottom-0 left-0 right-0 z-40 flex flex-col"
            style={{ background: '#162848', borderRadius: '24px 24px 0 0', border: '1px solid rgba(0,200,255,0.1)', maxHeight: '90vh' }}
          >
            <div
              className="relative flex items-center justify-between px-5 py-4 touch-none"
              style={{ borderBottom: '1px solid rgba(0,200,255,0.1)' }}
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="absolute left-1/2 -translate-x-1/2 top-2 rounded-full" style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.25)' }} />
              <p className="text-base font-black text-white">Keranjang</p>
              <button onClick={() => setCartOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,200,255,0.1)', border: '1px solid rgba(0,200,255,0.25)', color: 'rgba(255,255,255,0.6)' }}>
                <X size={15} />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-2 flex-1">
              {cart.items.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-2">
                  <ShoppingBag size={32} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Keranjang masih kosong</p>
                </div>
              ) : (
                cart.items.map((item) => (
                  <div key={item.menuId} className="flex items-center gap-3 py-3" style={{ borderBottom: '1px solid rgba(0,200,255,0.08)' }}>
                    <div style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 10, overflow: 'hidden', background: 'rgba(0,200,255,0.05)' }}>
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <UtensilsCrossed size={18} style={{ color: 'rgba(255,255,255,0.15)' }} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{item.name}</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{formatPrice(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => cart.updateQty(item.menuId, item.qty - 1)}
                        className="w-6 h-6 rounded-md flex items-center justify-center"
                        style={{ background: 'rgba(0,200,255,0.1)', border: '1px solid rgba(0,200,255,0.25)', color: '#00c8ff' }}
                      >
                        <Minus size={11} />
                      </button>
                      <span className="text-sm font-black text-white w-4 text-center">{item.qty}</span>
                      <button
                        onClick={() => cart.updateQty(item.menuId, item.qty + 1)}
                        className="w-6 h-6 rounded-md flex items-center justify-center"
                        style={{ background: '#00c8ff', color: '#0f1e30' }}
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.items.length > 0 && (
              <div className="px-5 pt-4 pb-safe" style={{ borderTop: '1px solid rgba(0,200,255,0.1)' }}>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nama pemesan (opsional)"
                  className="w-full px-3 py-2.5 rounded-xl text-sm mb-3 text-white"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,200,255,0.15)', outline: 'none' }}
                />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>Total ({cartCount} item)</span>
                  <span className="text-lg font-black" style={{ color: '#00c8ff' }}>{formatPrice(cartTotal)}</span>
                </div>
                <button
                  onClick={() => orderMutation.mutate()}
                  disabled={orderMutation.isPending}
                  className="w-full py-3.5 rounded-2xl text-sm font-black"
                  style={{ background: '#00c8ff', color: '#0f1e30', opacity: orderMutation.isPending ? 0.6 : 1 }}
                >
                  {orderMutation.isPending ? 'Mengirim pesanan...' : 'Pesan Sekarang'}
                </button>
                {orderMutation.isError && (
                  <p className="text-xs text-center mt-2" style={{ color: '#f87171' }}>
                    Gagal membuat pesanan. Coba lagi.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  )
}
