import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Users, Store, ShoppingCart, TrendingUp, UserPlus, Award, Download,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import * as XLSX from 'xlsx'
import { getGlobalStats, getAnalytics } from '../api/super'
import DateRangeFilter from '../components/DateRangeFilter'
import Spinner from '../components/Spinner'

const fmt    = (n) => new Intl.NumberFormat('fr-FR').format(n ?? 0)
const money  = (n) => `${fmt(n)} FCFA`
const fmtDay = (d) => { const [,m,j] = (d || '').split('-'); return `${j}/${m}` }

const STATUS_COLORS  = { PENDING:'#f59e0b', CONFIRMED:'#3b82f6', DELIVERED:'#22c55e', CANCELLED:'#ef4444' }
const STATUS_LABELS  = { PENDING:'En attente', CONFIRMED:'Confirmées', DELIVERED:'Livrées', CANCELLED:'Annulées' }
const PAYMENT_COLORS = ['#6366f1','#f97316','#22c55e','#06b6d4','#a855f7','#f43f5e']
const PAYMENT_LABELS = { ESPECES:'Espèces', ORANGE_MONEY:'Orange Money', MTN_MOMO:'MTN MoMo', WAVE:'Wave', CREDIT:'Crédit', AUTRE:'Autre' }
const PALETTE        = ['#6366f1','#22c55e','#f59e0b','#ef4444','#06b6d4','#a855f7']

function Tip({ active, payload, label, money: isMoney }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-lg px-3 py-2 text-sm">
      <p className="font-medium text-gray-600 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.stroke }}>
          {p.name}: <strong>{isMoney ? money(p.value) : fmt(p.value)}</strong>
        </p>
      ))}
    </div>
  )
}

