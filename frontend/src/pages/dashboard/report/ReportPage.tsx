import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import { Wallet, ShoppingBag, TrendingUp, Download, UtensilsCrossed, TableProperties } from 'lucide-react'
import api from '../../../lib/axios'

interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

interface SalesSummary {
  total_revenue: number
  total_orders: number
  average_order: number
}

interface DailySales {
  date: string
  total: number
  orders: number
}

interface TopMenu {
  menu_id: number
  name: string
  qty_sold: number
  revenue: number
}

interface TableRecap {
  table_id: number
  table_number: string
  orders: number
  total: number
}

function fetchSummary(from: string, to: string) {
  return api
    .get<ApiResponse<SalesSummary>>('/reports/sales', { params: { from: from || undefined, to: to || undefined } })
    .then((r) => r.data.data)
}

function fetchDaily(from: string, to: string) {
  return api
    .get<ApiResponse<DailySales[]>>('/reports/sales/daily', { params: { from: from || undefined, to: to || undefined } })
    .then((r) => r.data.data)
}

function fetchTopMenus(from: string, to: string) {
  return api
    .get<ApiResponse<TopMenu[]>>('/reports/top-menus', { params: { limit: 10, from: from || undefined, to: to || undefined } })
    .then((r) => r.data.data)
}

function fetchTableRecap(from: string, to: string) {
  return api
    .get<ApiResponse<TableRecap[]>>('/reports/tables', { params: { from: from || undefined, to: to || undefined } })
    .then((r) => r.data.data)
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

function formatCurrency(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function csvEscape(value: string | number) {
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// The API returns dates as ISO timestamps (date-only values at midnight UTC); keep just the date part.
function formatDate(isoDate: string) {
  return isoDate.slice(0, 10)
}

export default function ReportPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data: summary } = useQuery({
    queryKey: ['reports-sales', from, to],
    queryFn: () => fetchSummary(from, to),
  })
  const { data: daily = [], isLoading: dailyLoading } = useQuery({
    queryKey: ['reports-sales-daily', from, to],
    queryFn: () => fetchDaily(from, to),
  })
  const { data: topMenus = [], isLoading: topMenusLoading } = useQuery({
    queryKey: ['reports-top-menus', from, to],
    queryFn: () => fetchTopMenus(from, to),
  })
  const { data: tableRecap = [] } = useQuery({
    queryKey: ['reports-tables', from, to],
    queryFn: () => fetchTableRecap(from, to),
  })

  const stats = [
    { label: 'Total Pendapatan', value: summary ? formatCurrency(summary.total_revenue) : '—', icon: Wallet },
    { label: 'Total Order', value: summary ? summary.total_orders.toLocaleString('id-ID') : '—', icon: ShoppingBag },
    { label: 'Rata-rata per Order', value: summary ? formatCurrency(summary.average_order) : '—', icon: TrendingUp },
  ]

  function handleExportCsv() {
    const lines: string[] = []

    lines.push('Ringkasan')
    lines.push(`Total Pendapatan,${csvEscape(summary?.total_revenue ?? 0)}`)
    lines.push(`Total Order,${csvEscape(summary?.total_orders ?? 0)}`)
    lines.push(`Rata-rata per Order,${csvEscape(summary?.average_order ?? 0)}`)
    lines.push('')

    lines.push('Penjualan Harian')
    lines.push('Tanggal,Total,Jumlah Order')
    for (const d of daily) lines.push(`${csvEscape(formatDate(d.date))},${csvEscape(d.total)},${csvEscape(d.orders)}`)
    lines.push('')

    lines.push('Menu Terlaris')
    lines.push('Menu,Jumlah Terjual,Pendapatan')
    for (const m of topMenus) lines.push(`${csvEscape(m.name)},${csvEscape(m.qty_sold)},${csvEscape(m.revenue)}`)
    lines.push('')

    lines.push('Rekap per Meja')
    lines.push('Meja,Jumlah Order,Total')
    for (const t of tableRecap) lines.push(`${csvEscape(t.table_number)},${csvEscape(t.orders)},${csvEscape(t.total)}`)

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laporan-thomscafe_${from || 'semua'}_${to || 'semua'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
            Laporan &amp; Analitik
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Ringkasan penjualan dan performa menu
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" style={inputStyle} value={from} onChange={(e) => setFrom(e.target.value)} max={to || undefined} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>s/d</span>
          <input type="date" style={inputStyle} value={to} onChange={(e) => setTo(e.target.value)} min={from || undefined} />
          <button
            onClick={handleExportCsv}
            style={{
              background: 'var(--accent)',
              color: '#000',
              border: 'none',
              borderRadius: 10,
              padding: '8px 16px',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="rounded-2xl p-5" style={cardStyle}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}
              >
                <Icon size={18} style={{ color: 'var(--accent-text)' }} />
              </div>
              <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          )
        })}
      </div>

      {/* Chart */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
          Penjualan Harian
        </h2>
        {dailyLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          </div>
        ) : daily.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-2">
            <TrendingUp size={32} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada data penjualan</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={daily} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} width={90} />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                labelFormatter={(label) => formatDate(String(label))}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)' }}
              />
              <Line type="monotone" dataKey="total" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} name="Total Penjualan" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top menus */}
        <div className="rounded-2xl" style={cardStyle}>
          <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
            <UtensilsCrossed size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Menu Terlaris
            </span>
          </div>
          {topMenusLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
            </div>
          ) : topMenus.length === 0 ? (
            <p className="text-sm text-center py-12" style={{ color: 'var(--text-muted)' }}>Belum ada data</p>
          ) : (
            <ul>
              {topMenus.map((m, i) => (
                <li
                  key={m.menu_id}
                  className="flex items-center gap-3 px-5 py-3"
                  style={{ borderBottom: i < topMenus.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent-text)' }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{m.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.qty_sold} terjual</p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{formatCurrency(m.revenue)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Table recap */}
        <div className="rounded-2xl" style={cardStyle}>
          <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
            <TableProperties size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Rekap per Meja
            </span>
          </div>
          {tableRecap.length === 0 ? (
            <p className="text-sm text-center py-12" style={{ color: 'var(--text-muted)' }}>Belum ada data</p>
          ) : (
            <ul>
              {tableRecap.map((t, i) => (
                <li
                  key={t.table_id}
                  className="flex items-center gap-3 px-5 py-3"
                  style={{ borderBottom: i < tableRecap.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Meja {t.table_number}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.orders} order</p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{formatCurrency(t.total)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
