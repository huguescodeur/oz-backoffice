import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getShops } from '../api/shops'
import { getProducts } from '../api/products'
import { getStocks, getLowStocks, setMinStock, stockIn, adjustStock } from '../api/stocks'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import Field from '../components/Field'
import Spinner from '../components/Spinner'
import { AlertTriangle, Plus, Settings, Layers, Download, Search, SlidersHorizontal } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

const fmt = (v) => new Intl.NumberFormat('fr-FR').format(v ?? 0) + ' XAF'

export default function Stocks() {
  const qc = useQueryClient()
  const { user, activeShop } = useAuth()
  const isVendeur = user?.role === 'vendeur'
  const [shopId, setShopId] = useState(() =>
    isVendeur && activeShop ? String(activeShop.shopID) : ''
  )
  const [addModal, setAddModal]   = useState(false)
  const [adjModal, setAdjModal]   = useState(false)
  const [minModal, setMinModal]   = useState(null)
  const [addForm, setAddForm]     = useState({ product_id: '', quantity: '' })
  const [addErr, setAddErr]       = useState({})
  const [adjForm, setAdjForm]     = useState({ product_id: '', movement_type: 'LOSS', quantity: '', comment: '' })
  const [adjErr, setAdjErr]       = useState({})
  const [minValue, setMinValue]   = useState('')
  const [search, setSearch]       = useState('')

  const { data: shopsData } = useQuery({ queryKey: ['shops'], queryFn: () => getShops(1, 100) })
  const shops = shopsData?.shops || []

  const { data: prodsData } = useQuery({ queryKey: ['products', 1], queryFn: () => getProducts(1, 100) })
  const products = prodsData?.products || []

  const { data: stocksData, isLoading } = useQuery({
    queryKey: ['stocks', shopId],
    queryFn: () => getStocks(shopId),
    enabled: !!shopId,
  })
  const allStocks = stocksData?.stocks || []
  const stocks = allStocks.filter((s) =>
    !search || s.product_name?.toLowerCase().includes(search.toLowerCase())
  )

  const exportExcel = () => {
    const rows = stocks.map((s) => ({
      Produit:        s.product_name,
      Quantité:       s.quantity,
      'Seuil min':    s.min_stock,
      Statut:         s.low_stock ? 'Stock faible' : 'OK',
      'Valeur (XAF)': s.unit_price ? s.quantity * s.unit_price : '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Stocks')
    XLSX.writeFile(wb, `stocks_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  const { data: alertsData } = useQuery({
    queryKey: ['stocks-alerts', shopId],
    queryFn: () => getLowStocks(shopId || undefined),
  })
  const alerts = alertsData?.alerts || []

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['stocks'] })
    qc.invalidateQueries({ queryKey: ['stocks-alerts', shopId] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const addMut = useMutation({
    mutationFn: () => stockIn(Number(addForm.product_id), Number(shopId), Number(addForm.quantity)),
    onSuccess: () => { toast.success('Stock ajouté'); invalidate(); setAddModal(false); setAddForm({ product_id: '', quantity: '' }) },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  const adjMut = useMutation({
    mutationFn: () => {
      const qty = Number(adjForm.quantity)
      const signed = adjForm.movement_type === 'ADJUSTMENT' ? qty : -Math.abs(qty)
      return adjustStock(Number(adjForm.product_id), Number(shopId), signed, adjForm.movement_type, adjForm.comment)
    },
    onSuccess: () => {
      toast.success('Ajustement enregistré')
      invalidate()
      qc.invalidateQueries({ queryKey: ['logs'] })
      setAdjModal(false)
      setAdjForm({ product_id: '', movement_type: 'LOSS', quantity: '', comment: '' })
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  const minMut = useMutation({
    mutationFn: () => setMinStock(minModal.product_id, minModal.shop_id, Number(minValue)),
    onSuccess: () => { toast.success('Seuil mis à jour'); invalidate(); setMinModal(null) },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  const validateAdd = () => {
    const errs = {}
    if (!addForm.product_id) errs.product_id = 'Choisir un produit'
    if (!addForm.quantity || Number(addForm.quantity) < 1) errs.quantity = 'Quantité ≥ 1 requise'
    setAddErr(errs)
    return Object.keys(errs).length === 0
  }

  const validateAdj = () => {
    const errs = {}
    if (!adjForm.product_id) errs.product_id = 'Choisir un produit'
    if (!adjForm.quantity || Number(adjForm.quantity) === 0) errs.quantity = 'Quantité requise'
    if (adjForm.movement_type !== 'ADJUSTMENT' && Number(adjForm.quantity) < 1) errs.quantity = 'Quantité ≥ 1 requise'
    setAdjErr(errs)
    return Object.keys(errs).length === 0
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Stocks</h1>

      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-semibold text-red-700">{alerts.length} produit(s) en stock faible</span>
          </div>
          <div className="space-y-1">
            {alerts.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-sm text-red-700">
                <span>{s.product_name} — <span className="font-medium">{s.shop_name}</span></span>
                <span className="font-mono">{s.quantity} / seuil {s.min_stock}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        {isVendeur ? (
          <span className="inline-flex items-center gap-2 px-3 py-2 bg-brand-50 text-brand-700 rounded-lg text-sm font-medium border border-brand-200">
            {activeShop?.shopName || 'Boutique'}
          </span>
        ) : (
          <select className="input max-w-xs" value={shopId} onChange={(e) => { setShopId(e.target.value); setSearch('') }}>
            <option value="">— Sélectionner une boutique —</option>
            {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        {shopId && (
          <>
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="input pl-9" placeholder="Rechercher un produit…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button className="btn-secondary" onClick={exportExcel}>
              <Download className="w-4 h-4" /> Exporter
            </button>
            <button className="btn-secondary" onClick={() => setAdjModal(true)}>
              <SlidersHorizontal className="w-4 h-4" /> Ajustement
            </button>
            {!isVendeur && (
              <button className="btn-primary" onClick={() => setAddModal(true)}>
                <Plus className="w-4 h-4" /> Entrée de stock
              </button>
            )}
          </>
        )}
      </div>

      {!shopId && !isVendeur && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-300">
          <Layers className="w-14 h-14 mb-3" />
          <p className="text-gray-400">Sélectionnez une boutique pour voir son stock</p>
        </div>
      )}

      {shopId && (
        <div className="card">
          {isLoading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="table-th">Produit</th>
                  <th className="table-th text-right">Quantité</th>
                  <th className="table-th text-right">Seuil min</th>
                  <th className="table-th text-center">Statut</th>
                  <th className="table-th text-right">Valeur stock</th>
                  <th className="table-th w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stocks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-gray-400">
                      Aucun stock pour cette boutique
                    </td>
                  </tr>
                )}
                {stocks.map((s, i) => (
                  <tr key={i} className={`hover:bg-gray-50 ${s.low_stock ? 'bg-red-50/30' : ''}`}>
                    <td className="table-td font-medium">{s.product_name}</td>
                    <td className="table-td text-right font-mono text-gray-900">{s.quantity}</td>
                    <td className="table-td text-right font-mono text-gray-400">{s.min_stock}</td>
                    <td className="table-td text-center">
                      {s.low_stock
                        ? <span className="badge bg-red-100 text-red-700">Stock faible</span>
                        : <span className="badge bg-green-100 text-green-700">OK</span>}
                    </td>
                    <td className="table-td text-right text-gray-500 text-sm">
                      {s.unit_price ? fmt(s.quantity * s.unit_price) : '—'}
                    </td>
                    <td className="table-td">
                      <button
                        className="btn-ghost p-1.5"
                        title="Définir seuil"
                        onClick={() => { setMinModal(s); setMinValue(String(s.min_stock)) }}
                      >
                        <Settings className="w-4 h-4 text-gray-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      )}

      {/* Entrée de stock */}
      <Modal open={addModal} onClose={() => { setAddModal(false); setAddErr({}) }} title="Entrée de stock" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); if (validateAdd()) addMut.mutate() }} className="space-y-4" noValidate>
          <Field label="Produit" error={addErr.product_id} required>
            <select
              className="input"
              data-error={!!addErr.product_id}
              value={addForm.product_id}
              onChange={(e) => { setAddForm({ ...addForm, product_id: e.target.value }); setAddErr({ ...addErr, product_id: undefined }) }}
            >
              <option value="">— Choisir un produit —</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Quantité à ajouter" error={addErr.quantity} required>
            <input
              className="input"
              type="number"
              min="1"
              data-error={!!addErr.quantity}
              value={addForm.quantity}
              onChange={(e) => { setAddForm({ ...addForm, quantity: e.target.value }); setAddErr({ ...addErr, quantity: undefined }) }}
              placeholder="ex: 50"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" className="btn-secondary" onClick={() => { setAddModal(false); setAddErr({}) }}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={addMut.isPending}>
              {addMut.isPending ? 'En cours…' : 'Ajouter'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Ajustement manuel */}
      <Modal open={adjModal} onClose={() => { setAdjModal(false); setAdjErr({}) }} title="Ajustement de stock" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); if (validateAdj()) adjMut.mutate() }} className="space-y-4" noValidate>
          <Field label="Type de mouvement" required>
            <select
              className="input"
              value={adjForm.movement_type}
              onChange={(e) => setAdjForm({ ...adjForm, movement_type: e.target.value })}
            >
              <option value="LOSS">Perte (casse, vol, péremption)</option>
              <option value="GIFT">Don / Offert (cadeau client)</option>
              <option value="ADJUSTMENT">Correction inventaire (+ ou -)</option>
            </select>
          </Field>
          <Field label="Produit" error={adjErr.product_id} required>
            <select
              className="input"
              data-error={!!adjErr.product_id}
              value={adjForm.product_id}
              onChange={(e) => { setAdjForm({ ...adjForm, product_id: e.target.value }); setAdjErr({ ...adjErr, product_id: undefined }) }}
            >
              <option value="">— Choisir un produit —</option>
              {allStocks.map((s) => <option key={s.product_id} value={s.product_id}>{s.product_name}</option>)}
            </select>
          </Field>
          <Field
            label={adjForm.movement_type === 'ADJUSTMENT' ? 'Quantité (négatif pour retirer)' : 'Quantité perdue / offerte'}
            error={adjErr.quantity}
            required
          >
            <input
              className="input"
              type="number"
              min={adjForm.movement_type === 'ADJUSTMENT' ? undefined : '1'}
              data-error={!!adjErr.quantity}
              value={adjForm.quantity}
              onChange={(e) => { setAdjForm({ ...adjForm, quantity: e.target.value }); setAdjErr({ ...adjErr, quantity: undefined }) }}
              placeholder={adjForm.movement_type === 'ADJUSTMENT' ? 'ex: -5 ou +10' : 'ex: 3'}
            />
          </Field>
          <Field label="Commentaire">
            <input
              className="input"
              value={adjForm.comment}
              onChange={(e) => setAdjForm({ ...adjForm, comment: e.target.value })}
              placeholder="Raison de l'ajustement…"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" className="btn-secondary" onClick={() => { setAdjModal(false); setAdjErr({}) }}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={adjMut.isPending}>
              {adjMut.isPending ? 'En cours…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Seuil min */}
      <Modal open={!!minModal} onClose={() => setMinModal(null)} title="Seuil de stock minimum" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); minMut.mutate() }} className="space-y-4">
          <p className="text-sm font-medium text-gray-700">{minModal?.product_name}</p>
          <Field label="Quantité minimum" hint="Une alerte apparaît quand le stock passe sous ce seuil">
            <input className="input" type="number" min="0" value={minValue} onChange={(e) => setMinValue(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" className="btn-secondary" onClick={() => setMinModal(null)}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={minMut.isPending}>Enregistrer</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
