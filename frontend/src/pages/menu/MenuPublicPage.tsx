import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { UtensilsCrossed, Search, History, ChevronUp, ShoppingBasket, Minus, Plus, X } from 'lucide-react'
import { motion, useDragControls } from 'framer-motion'
import api from '../../lib/axios'
import { PHONE_REGEX } from '../../lib/phone'
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

const ACCENT = '#e8491d'

function fetchPublicMenu(token: string) {
  return api.get<{ data: PublicData }>(`/public/menu/${token}`).then((r) => r.data.data)
}

function createOrder(
  token: string,
  customerName: string,
  phone: string,
  items: { menu_id: number; qty: number; note: string }[]
) {
  return api
    .post<{ data: CreateOrderResponse }>('/public/orders', {
      token,
      customer_name: customerName,
      phone,
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

// Shown right after the QR scan, before any menu content — the customer identifies
// themselves once per session, instead of being asked again at checkout.
function IdentityGate({ tableNumber, onSubmit }: { tableNumber?: string; onSubmit: (name: string, phone: string) => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const isPhoneValid = PHONE_REGEX.test(phone.trim())
  const canSubmit = name.trim().length > 0 && isPhoneValid

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (canSubmit) onSubmit(name.trim(), phone.trim())
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#fff' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-black text-xl text-gray-900">ThomsCafe</p>
          {tableNumber && <p className="text-xs text-gray-400 mt-1">Meja {tableNumber}</p>}
        </div>
        <h1 className="text-lg font-black text-gray-900 mb-1">Halo! 👋</h1>
        <p className="text-sm text-gray-500 mb-6">Isi data dirimu dulu sebelum lihat menu.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama pemesan"
            className="w-full px-3 py-3 rounded-xl text-sm text-gray-900 outline-none border border-gray-200"
            autoFocus
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="No. HP (mis. 08123456789)"
            className="w-full px-3 py-3 rounded-xl text-sm text-gray-900 outline-none border border-gray-200"
          />
          {phone.trim().length > 0 && !isPhoneValid && (
            <p className="text-xs text-red-500 -mt-1">Nomor HP tidak valid</p>
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3.5 rounded-2xl text-sm font-black text-white mt-2"
            style={{ background: ACCENT, opacity: canSubmit ? 1 : 0.5 }}
          >
            Lihat Menu
          </button>
        </form>
      </div>
    </div>
  )
}

export default function MenuPublicPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [cartOpen, setCartOpen] = useState(false)
  const [activeCat, setActiveCat] = useState('Semua')
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [notesOpen, setNotesOpen] = useState<Set<number>>(new Set())

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

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const orderMutation = useMutation({
    mutationFn: () =>
      createOrder(
        token!,
        cart.customerName,
        cart.phone,
        cart.items.map((i) => ({ menu_id: i.menuId, qty: i.qty, note: i.note.trim() }))
      ),
    onSuccess: (order) => {
      cart.clear()
      navigate(`/order/${order.id}/status`)
    },
  })

  const hasIdentity = cart.customerName.trim().length > 0 && PHONE_REGEX.test(cart.phone.trim())

  // Gate the entire page behind name+phone — collected once, right after scanning
  // the QR, instead of at checkout.
  if (!hasIdentity) {
    return <IdentityGate tableNumber={data?.table.table_number} onSubmit={cart.setCustomer} />
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pt-safe" style={{ background: '#fff' }}>
        <div className="px-4 py-4">
          <Skeleton style={{ height: 36, width: 160 }} />
        </div>
        <div className="px-4 pt-6 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} style={{ height: 180, borderRadius: 16 }} />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6" style={{ background: '#fff' }}>
        <UtensilsCrossed size={48} style={{ color: ACCENT, opacity: 0.4 }} />
        <h1 className="text-xl font-black text-gray-900">Meja tidak ditemukan</h1>
        <p className="text-sm text-center text-gray-500">QR code tidak valid atau sudah tidak aktif.</p>
      </div>
    )
  }

  const grouped = groupByCategory(data.menus)
  const categories = Object.keys(grouped).sort()
  const visibleCategories = activeCat === 'Semua' ? categories : categories.filter((c) => c === activeCat)

  const cartCount = cart.items.reduce((sum, i) => sum + i.qty, 0)
  const cartTotal = cart.items.reduce((sum, i) => sum + i.qty * i.price, 0)

  return (
    <div className="min-h-screen" style={{ background: '#fff' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 pt-safe pb-3 flex items-center justify-between bg-white/95 backdrop-blur border-b border-gray-100">
        <div>
          <p className="font-black text-base leading-tight text-gray-900">ThomsCafe</p>
          <p className="text-xs text-gray-400 mt-0.5">Meja {data.table.table_number} · Silakan pilih menu</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/order/history" className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 text-gray-500">
            <History size={16} />
          </Link>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 text-gray-500">
            <Search size={16} />
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div className="sticky top-[60px] z-10 flex items-stretch bg-white border-b border-gray-100">
        <div
          className="flex-shrink-0 flex items-center gap-1 px-3 text-[11px] font-extrabold uppercase tracking-wide border-r border-gray-100"
          style={{ color: ACCENT }}
        >
          Kategori
        </div>
        <div className="flex-1 flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {['Semua', ...categories].map((c) => (
            <button
              key={c}
              onClick={() => setActiveCat(c)}
              className="flex-shrink-0 h-[42px] px-3.5 text-xs font-bold whitespace-nowrap border-b-[2.5px]"
              style={{
                color: activeCat === c ? ACCENT : '#9ca3af',
                borderColor: activeCat === c ? ACCENT : 'transparent',
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Welcome */}
      <div className="px-4 pt-4 pb-1">
        <h1 className="text-xl font-black text-gray-900">Halo! 👋</h1>
        <p className="text-xs text-gray-400 mt-1">
          Kamu di <span style={{ color: ACCENT, fontWeight: 800 }}>Meja {data.table.table_number}</span>. Ketuk menu untuk lihat detail.
        </p>
      </div>

      {/* Menu per category */}
      <div className="pb-32">
        {categories.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <UtensilsCrossed size={36} className="text-gray-200" />
            <p className="text-sm text-gray-400">Menu belum tersedia</p>
          </div>
        ) : (
          visibleCategories.map((category) => (
            <div key={category}>
              <h2 className="px-4 pt-4 pb-2 text-[11px] font-black uppercase tracking-widest text-gray-300">{category}</h2>
              <div className="grid grid-cols-2 gap-3 px-4">
                {grouped[category].map((item) => {
                  const inCart = cart.items.find((i) => i.menuId === item.id)
                  return (
                    <div key={item.id}>
                      <div className="w-full aspect-square rounded-2xl overflow-hidden bg-gray-100 relative">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <UtensilsCrossed size={24} className="text-gray-300" />
                          </div>
                        )}
                      </div>
                      <p className="text-[12.5px] font-extrabold uppercase leading-snug mt-2 min-h-[32px] text-gray-900">{item.name}</p>
                      <p className="text-sm font-black text-gray-900 mt-0.5">{formatPrice(item.price)}</p>
                      <div className="mt-2">
                        {inCart ? (
                          <div className="flex items-center justify-between rounded-full border-[1.5px] px-2 py-1" style={{ borderColor: ACCENT }}>
                            <button
                              onClick={() => cart.updateQty(item.id, inCart.qty - 1)}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white"
                              style={{ background: ACCENT }}
                            >
                              <Minus size={13} />
                            </button>
                            <span className="text-sm font-black text-gray-900">{inCart.qty}</span>
                            <button
                              onClick={() => cart.updateQty(item.id, inCart.qty + 1)}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white"
                              style={{ background: ACCENT }}
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              cart.addItem({ menuId: item.id, name: item.name, price: item.price, image: item.image })
                            }
                            className="w-full py-2 rounded-full text-xs font-extrabold border-[1.5px]"
                            style={{ borderColor: ACCENT, color: ACCENT }}
                          >
                            Tambah
                          </button>
                        )}
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
        <p className="text-xs text-gray-300">Silakan hubungi pelayan untuk memesan</p>
      </div>

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed z-20 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg"
          style={{ background: '#2b2b2b', right: 16, bottom: cartCount > 0 && !cartOpen ? 96 : 24 }}
        >
          <ChevronUp size={18} />
        </button>
      )}

      {/* Cart bottom bar */}
      {cartCount > 0 && !cartOpen && (
        <div className="fixed bottom-0 left-0 right-0 pb-safe z-20" style={{ background: ACCENT }}>
          <button onClick={() => setCartOpen(true)} className="w-full flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 rounded-full flex items-center justify-center text-white" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <ShoppingBasket size={16} />
                <span
                  className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-black"
                  style={{ background: '#fff', color: ACCENT }}
                >
                  {cartCount}
                </span>
              </div>
              <div className="text-left text-white">
                <p className="text-[10.5px] opacity-85">Total</p>
                <p className="text-sm font-black">{formatPrice(cartTotal)}</p>
              </div>
            </div>
            <span className="px-4 py-2.5 rounded-xl text-xs font-black text-white" style={{ background: 'rgba(0,0,0,0.22)' }}>
              CHECK OUT ({cartCount})
            </span>
          </button>
        </div>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <>
          <div className="fixed inset-0 z-30" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setCartOpen(false)} />
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
            className="fixed bottom-0 left-0 right-0 z-40 flex flex-col bg-white"
            style={{ borderRadius: '24px 24px 0 0', border: '1px solid #f1f1f1', maxHeight: '90vh' }}
          >
            <div className="relative flex items-center justify-between px-5 py-4 touch-none border-b border-gray-100" onPointerDown={(e) => dragControls.start(e)}>
              <div className="absolute left-1/2 -translate-x-1/2 top-2 rounded-full bg-gray-200" style={{ width: 36, height: 4 }} />
              <p className="text-base font-black text-gray-900">Pesananmu</p>
              <button onClick={() => setCartOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 text-gray-500">
                <X size={15} />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-2 flex-1">
              {cart.items.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-2">
                  <ShoppingBasket size={32} className="text-gray-200" />
                  <p className="text-sm text-gray-400">Keranjang masih kosong</p>
                </div>
              ) : (
                cart.items.map((item) => {
                  const noteOpen = notesOpen.has(item.menuId) || item.note.trim().length > 0
                  return (
                    <div key={item.menuId} className="py-3 border-b border-gray-50">
                      <div className="flex items-center gap-3">
                        <div style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 10, overflow: 'hidden', background: '#f4f4f5' }}>
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <UtensilsCrossed size={18} className="text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                          <p className="text-xs text-gray-400">{formatPrice(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => cart.updateQty(item.menuId, item.qty - 1)}
                            className="w-6 h-6 rounded-md flex items-center justify-center"
                            style={{ background: '#fdece5', color: ACCENT }}
                          >
                            <Minus size={11} />
                          </button>
                          <span className="text-sm font-black text-gray-900 w-4 text-center">{item.qty}</span>
                          <button
                            onClick={() => cart.updateQty(item.menuId, item.qty + 1)}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-white"
                            style={{ background: ACCENT }}
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>
                      <div className="pl-[60px] mt-1.5">
                        {noteOpen ? (
                          <textarea
                            value={item.note}
                            onChange={(e) => cart.updateNote(item.menuId, e.target.value)}
                            placeholder="Contoh: tanpa gula, pedas sedikit…"
                            rows={2}
                            maxLength={500}
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs text-gray-900 outline-none border border-gray-200 resize-none"
                          />
                        ) : (
                          <button
                            onClick={() => setNotesOpen((prev) => new Set(prev).add(item.menuId))}
                            className="text-xs italic text-gray-400"
                          >
                            + Tambah catatan
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {cart.items.length > 0 && (
              <div className="px-5 pt-4 pb-safe border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-500">
                    Pemesan: <span className="font-bold text-gray-700">{cart.customerName}</span> · {cart.phone}
                  </p>
                  <button onClick={() => cart.clearCustomer()} className="text-xs font-bold flex-shrink-0" style={{ color: ACCENT }}>
                    Ubah
                  </button>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold text-gray-500">Total ({cartCount} item)</span>
                  <span className="text-lg font-black" style={{ color: ACCENT }}>{formatPrice(cartTotal)}</span>
                </div>
                <button
                  onClick={() => orderMutation.mutate()}
                  disabled={orderMutation.isPending}
                  className="w-full py-3.5 rounded-2xl text-sm font-black text-white"
                  style={{ background: ACCENT, opacity: orderMutation.isPending ? 0.6 : 1 }}
                >
                  {orderMutation.isPending ? 'Mengirim pesanan...' : 'Pesan Sekarang'}
                </button>
                {orderMutation.isError && (
                  <p className="text-xs text-center mt-2 text-red-500">Gagal membuat pesanan. Coba lagi.</p>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  )
}
