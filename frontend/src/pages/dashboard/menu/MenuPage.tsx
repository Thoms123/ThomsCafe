import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, UtensilsCrossed, X, ImagePlus, ToggleLeft, ToggleRight } from 'lucide-react'
import type { AxiosError } from 'axios'
import api from '../../../lib/axios'

interface Category {
  id: number
  name: string
}

interface Menu {
  id: number
  name: string
  price: number
  image: string
  category_id: number
  category: string
  is_available: boolean
  created_at: string
}

interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

const BACKEND = 'http://localhost:8080'

function fetchCategories() {
  return api.get<ApiResponse<Category[]>>('/categories').then((r) => r.data.data)
}

function fetchMenus(categoryId?: number) {
  const params: Record<string, string> = {}
  if (categoryId) params.category_id = String(categoryId)
  return api.get<ApiResponse<Menu[]>>('/menus', { params }).then((r) => r.data.data)
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

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: 4,
  display: 'block',
}

interface MenuFormState {
  name: string
  price: string
  categoryId: string
  imageFile: File | null
  imagePreview: string
}

const defaultForm: MenuFormState = {
  name: '',
  price: '',
  categoryId: '',
  imageFile: null,
  imagePreview: '',
}

function formatPrice(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

export default function MenuPage() {
  const qc = useQueryClient()
  const [filterCat, setFilterCat] = useState<number | undefined>()
  const [showModal, setShowModal] = useState(false)
  const [editMenu, setEditMenu] = useState<Menu | null>(null)
  const [form, setForm] = useState<MenuFormState>(defaultForm)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories })
  const { data: menus = [], isLoading } = useQuery({
    queryKey: ['menus', filterCat],
    queryFn: () => fetchMenus(filterCat),
  })

  const deleteMenu = menus.find((m) => m.id === deleteId)

  function openCreate() {
    setEditMenu(null)
    setForm(defaultForm)
    setError('')
    setShowModal(true)
  }

  function openEdit(menu: Menu) {
    setEditMenu(menu)
    setForm({
      name: menu.name,
      price: String(menu.price),
      categoryId: String(menu.category_id),
      imageFile: null,
      imagePreview: menu.image ? `${BACKEND}${menu.image}` : '',
    })
    setError('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditMenu(null)
    setForm(defaultForm)
    setError('')
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setForm((f) => ({ ...f, imageFile: file, imagePreview: URL.createObjectURL(file) }))
  }

  const saveMut = useMutation({
    mutationFn: (fd: FormData) =>
      editMenu
        ? api.put(`/menus/${editMenu.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        : api.post('/menus', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menus'] })
      closeModal()
    },
    onError: (e: AxiosError<{ message: string }>) => setError(e.response?.data?.message ?? 'Gagal menyimpan menu'),
  })

  const toggleMut = useMutation({
    mutationFn: (id: number) => api.patch(`/menus/${id}/availability`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menus'] }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/menus/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menus'] })
      setDeleteId(null)
    },
    onError: (e: AxiosError<{ message: string }>) => setError(e.response?.data?.message ?? 'Gagal menghapus menu'),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.append('name', form.name.trim())
    fd.append('price', form.price)
    fd.append('category_id', form.categoryId)
    if (form.imageFile) fd.append('image', form.imageFile)
    saveMut.mutate(fd)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
            Menu
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Kelola item menu dan ketersediaannya
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{
            background: 'var(--accent)',
            color: '#000',
            border: 'none',
            borderRadius: 12,
            padding: '9px 18px',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Plus size={15} />
          Tambah Menu
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterCat(undefined)}
          className="px-4 py-1.5 rounded-full text-xs font-bold transition-all"
          style={
            filterCat === undefined
              ? { background: 'var(--accent)', color: '#000', border: 'none' }
              : { background: 'var(--accent-dim)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }
          }
        >
          Semua
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilterCat(cat.id)}
            className="px-4 py-1.5 rounded-full text-xs font-bold transition-all"
            style={
              filterCat === cat.id
                ? { background: 'var(--accent)', color: '#000', border: 'none' }
                : { background: 'var(--accent-dim)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }
            }
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : menus.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-3" style={cardStyle}>
          <UtensilsCrossed size={36} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada menu</p>
          <button onClick={openCreate} className="text-xs font-bold" style={{ color: 'var(--accent)' }}>
            + Tambah menu pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {menus.map((menu) => (
            <div key={menu.id} className="rounded-2xl overflow-hidden flex flex-col" style={cardStyle}>
              {/* Image */}
              <div
                className="relative"
                style={{ height: 140, background: 'var(--accent-dim)', flexShrink: 0 }}
              >
                {menu.image ? (
                  <img
                    src={`${BACKEND}${menu.image}`}
                    alt={menu.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UtensilsCrossed size={32} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                  </div>
                )}
                {/* availability badge */}
                <span
                  className="absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={
                    menu.is_available
                      ? { background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }
                      : { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }
                  }
                >
                  {menu.is_available ? 'Tersedia' : 'Habis'}
                </span>
              </div>

              {/* Info */}
              <div className="p-3 flex flex-col gap-2 flex-1">
                <div>
                  <p className="text-sm font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{menu.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{menu.category}</p>
                </div>
                <p className="text-base font-black" style={{ color: 'var(--accent)' }}>
                  {formatPrice(menu.price)}
                </p>

                {/* Actions */}
                <div className="flex gap-1.5 mt-auto">
                  <button
                    title={menu.is_available ? 'Set habis' : 'Set tersedia'}
                    onClick={() => toggleMut.mutate(menu.id)}
                    disabled={toggleMut.isPending}
                    className="flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs font-semibold gap-1 transition-all"
                    style={
                      menu.is_available
                        ? { background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }
                        : { background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }
                    }
                  >
                    {menu.is_available ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                    {menu.is_available ? 'Tersedia' : 'Habis'}
                  </button>
                  <button
                    onClick={() => openEdit(menu)}
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}
                    title="Edit"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setDeleteId(menu.id)}
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

      {/* Create / Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)' }}
          onClick={closeModal}
        >
          <div
            className="rounded-2xl w-full max-w-md"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                {editMenu ? 'Edit Menu' : 'Tambah Menu'}
              </h3>
              <button onClick={closeModal} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              {/* Image upload */}
              <div>
                <label style={labelStyle}>Foto Menu</label>
                <div
                  className="relative rounded-xl overflow-hidden flex items-center justify-center cursor-pointer transition-all"
                  style={{
                    height: 140,
                    background: form.imagePreview ? 'transparent' : 'var(--accent-dim)',
                    border: '2px dashed var(--accent-border)',
                  }}
                  onClick={() => fileRef.current?.click()}
                >
                  {form.imagePreview ? (
                    <img src={form.imagePreview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                      <ImagePlus size={28} style={{ opacity: 0.5 }} />
                      <span className="text-xs">Klik untuk upload foto</span>
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label style={labelStyle}>Nama Menu</label>
                <input
                  style={inputStyle}
                  placeholder="Contoh: Kopi Susu"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  maxLength={200}
                />
              </div>

              {/* Price */}
              <div>
                <label style={labelStyle}>Harga (Rp)</label>
                <input
                  style={inputStyle}
                  type="number"
                  placeholder="25000"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  required
                  min={0}
                />
              </div>

              {/* Category */}
              <div>
                <label style={labelStyle}>Kategori</label>
                <select
                  style={{ ...inputStyle, appearance: 'none' }}
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  required
                >
                  <option value="">Pilih kategori...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
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
                  {saveMut.isPending ? 'Menyimpan...' : editMenu ? 'Simpan Perubahan' : 'Tambah Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
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
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
              >
                <Trash2 size={18} style={{ color: '#f87171' }} />
              </div>
              <div>
                <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Hapus Menu</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tindakan ini tidak bisa dibatalkan</p>
              </div>
            </div>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Apakah kamu yakin ingin menghapus{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{deleteMenu?.name}</strong>?
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
