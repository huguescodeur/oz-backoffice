import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getLogs } from '../api/logs'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/Spinner'
import Pagination from '../components/Pagination'
import { Activity, Search, Download } from 'lucide-react'
import DateRangeFilter from '../components/DateRangeFilter'
import * as XLSX from 'xlsx'

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

const TYPE_CONFIG = {
  SALE:       { label: 'Vente',         bg: 'bg-blue-100   text-blue-700'   },
  STOCK_IN:   { label: 'Entrée stock',  bg: 'bg-green-100  text-green-700'  },
  ADJUSTMENT: { label: 'Ajustement',    bg: 'bg-yellow-100 text-yellow-700' },
  GIFT:       { label: 'Don / Offert',  bg: 'bg-purple-100 text-purple-700' },
  LOSS:       { label: 'Perte',         bg: 'bg-red-100    text-red-700'    },
}

function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type] || { label: type, bg: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg}`}>
      {cfg.label}
    </span>
  )
}

export default function Logs() {
  const { user, activeShop } = useAuth()
  const isVendeur = user?.role === 'vendeur'
  const shopID = isVendeur ? activeShop?.shopID : undefined

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [dateRange, setDateRange] = useState({ dateFrom: '', dateTo: '' })

  const { dateFrom, dateTo } = dateRange
  const { data, isLoading } = useQuery({
    queryKey: ['logs', page, shopID, dateFrom, dateTo],
    queryFn: () => getLogs(page, 30, shopID, dateFrom, dateTo),
  })

  const logs = (data?.logs || []).filter((l) => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      (l.product_name || '').toLowerCase().includes(q) ||
      (l.shop_name || '').toLowerCase().includes(q) ||
      (l.username || '').toLowerCase().includes(q) ||
      (l.comment || '').toLowerCase().includes(q)
    const matchType = !filterType || l.movement_type === filterType
    return matchSearch && matchType
  })

  const exportExcel = () => {
    const rows = logs.map((l) => ({
      Date:       fmtDate(l.created_at),
      Type:       TYPE_CONFIG[l.movement_type]?.label || l.movement_type,
      Produit:    l.product_name,
      Boutique:   l.shop_name,
      Utilisateur: l.username,
      Quantité:   l.quantity_change,
      Commentaire: l.comment,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Logs')
    XLSX.writeFile(wb, `logs_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Activité</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isVendeur
              ? `Mouvements de stock — ${activeShop?.shopName || ''}`
              : 'Tous les mouvements de stock et ventes'}
          </p>
        </div>
        <button className="btn-secondary" onClick={exportExcel}>
          <Download className="w-4 h-4" /><span className="hidden sm:inline">Exporter</span>
        </button>
      </div>

      {/* Filtre date */}
      <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChange={(r) => { setDateRange(r); setPage(1) }} />

      {/* Filtres texte/type */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Produit, boutique, utilisateur, commentaire…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-48" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Tous les types</option>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="table-th">Date</th>
                <th className="table-th">Type</th>
                <th className="table-th">Produit</th>
                {!isVendeur && <th className="table-th">Boutique</th>}
                <th className="table-th text-center">Qté</th>
                <th className="table-th">Commentaire</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.length === 0 && (
                <tr>
                  <td colSpan={isVendeur ? 5 : 6} className="py-12 text-center text-gray-400">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                    Aucune activité enregistrée
                  </td>
                </tr>
              )}
              {logs.map((l) => {
                const sign = l.quantity_change >= 0 ? '+' : ''
                const qtyColor = l.quantity_change >= 0 ? 'text-green-600' : 'text-red-600'
                return (
                  <tr key={l.movement_id} className="hover:bg-gray-50">
                    <td className="table-td text-xs text-gray-400 whitespace-nowrap">{fmtDate(l.created_at)}</td>
                    <td className="table-td"><TypeBadge type={l.movement_type} /></td>
                    <td className="table-td font-medium">{l.product_name}</td>
                    {!isVendeur && <td className="table-td text-gray-500">{l.shop_name}</td>}
                    <td className={`table-td text-center font-mono font-semibold ${qtyColor}`}>
                      {sign}{l.quantity_change}
                    </td>
                    <td className="table-td text-gray-400 text-sm truncate max-w-xs">{l.comment || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table></div>
        )}
      </div>

      <Pagination page={page} totalPages={data?.total_pages || 1} onChange={setPage} />
    </div>
  )
}
