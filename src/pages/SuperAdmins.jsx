import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, Store, ShoppingCart, TrendingUp } from 'lucide-react'
import { getAdmins } from '../api/super'
import Pagination from '../components/Pagination'
import Spinner from '../components/Spinner'

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n)
const money = (n) => `${fmt(n)} FCFA`

const LIMIT = 20

export default function SuperAdmins() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['super-admins', page],
    queryFn: () => getAdmins(LIMIT, (page - 1) * LIMIT),
    keepPreviousData: true,
  })

  const admins = data?.admins ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administrateurs</h1>
          <p className="text-sm text-gray-500 mt-1">{total} compte{total > 1 ? 's' : ''} au total</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Admin</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Inscription</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">
                    <span className="flex items-center justify-center gap-1"><Store className="w-3.5 h-3.5" /> Boutiques</span>
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">
                    <span className="flex items-center justify-center gap-1"><Users className="w-3.5 h-3.5" /> Vendeurs</span>
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">
                    <span className="flex items-center justify-center gap-1"><ShoppingCart className="w-3.5 h-3.5" /> Commandes</span>
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">
                    <span className="flex items-center justify-end gap-1"><TrendingUp className="w-3.5 h-3.5" /> Revenus</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {admins.map((a) => (
                  <tr key={a.uuid} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{a.firstname} {a.lastname}</p>
                      <p className="text-xs text-gray-400">@{a.username}</p>
                      <p className="text-xs text-gray-400">{a.email}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(a.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                        {a.shop_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold">
                        {a.vendeur_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-700">{fmt(a.order_count)}</td>
                    <td className="px-6 py-4 text-right font-semibold text-green-700">{money(a.revenue)}</td>
                  </tr>
                ))}
                {admins.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      Aucun administrateur trouvé
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
