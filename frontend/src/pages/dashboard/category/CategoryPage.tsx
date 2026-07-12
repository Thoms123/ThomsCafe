import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Tag, X, Check } from 'lucide-react'
import type { AxiosError } from 'axios'
import api from '../../../lib/axios'
import { useToast } from '../../../hooks/useToast'
import { Skeleton } from '../../../components/ui/Skeleton'

interface Category {
  id: number
  name: string
  created_at: string
}

interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

function fetchCategories(): Promise<Category[]> {
  return api.get<ApiResponse<Category[]>>('/categories').then((r) => r.data.data)
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

const btnPrimary: React.CSSProperties = {
  background: 'var(--accent)',
  color: '#000',
  border: 'none',
  borderRadius: 10,
  padding: '8px 18px',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

const btnDanger: React.CSSProperties = {
  background: 'rgba(239,68,68,0.12)',
  color: '#f87171',
  border: '1px solid rgba(239,68,68,0.25)',
  borderRadius: 8,
  padding: '6px 10px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
}

const btnEdit: React.CSSProperties = {
  background: 'var(--accent-dim)',
  color: 'var(--accent-text)',
  border: '1px solid var(--accent-border)',
  borderRadius: 8,
  padding: '6px 10px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
}

export default function CategoryPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  const createMut = useMutation({
    mutationFn: (name: string) => api.post('/categories', { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      setNewName('')
      toast.success('Kategori berhasil ditambahkan')
    },
    onError: (e: AxiosError<{ message: string }>) => toast.error(e.response?.data?.message ?? 'Gagal membuat kategori'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => api.put(`/categories/${id}`, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      setEditId(null)
      setEditName('')
      toast.success('Kategori berhasil diperbarui')
    },
    onError: (e: AxiosError<{ message: string }>) => toast.error(e.response?.data?.message ?? 'Gagal mengupdate kategori'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      setDeleteId(null)
      toast.success('Kategori berhasil dihapus')
    },
    onError: (e: AxiosError<{ message: string }>) => toast.error(e.response?.data?.message ?? 'Gagal menghapus kategori'),
  })

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    createMut.mutate(name)
  }

  function startEdit(cat: Category) {
    setEditId(cat.id)
    setEditName(cat.name)
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editId) return
    const name = editName.trim()
    if (!name) return
    updateMut.mutate({ id: editId, name })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
            Kategori Menu
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Kelola kategori untuk pengelompokan menu
          </p>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}
        >
          <Tag size={18} style={{ color: 'var(--accent-text)' }} />
        </div>
      </div>

      {/* Add form */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
          Tambah Kategori
        </h2>
        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            style={inputStyle}
            placeholder="Nama kategori..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={100}
          />
          <button type="submit" style={btnPrimary} disabled={createMut.isPending}>
            <Plus size={15} />
            {createMut.isPending ? 'Menyimpan...' : 'Tambah'}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="rounded-2xl" style={cardStyle}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Daftar Kategori ({categories.length})
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3" style={{ borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                <Skeleton className="h-4" style={{ width: `${40 + i * 8}%` }} />
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-2">
            <Tag size={32} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada kategori</p>
          </div>
        ) : (
          <ul>
            {categories.map((cat, i) => (
              <li
                key={cat.id}
                className="flex items-center gap-4 px-5 py-3 transition-colors"
                style={{
                  borderBottom: i < categories.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                {editId === cat.id ? (
                  <form onSubmit={handleUpdate} className="flex gap-2 flex-1">
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                      maxLength={100}
                    />
                    <button type="submit" style={{ ...btnEdit, gap: 4 }} disabled={updateMut.isPending}>
                      <Check size={14} />
                    </button>
                    <button type="button" style={{ ...btnDanger }} onClick={() => setEditId(null)}>
                      <X size={14} />
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{cat.name}</p>
                    </div>
                    <div className="flex gap-2">
                      <button style={btnEdit} onClick={() => startEdit(cat)} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button style={btnDanger} onClick={() => setDeleteId(cat.id)} title="Hapus">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteId !== null && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setDeleteId(null)}
        >
          <div
            className="rounded-2xl p-7 w-full max-w-sm"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
              >
                <Trash2 size={18} style={{ color: '#f87171' }} />
              </div>
              <div>
                <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Hapus Kategori</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Tindakan ini tidak bisa dibatalkan
                </p>
              </div>
            </div>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Apakah kamu yakin ingin menghapus kategori{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {categories.find((c) => c.id === deleteId)?.name}
              </strong>
              ?
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
                style={{ background: '#ef4444', color: '#fff', border: 'none' }}
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
