import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, TableProperties, X, Download, QrCode, Pencil } from 'lucide-react'
import type { AxiosError } from 'axios'
import api from '../../../lib/axios'

interface Table {
  id: number
  table_number: string
  token: string
  qr_code: string
  created_at: string
}

interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

function fetchTables() {
  return api.get<ApiResponse<Table[]>>('/tables').then((r) => r.data.data)
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

export default function TablePage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editTable, setEditTable] = useState<Table | null>(null)
  const [tableNumber, setTableNumber] = useState('')
  const [qrModal, setQrModal] = useState<Table | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: fetchTables,
  })

  const deleteTable = tables.find((t) => t.id === deleteId)

  const saveMut = useMutation({
    mutationFn: (name: string) =>
      editTable
        ? api.put(`/tables/${editTable.id}`, { table_number: name })
        : api.post('/tables', { table_number: name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] })
      closeModal()
    },
    onError: (e: AxiosError<{ message: string }>) =>
      setError(e.response?.data?.message ?? 'Gagal menyimpan meja'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/tables/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] })
      setDeleteId(null)
    },
    onError: (e: AxiosError<{ message: string }>) =>
      setError(e.response?.data?.message ?? 'Gagal menghapus meja'),
  })

  function openCreate() {
    setEditTable(null)
    setTableNumber('')
    setError('')
    setShowModal(true)
  }

  function openEdit(t: Table) {
    setEditTable(t)
    setTableNumber(t.table_number)
    setError('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditTable(null)
    setTableNumber('')
    setError('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    saveMut.mutate(tableNumber.trim())
  }

  function downloadQR(table: Table) {
    // base64 PNG → download
    const link = document.createElement('a')
    link.href = table.qr_code
    link.download = `qr-meja-${table.table_number}.png`
    link.click()
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Meja</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Kelola meja dan QR code untuk customer
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{
            background: 'var(--accent)', color: '#000', border: 'none',
            borderRadius: 12, padding: '9px 18px', fontWeight: 700,
            fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <Plus size={15} /> Tambah Meja
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : tables.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-3 rounded-2xl" style={cardStyle}>
          <TableProperties size={36} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada meja</p>
          <button onClick={openCreate} className="text-xs font-bold" style={{ color: 'var(--accent)' }}>
            + Tambah meja pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map((table) => (
            <div key={table.id} className="rounded-2xl overflow-hidden flex flex-col" style={cardStyle}>
              {/* QR preview */}
              <div
                className="flex items-center justify-center p-4 cursor-pointer"
                style={{ background: '#fff', height: 160 }}
                onClick={() => setQrModal(table)}
                title="Lihat QR Code"
              >
                <img src={table.qr_code} alt={`QR Meja ${table.table_number}`} className="w-full h-full object-contain" />
              </div>

              {/* Info */}
              <div className="p-4 flex flex-col gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Meja</p>
                  <p className="text-2xl font-black mt-0.5" style={{ color: 'var(--accent)' }}>
                    {table.table_number}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setQrModal(table)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }}
                  >
                    <QrCode size={13} /> QR Code
                  </button>
                  <button
                    onClick={() => openEdit(table)}
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}
                    title="Edit"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setDeleteId(table.id)}
                    style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}
                    title="Hapus"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)' }}
          onClick={closeModal}
        >
          <div
            className="rounded-2xl w-full max-w-sm"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                {editTable ? 'Edit Meja' : 'Tambah Meja'}
              </h3>
              <button onClick={closeModal} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
                  Nomor / Nama Meja
                </label>
                <input
                  style={inputStyle}
                  placeholder="Contoh: 1, A1, VIP-1"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  required
                  maxLength={20}
                  autoFocus
                />
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                  QR code akan otomatis di-generate
                </p>
              </div>
              {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="button" onClick={closeModal}
                  className="flex-1 rounded-xl py-2 text-sm font-semibold"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl py-2 text-sm font-bold"
                  style={{ background: 'var(--accent)', color: '#000', border: 'none', cursor: 'pointer' }}
                  disabled={saveMut.isPending}
                >
                  {saveMut.isPending ? 'Menyimpan...' : editTable ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={() => setQrModal(null)}
        >
          <div
            className="rounded-2xl w-full max-w-sm"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>QR Code</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Meja {qrModal.table_number}</p>
              </div>
              <button onClick={() => setQrModal(null)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center gap-5">
              <div className="p-4 rounded-2xl bg-white">
                <img src={qrModal.qr_code} alt="QR Code" style={{ width: 220, height: 220 }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Meja {qrModal.table_number}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Scan untuk melihat menu
                </p>
              </div>
              <button
                onClick={() => downloadQR(qrModal)}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold"
                style={{ background: 'var(--accent)', color: '#000', border: 'none', cursor: 'pointer' }}
              >
                <Download size={15} /> Download PNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId !== null && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)' }}
          onClick={() => setDeleteId(null)}
        >
          <div
            className="rounded-2xl p-7 w-full max-w-sm"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <Trash2 size={18} style={{ color: '#f87171' }} />
              </div>
              <div>
                <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Hapus Meja</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tindakan ini tidak bisa dibatalkan</p>
              </div>
            </div>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Hapus <strong style={{ color: 'var(--text-primary)' }}>Meja {deleteTable?.table_number}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 rounded-xl py-2 text-sm font-semibold"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }}
                onClick={() => setDeleteId(null)}
              >
                Batal
              </button>
              <button
                className="flex-1 rounded-xl py-2 text-sm font-bold"
                style={{ background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer' }}
                onClick={() => deleteMut.mutate(deleteId!)}
                disabled={deleteMut.isPending}
              >
                {deleteMut.isPending ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
