import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useThemeStore } from './store/themeStore'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import DashboardHome from './pages/dashboard/DashboardHome'
import CategoryPage from './pages/dashboard/category/CategoryPage'
import MenuPage from './pages/dashboard/menu/MenuPage'
import TablePage from './pages/dashboard/table/TablePage'
import OrderPage from './pages/dashboard/order/OrderPage'
import UserPage from './pages/dashboard/user/UserPage'
import RolePage from './pages/dashboard/role/RolePage'
import ReportPage from './pages/dashboard/report/ReportPage'
import MenuPublicPage from './pages/menu/MenuPublicPage'
import OrderStatusPage from './pages/menu/OrderStatusPage'
import ProtectedRoute from './components/shared/ProtectedRoute'

export default function App() {
  const applyTheme = useThemeStore((s) => s.applyTheme)

  useEffect(() => {
    applyTheme()
  }, [applyTheme])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/menu/:token" element={<MenuPublicPage />} />
        <Route path="/order/:id/status" element={<OrderStatusPage />} />

        {/* Protected dashboard */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />}>
            <Route index element={<DashboardHome />} />
            <Route path="categories" element={<CategoryPage />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="tables" element={<TablePage />} />
            <Route path="orders" element={<OrderPage />} />
            <Route path="users" element={<UserPage />} />
            <Route path="roles" element={<RolePage />} />
            <Route path="reports" element={<ReportPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
