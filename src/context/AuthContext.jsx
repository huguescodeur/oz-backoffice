import { createContext, useContext, useState, useCallback } from 'react'
import { login as apiLogin } from '../api/auth'

const AuthContext = createContext(null)

function loadLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback }
  catch { return fallback }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadLS('oz_user', null))
  const [myShops, setMyShopsState] = useState(() => loadLS('oz_my_shops', []))
  const [activeShop, setActiveShopState] = useState(() => loadLS('oz_active_shop', null))

  const login = useCallback(async (identifier, password) => {
    const data = await apiLogin(identifier, password)
    localStorage.setItem('oz_token', data.token)
    localStorage.setItem('oz_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }, [])

  const setShops = useCallback((shops) => {
    setMyShopsState(shops)
    localStorage.setItem('oz_my_shops', JSON.stringify(shops))
  }, [])

  const selectShop = useCallback((shop) => {
    setActiveShopState(shop)
    localStorage.setItem('oz_active_shop', JSON.stringify(shop))
  }, [])

  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const updated = { ...prev, ...patch }
      localStorage.setItem('oz_user', JSON.stringify(updated))
      return updated
    })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('oz_token')
    localStorage.removeItem('oz_user')
    localStorage.removeItem('oz_my_shops')
    localStorage.removeItem('oz_active_shop')
    setUser(null)
    setMyShopsState([])
    setActiveShopState(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      user, login, logout, updateUser, isAuthenticated: !!user,
      myShops, setShops, activeShop, selectShop,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
