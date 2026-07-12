import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Users, X, ChevronDown } from 'lucide-react'
import type { AxiosError } from 'axios'
import api from '../../../lib/axios'
import { useAuthStore } from '../../../store/authStore'
import { PermissionGate } from '../../../components/shared/PermissionGate'
import type { ManagedUser, Role } from '../../../types'

interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

function fetchUsers() {
  return api.get<ApiResponse<ManagedUser[]>>('/users').then((r) => r.data.data)
}

function fetchRoles() {
  return api.get<ApiResponse<Role[]>>('/roles').then((r) => r.data.data)
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

interface UserFormState {
  name: string
  email: string
  password: string
  roleId: string
  isActive: boolean
}

const defaultForm: UserFormState = {
  name: '',
  email: '',
  password: '',
  roleId: '',
  isActive: true,
}

export default function UserPage() {
  const qc = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<ManagedUser | null>(null)
  const [form, setForm] = useState<UserFormState>(defaultForm)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [showRoleDropdown, setShowRoleDropdown] = useState(false)
  const roleDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) {
        setShowRoleDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: fetchRoles })

  const deleteUser = users.find((u) => u.id === deleteId)

  function openCreate() {
    setEditUser(null)
    setForm(defaultForm)
    setError('')
    setShowModal(true)
  }

  function openEdit(user: ManagedUser) {
    setEditUser(user)
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      roleId: String(user.role_id),
      isActive: user.is_active,
    })
    setError('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditUser(null)
    setForm(defaultForm)
    setError('')
    setShowRoleDropdown(false)
  }

  const saveMut = useMutation({
    mutationFn: () => {
      const roleId = Number(form.roleId)
      if (editUser) {
        return api.put(`/users/${editUser.id}`, {
          name: form.name.trim(),
          email: form.email.trim(),
          role_id: roleId,
          is_active: form.isActive,
          ...(form.password ? { password: form.password } : {}),
        })
      }
      return api.post('/users', {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role_id: roleId,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      closeModal()
    },
    onError: (e: AxiosError<{ message: string }>) => setError(e.response?.data?.message ?? 'Gagal menyimpan pengguna'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setDeleteId(null)
    },
    onError: (e: AxiosError<{ message: string }>) => setError(e.response?.data?.message ?? 'Gagal menghapus pengguna'),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    saveMut.mutate()
  }

  const selectedRole = roles.find((r) => String(r.id) === form.roleId)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
            Pengguna
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Kelola akun staff dan role masing-masing
          </p>
        </div>
        <PermissionGate permission="user:create">
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
            Tambah Pengguna
          </button>
        </PermissionGate>
      </div>

      {/* List */}
      <div className="rounded-2xl" style={cardStyle}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Daftar Pengguna ({users.length})
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-2">
            <Users size={32} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada pengguna</p>
          </div>
        ) : (
          <ul>
            {users.map((user, i) => (
              <li
                key={user.id}
                className="flex items-center gap-4 px-5 py-3"
                style={{
                  borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                </div>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }}
                >
                  {user.role}
                </span>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={
                    user.is_active
                      ? { background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }
                      : { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }
                  }
                >
                  {user.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
                <div className="flex gap-2">
                  <PermissionGate permission="user:update">
                    <button
                      style={{ background: 'var(--accent-dim)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}
                      onClick={() => openEdit(user)}
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                  </PermissionGate>
                  <PermissionGate permission="user:delete">
                    <button
                      style={{
                        background: 'rgba(239,68,68,0.08)',
                        color: '#f87171',
                        border: '1px solid rgba(239,68,68,0.15)',
                        borderRadius: 8,
                        padding: '6px 10px',
                        cursor: currentUser?.id === user.id ? 'not-allowed' : 'pointer',
                        opacity: currentUser?.id === user.id ? 0.4 : 1,
                      }}
                      onClick={() => currentUser?.id !== user.id && setDeleteId(user.id)}
                      disabled={currentUser?.id === user.id}
                      title={currentUser?.id === user.id ? 'Tidak bisa menghapus akun sendiri' : 'Hapus'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </PermissionGate>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

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
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                {editUser ? 'Edit Pengguna' : 'Tambah Pengguna'}
              </h3>
              <button onClick={closeModal} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              <div>
                <label style={labelStyle}>Nama</label>
                <input
                  style={inputStyle}
                  placeholder="Nama lengkap"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <label style={labelStyle}>Email</label>
                <input
                  style={inputStyle}
                  type="email"
                  placeholder="nama@thomscafe.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  maxLength={150}
                />
              </div>

              <div>
                <label style={labelStyle}>{editUser ? 'Password Baru (opsional)' : 'Password'}</label>
                <input
                  style={inputStyle}
                  type="password"
                  placeholder={editUser ? 'Kosongkan jika tidak diubah' : 'Minimal 6 karakter'}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required={!editUser}
                  minLength={6}
                />
              </div>

              <div ref={roleDropdownRef} style={{ position: 'relative' }}>
                <label style={labelStyle}>Role</label>
                <button
                  type="button"
                  onClick={() => setShowRoleDropdown((v) => !v)}
                  style={{
                    ...inputStyle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ color: selectedRole ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {selectedRole ? selectedRole.name : 'Pilih role...'}
                  </span>
                  <ChevronDown
                    size={14}
                    style={{
                      color: 'var(--text-muted)',
                      transform: showRoleDropdown ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.15s',
                      flexShrink: 0,
                    }}
                  />
                </button>
                {showRoleDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--accent-border)',
                      borderRadius: 10,
                      overflow: 'hidden',
                      zIndex: 100,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                    }}
                  >
                    {roles.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => {
                          setForm((f) => ({ ...f, roleId: String(role.id) }))
                          setShowRoleDropdown(false)
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '9px 12px',
                          fontSize: 14,
                          background: String(role.id) === form.roleId ? 'var(--accent-dim)' : 'transparent',
                          color: String(role.id) === form.roleId ? 'var(--accent-text)' : 'var(--text-primary)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'block',
                        }}
                      >
                        {role.name}
                      </button>
                    ))}
                  </div>
                )}
                <input type="text" required value={form.roleId} onChange={() => {}} style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }} />
              </div>

              {editUser && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Akun aktif</span>
                </label>
              )}

              {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}

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
                  {saveMut.isPending ? 'Menyimpan...' : editUser ? 'Simpan Perubahan' : 'Tambah Pengguna'}
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
                <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Hapus Pengguna</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tindakan ini tidak bisa dibatalkan</p>
              </div>
            </div>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Apakah kamu yakin ingin menghapus{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{deleteUser?.name}</strong>?
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
