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

interface DayHours {
  day_of_week: number
  open_time: string
  close_time: string
  is_closed: boolean
}

interface StoreHoursResponse {
  days: DayHours[]
}

// day_of_week follows Go's time.Weekday (0=Sunday..6=Saturday); displayed
// Monday-first since that's the conventional week layout in the CMS.
const DAY_LABELS: { value: number; label: string }[] = [
  { value: 1, label: 'Senin' },
  { value: 2, label: 'Selasa' },
  { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' },
  { value: 5, label: 'Jumat' },
  { value: 6, label: 'Sabtu' },
  { value: 0, label: 'Minggu' },
]

function fetchStoreHours() {
  return api.get<ApiResponse<StoreHoursResponse>>('/public/store-hours').then((r) => r.data.data.days)
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
  padding: '8px 10px',
  fontSize: 14,
  outline: 'none',
  width: '100%',
}

// Only mounted once `initial` is available, so local state can be initialized
// directly from it on first render — no effect needed to sync fetched data in.
function StoreHoursForm({ initial }: { initial: DayHours[] }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [days, setDays] = useState<DayHours[]>(initial)

  function updateDay(dayOfWeek: number, patch: Partial<DayHours>) {
    setDays((prev) => prev.map((d) => (d.day_of_week === dayOfWeek ? { ...d, ...patch } : d)))
  }

  const saveMut = useMutation({
    mutationFn: () => api.put('/settings/store-hours', { days }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store-hours-settings'] })
      qc.invalidateQueries({ queryKey: ['store-hours'] })
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
      className="flex flex-col gap-3"
    >
      {DAY_LABELS.map(({ value, label }) => {
        const day = days.find((d) => d.day_of_week === value)
        if (!day) return null
        return (
          <div key={value} className="flex items-center gap-3">
            <span className="text-xs font-bold w-14 flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
              {label}
            </span>
            <input
              type="time"
              value={day.open_time}
              onChange={(e) => updateDay(value, { open_time: e.target.value })}
              disabled={day.is_closed}
              style={{ ...inputStyle, opacity: day.is_closed ? 0.5 : 1 }}
              required
            />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              –
            </span>
            <input
              type="time"
              value={day.close_time}
              onChange={(e) => updateDay(value, { close_time: e.target.value })}
              disabled={day.is_closed}
              style={{ ...inputStyle, opacity: day.is_closed ? 0.5 : 1 }}
              required
            />
            <label className="flex items-center gap-1.5 flex-shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>
              <input
                type="checkbox"
                checked={day.is_closed}
                onChange={(e) => updateDay(value, { is_closed: e.target.checked })}
              />
              Tutup
            </label>
          </div>
        )
      })}
      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
        Di luar jam ini (atau di hari yang ditandai "Tutup"), customer tidak bisa membuat pesanan.
      </p>
      <button
        type="submit"
        disabled={saveMut.isPending}
        className="rounded-xl py-2.5 text-sm font-bold mt-1"
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
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Jam operasional toko per hari</p>
      </div>

      <div className="rounded-2xl p-6 max-w-lg" style={cardStyle}>
        {isLoading || !data ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : (
          <StoreHoursForm initial={data} />
        )}
      </div>
    </div>
  )
}
