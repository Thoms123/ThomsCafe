import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { UtensilsCrossed, Coffee } from 'lucide-react'
import axios from 'axios'

const BASE = 'http://localhost:8080/api/v1'

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

function fetchPublicMenu(token: string) {
  return axios.get<{ data: PublicData }>(`${BASE}/public/menu/${token}`).then((r) => r.data.data)
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

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-menu', token],
    queryFn: () => fetchPublicMenu(token!),
    enabled: !!token,
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1e30' }}>
        <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderColor: '#00c8ff', borderTopColor: 'transparent' }} />
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

  return (
    <div className="min-h-screen" style={{ background: '#0f1e30' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 py-4 flex items-center justify-between"
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
      <div className="px-4 pb-10 flex flex-col gap-8 mt-4">
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
                {grouped[category].map((item) => (
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
                      <div>
                        <p className="text-sm font-bold text-white leading-tight">{item.name}</p>
                      </div>
                      <p className="text-base font-black" style={{ color: '#00c8ff' }}>
                        {formatPrice(item.price)}
                      </p>
                    </div>
                  </div>
                ))}
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
    </div>
  )
}
