import { Fragment, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ShieldCheck } from 'lucide-react'
import type { AxiosError } from 'axios'
import api from '../../../lib/axios'
import { useToast } from '../../../hooks/useToast'
import { Skeleton } from '../../../components/ui/Skeleton'
import type { Role, Permission } from '../../../types'

interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

function fetchRoles() {
  return api.get<ApiResponse<Role[]>>('/roles').then((r) => r.data.data)
}

function fetchPermissions() {
  return api.get<ApiResponse<Permission[]>>('/permissions').then((r) => r.data.data)
}

function groupByResource(perms: Permission[]) {
  const groups = new Map<string, Permission[]>()
  for (const p of perms) {
    const [resource] = p.name.split(':')
    if (!groups.has(resource)) groups.set(resource, [])
    groups.get(resource)!.push(p)
  }
  return groups
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

export default function RolePage() {
  const qc = useQueryClient()
  const toast = useToast()
  const [newRoleName, setNewRoleName] = useState('')

  const { data: roles = [], isLoading } = useQuery({ queryKey: ['roles'], queryFn: fetchRoles })
  const { data: permissions = [] } = useQuery({ queryKey: ['permissions'], queryFn: fetchPermissions })

  const createMut = useMutation({
    mutationFn: (name: string) => api.post('/roles', { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      setNewRoleName('')
      toast.success('Role berhasil ditambahkan')
    },
    onError: (e: AxiosError<{ message: string }>) => toast.error(e.response?.data?.message ?? 'Gagal membuat role'),
  })

  // No success toast here — the checkbox itself is the immediate feedback,
  // and toggling several permissions in a row would otherwise stack up toasts.
  const updatePermsMut = useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: number; permissionIds: number[] }) =>
      api.put(`/roles/${roleId}/permissions`, { permission_ids: permissionIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
    onError: (e: AxiosError<{ message: string }>) => toast.error(e.response?.data?.message ?? 'Gagal mengubah izin role'),
  })

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const name = newRoleName.trim()
    if (!name) return
    createMut.mutate(name)
  }

  function toggle(role: Role, perm: Permission) {
    const currentIds = role.permissions
      .map((name) => permissions.find((p) => p.name === name)?.id)
      .filter((id): id is number => id !== undefined)
    const has = currentIds.includes(perm.id)
    const nextIds = has ? currentIds.filter((id) => id !== perm.id) : [...currentIds, perm.id]
    updatePermsMut.mutate({ roleId: role.id, permissionIds: nextIds })
  }

  const groups = groupByResource(permissions)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
            Role &amp; Izin
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Kelola role dan permission yang dimiliki
          </p>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}
        >
          <ShieldCheck size={18} style={{ color: 'var(--accent-text)' }} />
        </div>
      </div>

      {/* Add role form */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
          Tambah Role
        </h2>
        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            style={inputStyle}
            placeholder="Nama role..."
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            maxLength={50}
          />
          <button type="submit" style={btnPrimary} disabled={createMut.isPending}>
            <Plus size={15} />
            {createMut.isPending ? 'Menyimpan...' : 'Tambah'}
          </button>
        </form>
      </div>

      {/* Permission matrix */}
      <div className="rounded-2xl" style={cardStyle}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Matriks Permission
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3" style={{ borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                <Skeleton className="h-4" style={{ width: '30%' }} />
                <Skeleton className="h-4 ml-auto" style={{ width: 20 }} />
                <Skeleton className="h-4" style={{ width: 20 }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Permission
                  </th>
                  {roles.map((role) => (
                    <th
                      key={role.id}
                      className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-center whitespace-nowrap"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {role.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...groups.entries()].map(([resource, perms]) => (
                  <Fragment key={resource}>
                    <tr>
                      <td colSpan={roles.length + 1} className="px-5 pt-4 pb-1 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent-text)' }}>
                        {resource}
                      </td>
                    </tr>
                    {perms.map((perm) => (
                      <tr key={perm.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="px-5 py-2" style={{ color: 'var(--text-primary)' }}>{perm.name}</td>
                        {roles.map((role) => (
                          <td key={role.id} className="text-center px-4 py-2">
                            <input
                              type="checkbox"
                              checked={role.permissions.includes(perm.name)}
                              onChange={() => toggle(role, perm)}
                              disabled={updatePermsMut.isPending}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
