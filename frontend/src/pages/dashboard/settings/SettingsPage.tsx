import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import api from '../../../lib/axios'
import { useToast } from '../../../hooks/useToast'
import { Skeleton } from '../../../components/ui/Skeleton'

interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

interface StoreHours {
  open_time: string
  close_time: string
}

function fetchStoreHours() {
  return api.get<ApiResponse<StoreHours>>('/public/store-hours').then((r) => r.data.data)
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
  width: '100%',
}

// Only mounted once `initial` is available, so local state can be initialized
// directly from it on first render — no effect needed to sync fetched data in.
function StoreHoursForm({ initial }: { initial: StoreHours }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [openTime, setOpenTime] = useState(initial.open_time)
  const [closeTime, setCloseTime] = useState(initial.close_time)

  const saveMut = useMutation({
    mutationFn: () => api.put('/settings/store-hours', { open_time: openTime, close_time: closeTime }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store-hours-settings'] })
      toast.success('Jam operasional berhasil diperbarui')
    },
    onError: (e: AxiosError<{ message: string }>) => {
      toast.error(e.response?.data?.message ?? 'Gagal memperbarui jam operasional')
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        saveMut.mutate()
      }}
      className="flex flex-col gap-4"
    >
      <div>
        <label className="text-xs font-bold uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Jam Buka
        </label>
        <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} style={inputStyle} required />
      </div>
      <div>
        <label className="text-xs font-bold uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Jam Tutup
        </label>
        <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} style={inputStyle} required />
      </div>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Berlaku sama untuk setiap hari. Di luar jam ini, customer tidak bisa membuat pesanan.
      </p>
      <button
        type="submit"
        disabled={saveMut.isPending}
        className="rounded-xl py-2.5 text-sm font-bold"
        style={{ background: 'var(--accent)', color: '#000', border: 'none', cursor: 'pointer' }}
      >
        {saveMut.isPending ? 'Menyimpan...' : 'Simpan'}
      </button>
    </form>
  )
}

export default function SettingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['store-hours-settings'],
    queryFn: fetchStoreHours,
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Pengaturan</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Jam operasional toko</p>
      </div>

      <div className="rounded-2xl p-6 max-w-md" style={cardStyle}>
        {isLoading || !data ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : (
          <StoreHoursForm initial={data} />
        )}
      </div>
    </div>
  )
}