function KpiCard({ label, value, sub, delta, color = 'brand', icon: Icon }) {
  const bg = { brand:'bg-brand-50 text-brand-600', green:'bg-green-50 text-green-600', yellow:'bg-yellow-50 text-yellow-600', red:'bg-red-50 text-red-600' }
  const pos = delta === undefined ? null : delta >= 0
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${bg[color]}`}><Icon className="w-5 h-5" /></div>
        {delta !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${pos ? 'text-green-600' : 'text-red-500'}`}>
            {pos ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

export default function SuperDashboard() {
  const [dateRange, setDateRange] = useState({ dateFrom: '', dateTo: '' })
  const { dateFrom, dateTo } = dateRange

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['super-stats'],
    queryFn: getGlobalStats,
  })

  const { data: analytics, isLoading: loadingA } = useQuery({
    queryKey: ['super-analytics', dateFrom, dateTo],
    queryFn: () => getAnalytics(dateFrom, dateTo),
  })

  const isLoading = loadingStats || loadingA

  const exportExcel = () => {
    const wb = XLSX.utils.book_new()
    const s = stats || {}
    const a = analytics || {}

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Indicateur', 'Valeur'],
      ['Administrateurs', s.total_admins],
      ['Boutiques', s.total_shops],
      ['Vendeurs', s.total_vendeurs],
      ['Commandes totales', s.total_orders],
      ['Chiffre d\'affaires total', s.total_revenue],
      ['Nouveaux admins (30j)', s.new_admins_30d],
      ['Nouvelles commandes (30j)', s.new_orders_30d],
      ['CA 30 derniers jours', s.revenue_30d],
    ]), 'Résumé')

    if ((a.revenue_evolution || []).length)
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Date', 'CA FCFA', 'Commandes'],
        ...(a.revenue_evolution || []).map(d => [d.day, d.revenue, d.orders]),
      ]), 'Évolution CA')

    if ((a.revenue_by_admin || []).length)
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Admin', 'CA FCFA', 'Commandes'],
        ...(a.revenue_by_admin || []).map(r => [r.admin_name, r.revenue, r.orders]),
      ]), 'CA par admin')

    if ((s.top_admins || []).length)
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Admin', 'Email', 'Boutiques', 'Vendeurs', 'Commandes', 'CA FCFA'],
        ...(s.top_admins || []).map(a => [a.username, a.email, a.shop_count, a.vendeur_count, a.order_count, a.revenue]),
      ]), 'Top admins')

    XLSX.writeFile(wb, `super_dashboard_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  if (isLoading) return <div className="flex justify-center mt-20"><Spinner /></div>

  const s = stats || {}
  const a = analytics || {}

  const evoData    = (a.revenue_evolution || []).map(d => ({ day: fmtDay(d.day), CA: d.revenue, Commandes: d.orders }))
  const adminData  = (a.revenue_by_admin || []).map(r => ({ name: r.admin_name, CA: r.revenue, Commandes: r.orders }))
  const statusData = Object.entries(a.orders_by_status || {}).map(([k, v]) => ({ name: STATUS_LABELS[k] || k, value: v, color: STATUS_COLORS[k] || '#94a3b8' }))
  const pmData     = (a.payment_breakdown || []).map(p => ({ name: PAYMENT_LABELS[p.method] || p.method, value: p.revenue, count: p.count }))
  const regData    = (a.registration_trend || []).map(d => ({ day: fmtDay(d.day), Inscriptions: d.count }))

  const totalOrders = Object.values(a.orders_by_status || {}).reduce((acc, v) => acc + v, 0)

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vue d'ensemble plateforme</h1>
          <p className="text-sm text-gray-500 mt-0.5">Statistiques globales de tous les administrateurs</p>
        </div>
        <button className="btn-secondary flex items-center gap-2" onClick={exportExcel}>
          <Download className="w-4 h-4" /> Exporter Excel
        </button>
      </div>

      {/* Filtre date (s'applique aux analytics) */}
      <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChange={setDateRange} />

      {/* KPIs permanents (toutes périodes) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Administrateurs"       value={fmt(s.total_admins)}   sub={`+${s.new_admins_30d ?? 0} ce mois`}      icon={Users}         color="brand" />
        <KpiCard label="Boutiques actives"     value={fmt(s.total_shops)}    icon={Store}           color="green" />
        <KpiCard label="Vendeurs"              value={fmt(s.total_vendeurs)} icon={UserPlus}        color="yellow" />
        <KpiCard label="Commandes totales"     value={fmt(s.total_orders)}   sub={`+${fmt(s.new_orders_30d ?? 0)} ce mois`} icon={ShoppingCart}  color="red" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <KpiCard label="Chiffre d'affaires total"    value={money(s.total_revenue)} icon={TrendingUp} color="green" />
        <KpiCard label="Revenus 30 derniers jours"   value={money(s.revenue_30d)}   icon={TrendingUp} color="brand" />
      </div>

      {/* Évolution CA */}
      {evoData.length > 0 && (
        <Section title={`Évolution du chiffre d'affaires${dateFrom ? '' : ' (30 derniers jours)'}`}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={evoData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gCA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip content={<Tip money />} />
              <Area type="monotone" dataKey="CA" stroke="#6366f1" fill="url(#gCA)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Section>
      )}

      {/* CA par admin + statuts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {adminData.length > 0 && (
          <Section title="CA par administrateur (top 15)">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={adminData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip content={<Tip money />} />
                <Bar dataKey="CA" radius={[0, 4, 4, 0]}>
                  {adminData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}

        {statusData.length > 0 && (
          <Section title={`Répartition commandes par statut${totalOrders ? ` (${fmt(totalOrders)})` : ''}`}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Section>
        )}
      </div>

      {/* Paiements + inscriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pmData.length > 0 && (
          <Section title="Répartition par mode de paiement">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pmData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90}>
                  {pmData.map((_, i) => <Cell key={i} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v, n, p) => [`${money(v)} (${p.payload.count} cmd)`, n]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Section>
        )}

        {regData.length > 0 && (
          <Section title={`Nouvelles inscriptions administrateurs${dateFrom ? '' : ' (30 derniers jours)'}`}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={regData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<Tip />} />
                <Line type="monotone" dataKey="Inscriptions" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: '#22c55e' }} />
              </LineChart>
            </ResponsiveContainer>
          </Section>
        )}
      </div>

      {/* Top 10 admins */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Award className="w-5 h-5 text-brand-500" />
          <h2 className="font-semibold text-gray-800">Top 10 administrateurs (tous temps)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Admin</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Boutiques</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Vendeurs</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Commandes</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Revenus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(s.top_admins || []).map((adm, i) => (
                <tr key={adm.uuid} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium" style={{ color: PALETTE[i % PALETTE.length] }}>{i + 1}</td>
                  <td className="px-6 py-3">
                    <p className="font-medium text-gray-900">{adm.firstname} {adm.lastname}</p>
                    <p className="text-xs text-gray-400">@{adm.username} · {adm.email}</p>
                  </td>
                  <td className="px-6 py-3 text-center text-gray-700">{adm.shop_count}</td>
                  <td className="px-6 py-3 text-center text-gray-700">{adm.vendeur_count}</td>
                  <td className="px-6 py-3 text-center text-gray-700">{fmt(adm.order_count)}</td>
                  <td className="px-6 py-3 text-right font-semibold text-green-700">{money(adm.revenue)}</td>
                </tr>
              ))}
              {!(s.top_admins || []).length && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Aucune donnée</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
