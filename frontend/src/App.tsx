import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useThemeStore } from './store/themeStore'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import DashboardHome from './pages/dashboard/DashboardHome'
import CategoryPage from './pages/dashboard/category/CategoryPage'
import MenuPage from './pages/dashboard/menu/MenuPage'
import TablePage from './pages/dashboard/table/TablePage'
import MenuPublicPage from './pages/menu/MenuPublicPage'
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

        {/* Protected dashboard */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />}>
            <Route index element={<DashboardHome />} />
            <Route path="categories" element={<CategoryPage />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="tables" element={<TablePage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
