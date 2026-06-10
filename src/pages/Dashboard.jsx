import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDashboard } from '../api/dashboard'
import { useAuth } from '../context/AuthContext'
import StatCard from '../components/StatCard'
import Spinner from '../components/Spinner'
import DateRangeFilter from '../components/DateRangeFilter'
import {
  TrendingUp, ShoppingCart, Store, AlertTriangle,
  Package, Wallet, ArrowUpRight, ArrowDownRight, Download,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'

const STATUS_COLORS  = { PENDING:'#f59e0b', CONFIRMED:'#3b82f6', DELIVERED:'#22c55e', CANCELLED:'#ef4444' }
const STATUS_LABELS  = { PENDING:'En attente', CONFIRMED:'Confirmées', DELIVERED:'Livrées', CANCELLED:'Annulées' }
const PAYMENT_COLORS = ['#6366f1','#f97316','#22c55e','#06b6d4','#a855f7','#f43f5e']
const PAYMENT_LABELS = { ESPECES:'Espèces', ORANGE_MONEY:'Orange Money', MTN_MOMO:'MTN MoMo', WAVE:'Wave', CREDIT:'Crédit', AUTRE:'Autre' }

const fmt    = (v) => new Intl.NumberFormat('fr-FR').format(v ?? 0) + ' XAF'
const fmtK   = (v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)
const fmtDay = (d) => { const [,m,j] = d.split('-'); return `${j}/${m}` }

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.name === 'CA' ? fmt(p.value) : p.value}</strong></p>
      ))}
    </div>
  )
}

