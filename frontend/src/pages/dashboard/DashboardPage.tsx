import { Outlet } from 'react-router-dom'
import Sidebar from '../../components/layout/Sidebar'

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen transition-colors duration-200" style={{ background: 'var(--bg-app)' }}>
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
