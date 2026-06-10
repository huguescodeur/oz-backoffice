import { useState } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import NotificationBell from './NotificationBell'

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Spacer desktop — pousse le contenu à droite de la sidebar fixe */}
      <div className="hidden lg:block w-56 shrink-0" />

      {/* Sidebar (fixed, overlay sur mobile, toujours visible lg+) */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-gray-100 flex items-center px-4 gap-3 shrink-0 sticky top-0 z-20">
          {/* Hamburger — mobile seulement */}
          <button
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <NotificationBell />
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
