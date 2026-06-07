import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { PermissionGate } from '../shared/PermissionGate'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', permission: null },
  { label: 'Menu', href: '/dashboard/menu', permission: 'menu:read' },
  { label: 'Kategori', href: '/dashboard/categories', permission: 'category:read' },
  { label: 'Meja', href: '/dashboard/tables', permission: 'table:read' },
  { label: 'Pesanan', href: '/dashboard/orders', permission: 'order:read' },
  { label: 'Pengguna', href: '/dashboard/users', permission: 'user:read' },
  { label: 'Laporan', href: '/dashboard/reports', permission: 'report:read' },
]

export default function Sidebar() {
  const { pathname } = useLocation()
  const { user, logout } = useAuthStore()

  return (
    <aside className="w-56 min-h-screen bg-white border-r flex flex-col">
      <div className="p-5 border-b">
        <p className="font-bold text-lg">ThomsCafe</p>
        <p className="text-xs text-gray-500 mt-0.5">{user?.role}</p>
      </div>

      <nav className="flex-1 p-3 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const link = (
            <Link
              key={item.href}
              to={item.href}
              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.label}
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

      <div className="p-3 border-t">
        <div className="px-3 py-2 mb-1">
          <p className="text-sm font-medium truncate">{user?.name}</p>
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          Keluar
        </button>
      </div>
    </aside>
  )
}
