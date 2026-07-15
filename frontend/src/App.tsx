import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useThemeStore } from './store/themeStore'
import { ToastProvider } from './components/ui/Toast'
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
import CustomerPage from './pages/dashboard/customer/CustomerPage'
import MenuPublicPage from './pages/menu/MenuPublicPage'
import OrderStatusPage from './pages/menu/OrderStatusPage'
import OrderHistoryPage from './pages/menu/OrderHistoryPage'
import ProtectedRoute from './components/shared/ProtectedRoute'

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public */}
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
        <Route path="/menu/:token" element={<PageTransition><MenuPublicPage /></PageTransition>} />
        <Route path="/order/:id/status" element={<PageTransition><OrderStatusPage /></PageTransition>} />
        <Route path="/order/history" element={<PageTransition><OrderHistoryPage /></PageTransition>} />

        {/* Protected dashboard */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />}>
            <Route index element={<PageTransition><DashboardHome /></PageTransition>} />
            <Route path="categories" element={<PageTransition><CategoryPage /></PageTransition>} />
            <Route path="menu" element={<PageTransition><MenuPage /></PageTransition>} />
            <Route path="tables" element={<PageTransition><TablePage /></PageTransition>} />
            <Route path="orders" element={<PageTransition><OrderPage /></PageTransition>} />
            <Route path="users" element={<PageTransition><UserPage /></PageTransition>} />
            <Route path="roles" element={<PageTransition><RolePage /></PageTransition>} />
            <Route path="reports" element={<PageTransition><ReportPage /></PageTransition>} />
            <Route path="customers" element={<PageTransition><CustomerPage /></PageTransition>} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  const applyTheme = useThemeStore((s) => s.applyTheme)

  useEffect(() => {
    applyTheme()
  }, [applyTheme])

  return (
    <BrowserRouter>
      <AnimatedRoutes />
      <ToastProvider />
    </BrowserRouter>
  )
}