function KpiCard({ label, value, sub, delta, color = 'brand', icon: Icon }) {
  const bg = { brand:'bg-brand-50 text-brand-600', green:'bg-green-50 text-green-600', yellow:'bg-yellow-50 text-yellow-600', red:'bg-red-50 text-red-600' }
  const positive = delta === undefined ? null : delta >= 0
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div className={`p-2 sm:p-2.5 rounded-lg ${bg[color]}`}><Icon className="w-4 h-4 sm:w-5 sm:h-5" /></div>
        {delta !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${positive ? 'text-green-600' : 'text-red-500'}`}>
            {positive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight leading-tight">{value}</p>
      <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1 truncate">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const { user, activeShop } = useAuth()
  const shopID = user?.role === 'vendeur' ? activeShop?.shopID : undefined
  const [dateRange, setDateRange] = useState({ dateFrom: '', dateTo: '' })
  const { dateFrom, dateTo } = dateRange
  const hasDateFilter = !!(dateFrom || dateTo)
  const [topSort, setTopSort]   = useState('qty')  // 'qty' | 'revenue' | 'score'
  const [topLimit, setTopLimit] = useState(5)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', shopID, dateFrom, dateTo],
    queryFn: () => getDashboard(shopID, dateFrom, dateTo),
    refetchInterval: hasDateFilter ? false : 30_000,
  })

  const sortedTopProducts = useMemo(() => {
    const all = data?.top_products || []
    const maxQty = Math.max(...all.map((p) => p.total_qty), 1)
    const maxRev = Math.max(...all.map((p) => p.revenue), 1)
    const sorted = [...all].sort((a, b) => {
      if (topSort === 'qty')     return b.total_qty - a.total_qty
      if (topSort === 'revenue') return b.revenue - a.revenue
      // score combiné : moyenne normalisée qty + revenue
      const scoreA = (a.total_qty / maxQty + a.revenue / maxRev) / 2
      const scoreB = (b.total_qty / maxQty + b.revenue / maxRev) / 2
      return scoreB - scoreA
    })
    return sorted.slice(0, topLimit)
  }, [data, topSort, topLimit])

  const exportExcel = () => {
    const s = data || {}
    const wb = XLSX.utils.book_new()

    const kpis = [
      ['Indicateur', 'Valeur'],
      ["Chiffre d'affaires total", s.revenue_total || 0],
      ["CA aujourd'hui", s.revenue_today || 0],
      ['CA ce mois', s.revenue_this_month || 0],
      ['Total commandes', s.total_orders || 0],
      ['Valeur stock', s.stock_value || 0],
      ['Alertes stock faible', s.low_stock_count || 0],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpis), 'KPIs')

    if ((s.top_products || []).length) {
      const rows = [['Produit', 'Qté vendue', 'Revenu XAF'],
        ...s.top_products.map((p) => [p.product_name, p.total_qty, p.revenue])]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Top produits')
    }
    if ((s.revenue_by_shop || []).length) {
      const rows = [['Boutique', 'CA XAF'],
        ...s.revenue_by_shop.map((r) => [r.shop_name, r.revenue])]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'CA par boutique')
    }
    if ((s.payment_breakdown || []).length) {
      const labels = { ESPECES:'Espèces', ORANGE_MONEY:'Orange Money', MTN_MOMO:'MTN MoMo', WAVE:'Wave', CREDIT:'Crédit', AUTRE:'Autre' }
      const rows = [['Mode paiement', 'Nb commandes', 'Revenu XAF'],
        ...s.payment_breakdown.map((p) => [labels[p.method] || p.method, p.count, p.revenue])]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Paiements')
    }
    if ((s.revenue_evolution || []).length) {
      const rows = [['Date', 'CA XAF', 'Commandes'],
        ...s.revenue_evolution.map((d) => [d.day, d.revenue, d.orders])]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Évolution')
    }

    const suffix = dateFrom && dateTo ? `_${dateFrom}_${dateTo}` : ''
    XLSX.writeFile(wb, `dashboard${suffix}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  )

  const s = data || {}
  const evolution = (s.revenue_evolution || []).map(d => ({ day: fmtDay(d.day), CA: d.revenue, Commandes: d.orders }))
  const statusData = Object.entries(s.orders_by_status || {}).map(([k, v]) => ({ name: STATUS_LABELS[k] || k, value: v, color: STATUS_COLORS[k] }))
  const shopData   = (s.revenue_by_shop || []).map(r => ({ name: r.shop_name, CA: r.revenue }))
  const pmData     = (s.payment_breakdown || []).map(p => ({ name: PAYMENT_LABELS[p.method] || p.method, value: p.revenue, count: p.count }))
  const totalOrders = Object.values(s.orders_by_status || {}).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeShop ? activeShop.shopName : "Vue d'ensemble de votre activité"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!hasDateFilter && (
            <span className="hidden sm:inline text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
              Mise à jour auto toutes les 30s
            </span>
          )}
          <button className="btn-secondary" onClick={exportExcel} disabled={!data}>
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exporter</span>
          </button>
        </div>
      </div>

      {/* Filtre date */}
      <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChange={setDateRange} />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={hasDateFilter ? 'CA sur la période' : "Chiffre d'affaires total"}
          value={fmt(s.revenue_total)}
          sub={hasDateFilter ? `${totalOrders} commande(s)` : `Ce mois : ${fmt(s.revenue_this_month)}`}
          icon={TrendingUp}
          color="brand"
        />
        <KpiCard
          label={hasDateFilter ? 'CA livré période' : "CA aujourd'hui"}
          value={fmt(hasDateFilter ? s.revenue_total : s.revenue_today)}
          sub={hasDateFilter ? 'commandes livrées' : `${totalOrders} commandes au total`}
          icon={Wallet}
          color="green"
        />
        <KpiCard
          label="Boutiques actives"
          value={s.shop_count || 0}
          sub={`Valeur stock : ${fmt(s.stock_value)}`}
          icon={Store}
          color="brand"
        />
        <KpiCard
          label="Alertes stock faible"
          value={s.low_stock_count || 0}
          sub={s.low_stock_count > 0 ? 'Action requise' : 'Tout va bien'}
          icon={AlertTriangle}
          color={s.low_stock_count > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Évolution du CA */}
      {evolution.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Évolution du CA — 30 derniers jours</h2>
            <span className="text-xs text-gray-400">(commandes livrées)</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={evolution} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtK} width={42} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="CA" name="CA" stroke="#6366f1" strokeWidth={2} fill="url(#caGrad)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Ligne 2 : Statuts + Paiements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {statusData.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Statut des commandes</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} cx="40%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={2}>
                  {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconType="circle"
                  iconSize={8}
                  formatter={(val, entry) => (
                    <span className="text-xs text-gray-600">{val} <strong>({entry.payload.value})</strong></span>
                  )}
                />
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {pmData.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Modes de paiement (CA livré)</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pmData} cx="40%" cy="50%" outerRadius={90} dataKey="value" paddingAngle={2}>
                  {pmData.map((e, i) => <Cell key={i} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />)}
                </Pie>
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconType="circle"
                  iconSize={8}
                  formatter={(val, entry) => (
                    <span className="text-xs text-gray-600">{val}<br /><strong>{fmt(entry.payload.value)}</strong></span>
                  )}
                />
                <Tooltip formatter={(v) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* CA par boutique */}
      {shopData.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">CA par boutique</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={shopData} layout="vertical" margin={{ top: 0, right: 40, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmtK} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={110} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Bar dataKey="CA" fill="#6366f1" radius={[0, 6, 6, 0]}>
                {shopData.map((_, i) => <Cell key={i} fill={['#6366f1','#818cf8','#a5b4fc'][i % 3]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Commandes journalières */}
      {evolution.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Nombre de commandes livrées / jour</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={evolution} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={28} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Commandes" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top produits */}
      {(s.top_products || []).length > 0 && (
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700">
                  Top {topLimit} produits
                  {hasDateFilter && <span className="ml-1 font-normal text-gray-400">(période filtrée)</span>}
                </h2>
              </div>
              {/* Contrôle Top N */}
              <div className="flex items-center gap-1 text-xs">
                {[5, 10].map((n) => (
                  <button key={n}
                    onClick={() => setTopLimit(n)}
                    className={`px-2 py-1 rounded font-medium transition-colors ${topLimit === n ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-gray-700'}`}
                  >Top {n}</button>
                ))}
              </div>
            </div>
            {/* Tri */}
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'qty',     label: 'Quantité vendue' },
                { key: 'revenue', label: 'Chiffre d\'affaires' },
                { key: 'score',   label: 'Qté + CA combinés' },
              ].map(({ key, label }) => (
                <button key={key}
                  onClick={() => setTopSort(key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    topSort === key
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'text-gray-500 border-gray-200 hover:border-brand-400 hover:text-brand-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="table-th">#</th>
                <th className="table-th">Produit</th>
                <th className={`table-th text-right cursor-pointer hover:text-brand-600 ${topSort === 'qty' ? 'text-brand-600' : ''}`}
                    onClick={() => setTopSort('qty')}>
                  Qté {topSort === 'qty' && '▼'}
                </th>
                <th className={`table-th text-right cursor-pointer hover:text-brand-600 ${topSort === 'revenue' ? 'text-brand-600' : ''}`}
                    onClick={() => setTopSort('revenue')}>
                  CA {topSort === 'revenue' && '▼'}
                </th>
                <th className="table-th">Part CA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedTopProducts.map((p, i) => {
                const revTotal = s.top_products?.reduce((sum, x) => sum + x.revenue, 0) || s.revenue_total || 1
                const pct = revTotal > 0 ? Math.round((p.revenue / revTotal) * 100) : 0
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="table-td text-gray-400 font-mono">#{i+1}</td>
                    <td className="table-td font-medium">{p.product_name}</td>
                    <td className={`table-td text-right font-mono ${topSort === 'qty' ? 'text-brand-700 font-bold' : 'text-gray-600'}`}>
                      {p.total_qty}
                    </td>
                    <td className={`table-td text-right font-medium ${topSort === 'revenue' ? 'text-green-700 font-bold' : 'text-green-700'}`}>
                      {fmt(p.revenue)}
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
