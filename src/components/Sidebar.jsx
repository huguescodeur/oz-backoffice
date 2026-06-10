import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Store, Package, Tag, Layers,
  ShoppingCart, Users, LogOut, Zap, ChevronDown, Activity, UserCircle, ArrowLeftRight,
  Globe, Settings, Shield, X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const allNav = [
  { to: '/',           label: 'Dashboard',  icon: LayoutDashboard, roles: ['admin', 'vendeur'] },
  { to: '/shops',      label: 'Boutiques',  icon: Store,           roles: ['admin'] },
  { to: '/products',   label: 'Produits',   icon: Package,         roles: ['admin'] },
  { to: '/categories', label: 'Catégories', icon: Tag,             roles: ['admin'] },
  { to: '/stocks',     label: 'Stocks',     icon: Layers,          roles: ['admin', 'vendeur'] },
  { to: '/orders',     label: 'Commandes',  icon: ShoppingCart,    roles: ['admin', 'vendeur'] },
  { to: '/users',      label: 'Équipe',     icon: Users,           roles: ['admin'] },
  { to: '/logs',       label: 'Activité',   icon: Activity,        roles: ['admin', 'vendeur'] },
]

const superNav = [
  { to: '/super',            label: "Vue d'ensemble", icon: Globe },
  { to: '/super/admins',     label: 'Administrateurs', icon: Shield },
  { to: '/super/activity',   label: 'Activité',        icon: Activity },
  { to: '/super/settings',   label: 'Paramètres',      icon: Settings },
]

export default function Sidebar({ open, onClose }) {
  const { user, logout, myShops, activeShop, selectShop } = useAuth()
  const navigate = useNavigate()
  const [shopOpen, setShopOpen] = useState(false)

  const isSuper = user?.role === 'super'
  const nav = allNav.filter((n) => n.roles.includes(user?.role))

  const handleNav = () => {
    setShopOpen(false)
    onClose?.()
  }

  const switchShop = (shop) => {
    selectShop(shop)
    setShopOpen(false)
    onClose?.()
    navigate('/')
  }

  const goToShopSelect = () => {
    selectShop(null)
    onClose?.()
    navigate('/shop-select')
  }

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 w-64 lg:w-56 bg-brand-900 text-white flex flex-col
        transition-transform duration-200 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* Logo + close button mobile */}
      <div className="px-5 py-4 border-b border-brand-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-brand-500" />
          <span className="font-bold tracking-wide text-lg">O'Z</span>
        </div>
        <button
          className="lg:hidden p-1 text-brand-300 hover:text-white rounded"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Shop switcher — vendeurs only */}
      {user?.role === 'vendeur' && activeShop && (
        <div className="px-3 py-3 border-b border-brand-800">
          {myShops.length > 1 ? (
            <div className="relative">
              <button
                onClick={() => setShopOpen(!shopOpen)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-brand-800 text-sm text-white hover:bg-brand-700 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Store className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                  <span className="truncate">{activeShop.shopName}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-brand-400 shrink-0 transition-transform ${shopOpen ? 'rotate-180' : ''}`} />
              </button>
              {shopOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
                  {myShops.map((s) => (
                    <button
                      key={s.shopID}
                      onClick={() => switchShop(s)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        s.shopID === activeShop.shopID
                          ? 'bg-brand-50 text-brand-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {s.shopName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-brand-200">
              <Store className="w-3.5 h-3.5 text-brand-400 shrink-0" />
              <span className="truncate">{activeShop.shopName}</span>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {isSuper ? (
          <>
            <p className="px-3 pt-1 pb-2 text-xs font-semibold text-brand-400 uppercase tracking-widest">Plateforme</p>
            {superNav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/super'}
                onClick={handleNav}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-brand-700 text-white' : 'text-brand-200 hover:bg-brand-800 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </>
        ) : (
          nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={handleNav}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-700 text-white' : 'text-brand-200 hover:bg-brand-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-brand-800">
        <div className="px-3 py-2 mb-1">
          <p className="text-xs font-medium text-white truncate">{user?.name || user?.email}</p>
          <p className="text-xs text-brand-400 capitalize">{user?.role}</p>
        </div>
        <NavLink
          to="/profile"
          onClick={handleNav}
          className={({ isActive }) =>
            `flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-brand-700 text-white' : 'text-brand-200 hover:bg-brand-800 hover:text-white'
            }`
          }
        >
          <UserCircle className="w-4 h-4" />
          Mon profil
        </NavLink>
        {user?.role === 'vendeur' && (
          <button
            onClick={goToShopSelect}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-brand-200 hover:bg-brand-800 hover:text-white transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Changer de boutique
          </button>
        )}
        <button
          onClick={() => { logout(); onClose?.() }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-brand-200 hover:bg-brand-800 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
