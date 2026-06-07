import { useAuthStore } from '../../store/authStore'

export default function DashboardHome() {
  const user = useAuthStore((s) => s.user)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Selamat datang, {user?.name}!</h1>
      <p className="text-gray-500 text-sm">Role: {user?.role}</p>
    </div>
  )
}
