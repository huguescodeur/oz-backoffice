import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Search, Download } from 'lucide-react'
import { getGlobalLogs } from '../api/super'
import DateRangeFilter from '../components/DateRangeFilter'
import Pagination from '../components/Pagination'
import Spinner from '../components/Spinner'
import * as XLSX from 'xlsx'

const LIMIT = 50

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

export default function SuperActivity() {
  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState('')
  const [filterType, setFilter] = useState('')
  const [dateRange, setDateRange] = useState({ dateFrom: '', dateTo: '' })
  const { dateFrom, dateTo } = dateRange

  const { data, isLoading } = useQuery({
    queryKey: ['super-logs', page, dateFrom, dateTo, filterType],
    queryFn: () => getGlobalLogs(LIMIT, (page - 1) * LIMIT, dateFrom, dateTo, filterType),
    keepPreviousData: true,
  })

  const rawLogs = data?.logs || []
  const total   = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const logs = search
    ? rawLogs.filter((l) => {
        const q = search.toLowerCase()
        return (
          (l.product_name || '').toLowerCase().includes(q) ||
          (l.shop_name    || '').toLowerCase().includes(q) ||
          (l.admin_name   || '').toLowerCase().includes(q) ||
          (l.username     || '').toLowerCase().includes(q) ||
          (l.comment      || '').toLowerCase().includes(q)
        )
      })
    : rawLogs

  const exportExcel = () => {
    const rows = rawLogs.map((l) => ({
      Date:      fmtDate(l.created_at),
      Type:      TYPE_CONFIG[l.movement_type]?.label || l.movement_type,
      Produit:   l.product_name,
      Boutique:  l.shop_name,
      Admin:     l.admin_name,
      Acteur:    l.username,
      Quantité:  l.quantity_change,
      Commentaire: l.comment,
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Activité globale')
    XLSX.writeFile(wb, `activite_plateforme_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-brand-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Activité globale</h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} mouvement{total > 1 ? 's' : ''} enregistré{total > 1 ? 's' : ''}</p>
          </div>
        </div>
        <button className="btn-secondary flex items-center gap-2" onClick={exportExcel} disabled={!rawLogs.length}>
          <Download className="w-4 h-4" /> Exporter
        </button>
      </div>

      {/* Filtres */}
      <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChange={(r) => { setDateRange(r); setPage(1) }} />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9 w-full"
            placeholder="Produit, boutique, admin, acteur…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-44"
          value={filterType}
          onChange={(e) => { setFilter(e.target.value); setPage(1) }}
        >
          <option value="">Tous les types</option>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Tableau */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Produit</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Boutique</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Admin</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acteur</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Qté</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Commentaire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((l) => (
                  <tr key={l.movement_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(l.created_at)}</td>
                    <td className="px-4 py-3"><TypeBadge type={l.movement_type} /></td>
                    <td className="px-4 py-3 font-medium text-gray-900">{l.product_name}</td>
                    <td className="px-4 py-3 text-gray-600">{l.shop_name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-brand-50 text-brand-700 font-medium">
                        @{l.admin_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{l.username || '—'}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${l.quantity_change > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {l.quantity_change > 0 ? '+' : ''}{l.quantity_change}
                    </td>
                    <td className="px-4 py-3 text-gray-400 italic max-w-xs truncate">{l.comment || '—'}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                      Aucune activité trouvée
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-6 pb-4">
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </div>
    </div>
  )
}
