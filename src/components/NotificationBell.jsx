import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getNotifications } from '../api/dashboard'
import { Bell, Clock, Package, CheckCheck } from 'lucide-react'

const fmt = (v) => new Intl.NumberFormat('fr-FR').format(v ?? 0) + ' XAF'
const DISMISS_KEY = 'oz_dismissed_notifs'
const DISMISS_TTL = 24 * 60 * 60 * 1000 // 24h

function getDismissed() {
  try {
    const raw = JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}')
    const now = Date.now()
    // Purger les entrées expirées
    return Object.fromEntries(Object.entries(raw).filter(([, ts]) => now - ts < DISMISS_TTL))
  } catch { return {} }
}

function saveDismissed(map) {
  localStorage.setItem(DISMISS_KEY, JSON.stringify(map))
}

function notifKey(type, item) {
  return type === 'ls'
    ? `ls_${item.product_name}_${item.shop_id}`
    : `po_${item.uuid}`
}

export default function NotificationBell() {
  const { user, activeShop } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(getDismissed)
  const ref = useRef(null)

  const isVendeur = user?.role === 'vendeur'
  const shopID = isVendeur ? activeShop?.shopID : undefined

  const { data } = useQuery({
    queryKey: ['notifications', shopID],
    queryFn: () => getNotifications(shopID),
    refetchInterval: 60_000,
  })

  // Fermer au clic extérieur
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isDismissed = (type, item) => !!dismissed[notifKey(type, item)]

  const dismissAll = useCallback(() => {
    const now = Date.now()
    const map = { ...dismissed }
    ;(data?.low_stock || []).forEach((s) => { map[notifKey('ls', s)] = now })
    ;(data?.pending_orders || []).forEach((o) => { map[notifKey('po', o)] = now })
    saveDismissed(map)
    setDismissed(map)
  }, [data, dismissed])

  const allLow    = (data?.low_stock      || []).filter((s) => !isDismissed('ls', s))
  const allPending = (data?.pending_orders || []).filter((o) => !isDismissed('po', o))
  const total = allLow.length + allPending.length

  const goTo = (path) => { navigate(path); setOpen(false) }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {total > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">Notifications</span>
            {total > 0 && (
              <button
                onClick={dismissAll}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand-600 transition-colors"
                title="Marquer tout comme lu (masqué 24h)"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Tout marquer lu
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {total === 0 && (
              <div className="py-8 text-center text-gray-400 text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                Aucune alerte
              </div>
            )}

            {allLow.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-red-50 flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs font-semibold text-red-600">Stock faible ({allLow.length})</span>
                </div>
                {allLow.map((s, i) => (
                  <button key={i} onClick={() => goTo('/stocks')} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    <p className="text-sm font-medium text-gray-800">{s.product_name}</p>
                    <p className="text-xs text-gray-500">{s.shop_name} — {s.quantity} en stock (seuil : {s.min_stock})</p>
                  </button>
                ))}
              </div>
            )}

            {allPending.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-yellow-50 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-yellow-600" />
                  <span className="text-xs font-semibold text-yellow-700">En attente &gt;24h ({allPending.length})</span>
                </div>
                {allPending.map((o, i) => (
                  <button key={i} onClick={() => goTo('/orders')} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    <p className="text-sm font-medium text-gray-800">{o.shop_name || 'Boutique'}</p>
                    <p className="text-xs text-gray-500">{fmt(o.total_amount)} — en attente depuis {o.hours_pending}h</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400 text-center">
              Les alertes disparaissent automatiquement une fois résolues
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
