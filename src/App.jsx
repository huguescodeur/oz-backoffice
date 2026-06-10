import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Shops from './pages/Shops'
import Products from './pages/Products'
import Categories from './pages/Categories'
import Stocks from './pages/Stocks'
import Orders from './pages/Orders'
import Users from './pages/Users'
import ShopSelect from './pages/ShopSelect'
import Logs from './pages/Logs'
import Onboarding from './pages/Onboarding'
import Profile from './pages/Profile'
import SuperDashboard from './pages/SuperDashboard'
import SuperAdmins from './pages/SuperAdmins'
import SuperActivity from './pages/SuperActivity'
import SuperSettings from './pages/SuperSettings'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

function Protected({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function AdminOnly({ children }) {
  const { user } = useAuth()
  if (user?.role === 'vendeur') return <Navigate to="/" replace />
  return children
}

function SuperOnly({ children }) {
  const { user } = useAuth()
  if (user?.role !== 'super') return <Navigate to="/" replace />
  return children
}

function VendeurShopGuard({ children }) {
  const { user, activeShop } = useAuth()
  if (user?.role === 'super') return <Navigate to="/super" replace />
  if (user?.role === 'vendeur' && !activeShop) return <Navigate to="/shop-select" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/shop-select" element={<Protected><ShopSelect /></Protected>} />
      <Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />
      <Route
        path="/*"
        element={
          <Protected>
            <Layout>
              <Routes>
                <Route index element={<VendeurShopGuard><Dashboard /></VendeurShopGuard>} />
                <Route path="shops" element={<AdminOnly><Shops /></AdminOnly>} />
                <Route path="products" element={<AdminOnly><Products /></AdminOnly>} />
                <Route path="categories" element={<AdminOnly><Categories /></AdminOnly>} />
                <Route path="stocks" element={<VendeurShopGuard><Stocks /></VendeurShopGuard>} />
                <Route path="orders" element={<VendeurShopGuard><Orders /></VendeurShopGuard>} />
                <Route path="users" element={<AdminOnly><Users /></AdminOnly>} />
                <Route path="logs" element={<VendeurShopGuard><Logs /></VendeurShopGuard>} />
                <Route path="profile" element={<Profile />} />
                <Route path="super" element={<SuperOnly><SuperDashboard /></SuperOnly>} />
                <Route path="super/admins" element={<SuperOnly><SuperAdmins /></SuperOnly>} />
                <Route path="super/activity" element={<SuperOnly><SuperActivity /></SuperOnly>} />
                <Route path="super/settings" element={<SuperOnly><SuperSettings /></SuperOnly>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </Protected>
        }
      />
    </Routes>
  )
}
