import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Coffee,
  LayoutDashboard,
  UtensilsCrossed,
  Tag,
  TableProperties,
  ShoppingBag,
  Users,
  ShieldCheck,
  BarChart3,
  Contact,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import { PermissionGate } from '../shared/PermissionGate'
import api from '../../lib/axios'

interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

function fetchPendingCount() {
  return api
    .get<ApiResponse<{ id: number }[]>>('/orders', { params: { status: 'pending' } })
    .then((r) => r.data.data.length)
}

const navItems = [
  { label: 'Dashboard',  href: '/dashboard',            permission: null,             icon: LayoutDashboard },
  { label: 'Menu',       href: '/dashboard/menu',        permission: 'menu:read',      icon: UtensilsCrossed },
  { label: 'Kategori',   href: '/dashboard/categories',  permission: 'category:read',  icon: Tag },
  { label: 'Meja',       href: '/dashboard/tables',      permission: 'table:read',     icon: TableProperties },
  { label: 'Pesanan',    href: '/dashboard/orders',      permission: 'order:read',     icon: ShoppingBag },
  { label: 'Pengguna',   href: '/dashboard/users',       permission: 'user:read',      icon: Users },
  { label: 'Role & Izin', href: '/dashboard/roles',      permission: 'role:manage',    icon: ShieldCheck },
  { label: 'Pelanggan',  href: '/dashboard/customers',   permission: 'customer:read',  icon: Contact },
  { label: 'Laporan',    href: '/dashboard/reports',     permission: 'report:read',    icon: BarChart3 },
]

export default function Sidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout, hasPermission } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['orders-pending-count'],
    queryFn: fetchPendingCount,
    enabled: hasPermission('order:read'),
    refetchInterval: 30000, // safety net — invalidated on WS order events via useOrdersSocket
  })

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside
      className="w-60 min-h-screen flex flex-col flex-shrink-0 transition-colors duration-200"
      style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid var(--sidebar-border)' }}
    >
      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-3" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#0d1b2e', boxShadow: '0 0 12px rgba(0,200,255,0.2)' }}
        >
          <Coffee size={17} style={{ color: '#00c8ff' }} />
        </div>
        <div>
          <p className="font-black text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>ThomsCafe</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>POS System</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 flex flex-col gap-0.5 mt-2">
        <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-2" style={{ color: 'var(--text-muted)' }}>
          Menu
        </p>

        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          const link = (
            <Link
              key={item.href}
              to={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={
                isActive
                  ? {
                      background: 'var(--nav-active-bg)',
                      color: 'var(--nav-active-text)',
                      border: '1px solid var(--nav-active-border)',
                      fontWeight: 600,
                    }
                  : { color: 'var(--nav-text)', border: '1px solid transparent' }
              }
            >
              <Icon size={16} />
              {item.label}
              {item.href === '/dashboard/orders' && pendingCount > 0 ? (
                <span
                  className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--accent)', color: '#000' }}
                >
                  {pendingCount}
                </span>
              ) : (
                isActive && (
                  <span
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--accent)' }}
                  />
                )
              )}
            </Link>
          )

          if (!item.permission) return link
          return (
            <PermissionGate key={item.href} permission={item.permission}>
              {link}
            </PermissionGate>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-1"
          style={{ color: 'var(--text-secondary)', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}
        >
          {theme === 'dark' ? <Sun size={15} style={{ color: 'var(--accent)' }} /> : <Moon size={15} style={{ color: 'var(--accent)' }} />}
          <span style={{ color: 'var(--accent-text)' }}>
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>

        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2.5 mt-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: '#0d1b2e', color: '#00c8ff', border: '1px solid rgba(0,200,255,0.3)' }}
          >
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
            <span
              className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-md"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }}
            >
              {user?.role}
            </span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
        >
          <LogOut size={15} />
          Keluar
        </button>
      </div>
    </aside>
  )
}
