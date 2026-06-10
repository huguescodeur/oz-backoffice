import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOrders, createOrder, confirmOrder, deliverOrder, cancelOrder } from '../api/orders'
import { getShops } from '../api/shops'
import { getStocks } from '../api/stocks'
import { useAuth } from '../context/AuthContext'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import Spinner from '../components/Spinner'
import Pagination from '../components/Pagination'
import { Plus, Check, Truck, X, Eye, ShoppingBag, Clock, Download, Search, Printer } from 'lucide-react'
import DateRangeFilter from '../components/DateRangeFilter'
import { printDeliverySlip } from '../utils/printDeliverySlip'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

const PAYMENT_METHODS = ['ESPECES', 'ORANGE_MONEY', 'MTN_MOMO', 'WAVE', 'CREDIT', 'AUTRE']
const pmLabel = { ESPECES: 'Espèces', ORANGE_MONEY: 'Orange Money', MTN_MOMO: 'MTN MoMo', WAVE: 'Wave', CREDIT: 'Crédit', AUTRE: 'Autre' }
const fmt     = (v) => new Intl.NumberFormat('fr-FR').format(v ?? 0) + ' XAF'
const fmtDate = (d) => d ? new Date(d).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'

const emptyForm = {
  shop_id: '', customer_name: '', customer_phone: '',
  payment_method: 'ESPECES', notes: '', delivery_address: '',
  items: [{ product_id: '', quantity: '' }],
}

export default function Orders() {
  const qc = useQueryClient()
  const { user, activeShop } = useAuth()
  const isVendeur = user?.role === 'vendeur'
  const [page, setPage]             = useState(1)
  const [createModal, setCreateModal] = useState(false)
  const [detailOrder, setDetailOrder] = useState(null)
  const [form, setForm]           = useState(emptyForm)
  const [saleMode, setSaleMode]   = useState('direct') // 'direct' | 'order'
  const [formErrors, setFormErrors] = useState({})
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [dateRange, setDateRange] = useState({ dateFrom: '', dateTo: '' })

  const shopID = isVendeur ? activeShop?.shopID : undefined
  const { dateFrom, dateTo } = dateRange
  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, shopID, dateFrom, dateTo],
    queryFn: () => getOrders(page, 20, shopID, dateFrom, dateTo),
  })
  const orders     = data?.orders || []
  const totalPages = data?.total_pages || 1

  const { data: shopsData } = useQuery({ queryKey: ['shops'], queryFn: () => getShops(1, 100) })
  const shops = shopsData?.shops || []

  const { data: stocksData } = useQuery({
    queryKey: ['stocks', form.shop_id],
    queryFn: () => getStocks(form.shop_id),
    enabled: !!form.shop_id,
  })
  const availableProducts = stocksData?.stocks || []

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['orders'] })
    qc.invalidateQueries({ queryKey: ['stocks'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const createMut = useMutation({
    mutationFn: createOrder,
    onSuccess: (_, vars) => {
      const msg = vars.immediate_delivery ? '✓ Vente enregistrée' : 'Commande créée (en attente)'
      toast.success(msg)
      invalidate()
      setCreateModal(false)
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Stock insuffisant ou produit introuvable'),
  })

  const confirmMut = useMutation({
    mutationFn: confirmOrder,
    onSuccess: () => { toast.success('Commande confirmée'); invalidate() },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })
  const deliverMut = useMutation({
    mutationFn: deliverOrder,
    onSuccess: () => { toast.success('Commande marquée livrée'); invalidate() },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })
  const cancelMut = useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => { toast.success('Commande annulée — stock restauré'); invalidate() },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  const updateItem = (idx, field, val) => {
    const items = [...form.items]
    items[idx] = { ...items[idx], [field]: val }
    setForm({ ...form, items })
  }
  const addItem    = () => setForm({ ...form, items: [...form.items, { product_id: '', quantity: '' }] })
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })

  const validate = () => {
    const errs = {}
    if (!form.shop_id) errs.shop_id = 'Choisir une boutique'
    if (!form.payment_method) errs.payment_method = 'Mode de paiement requis'
    if (saleMode === 'order' && !form.customer_phone) errs.customer_phone = 'Téléphone requis pour une livraison'
    if (saleMode === 'order' && !form.delivery_address) errs.delivery_address = 'Adresse de livraison requise'
    const badItems = form.items.some((it) => !it.product_id || !it.quantity || Number(it.quantity) < 1)
    if (badItems) errs.items = 'Tous les articles doivent avoir un produit et une quantité ≥ 1'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const openCreate = () => {
    const initialShopId = isVendeur && activeShop ? String(activeShop.shopID) : ''
    setForm({ ...emptyForm, shop_id: initialShopId })
    setFormErrors({})
    setSaleMode('direct')
    setCreateModal(true)
  }

  const submit = (e) => {
    e.preventDefault()
    if (!validate()) return
    const payload = {
      shop_id:            Number(form.shop_id),
      customer_name:      form.customer_name,
      customer_phone:     form.customer_phone,
      payment_method:     form.payment_method,
      notes:              form.notes,
      delivery_address:   form.delivery_address,
      immediate_delivery: saleMode === 'direct',
      items: form.items.map((it) => ({
        product_id: Number(it.product_id),
        quantity:   Number(it.quantity),
      })),
    }
    createMut.mutate(payload)
  }

  const filteredOrders = orders.filter((o) => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      (o.customer_name || '').toLowerCase().includes(q) ||
      (o.customer_phone || '').toLowerCase().includes(q) ||
      (o.orderUUID || '').toLowerCase().includes(q)
    const matchStatus = !filterStatus || o.status === filterStatus
    return matchSearch && matchStatus
  })

  const exportExcel = () => {
    const rows = filteredOrders.map((o) => ({
      UUID:         o.orderUUID,
      Client:       o.customer_name || '',
      Téléphone:    o.customer_phone || '',
      Boutique:     o.shop_name || `#${o.shop_id}`,
      Paiement:     pmLabel[o.payment_method] || '',
      Montant:      o.total_amount,
      Statut:       o.status,
      Adresse:      o.delivery_address || '',
      Notes:        o.notes || '',
      Date:         fmtDate(o.created_at),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Commandes')
    XLSX.writeFile(wb, `commandes_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  const totalAmount = form.items.reduce((sum, it) => {
    const prod = availableProducts.find((p) => String(p.product_id) === String(it.product_id))
    return sum + (Number(it.quantity) * (prod?.unit_price || 0))
  }, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Commandes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total || 0} commandes au total</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={exportExcel}>
            <Download className="w-4 h-4" /> Exporter
          </button>
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Nouvelle vente
          </button>
        </div>
      </div>

      {/* Filtres */}
      <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChange={(r) => { setDateRange(r); setPage(1) }} />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Rechercher par client ou téléphone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-48" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="PENDING">En attente</option>
          <option value="CONFIRMED">Confirmé</option>
          <option value="DELIVERED">Livré</option>
          <option value="CANCELLED">Annulé</option>
        </select>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="table-th">Client</th>
                <th className="table-th">Boutique</th>
                <th className="table-th">Paiement</th>
                <th className="table-th text-right">Montant</th>
                <th className="table-th">Statut</th>
                <th className="table-th">Date</th>
                <th className="table-th w-28"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400">Aucune commande</td></tr>
              )}
              {filteredOrders.map((o) => (
                <tr key={o.orderUUID} className="hover:bg-gray-50">
                  <td className="table-td">
                    <p className="font-medium">{o.customer_name || <span className="text-gray-400 italic">Anonyme</span>}</p>
                    {o.customer_phone && <p className="text-xs text-gray-400">{o.customer_phone}</p>}
                  </td>
                  <td className="table-td text-gray-500">{o.shop_name || `Boutique #${o.shop_id}`}</td>
                  <td className="table-td text-gray-500">{pmLabel[o.payment_method] || '—'}</td>
                  <td className="table-td text-right font-medium">{fmt(o.total_amount)}</td>
                  <td className="table-td"><Badge value={o.status} /></td>
                  <td className="table-td text-gray-400 text-xs">{fmtDate(o.created_at)}</td>
                  <td className="table-td">
                    <div className="flex gap-1">
                      <button className="btn-ghost p-1.5" title="Détails" onClick={() => setDetailOrder(o)}>
                        <Eye className="w-4 h-4" />
                      </button>
                      {o.status === 'PENDING' && (
                        <button className="btn-ghost p-1.5 text-blue-600 hover:bg-blue-50" title="Confirmer" onClick={() => confirmMut.mutate(o.orderUUID)}>
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      {o.status === 'CONFIRMED' && (
                        <button className="btn-ghost p-1.5 text-green-600 hover:bg-green-50" title="Marquer livré" onClick={() => deliverMut.mutate(o.orderUUID)}>
                          <Truck className="w-4 h-4" />
                        </button>
                      )}
                      {(o.status === 'PENDING' || o.status === 'CONFIRMED') && (
                        <button
                          className="btn-ghost p-1.5 text-red-400 hover:bg-red-50"
                          title="Annuler"
                          onClick={() => { if (window.confirm('Annuler cette commande ? Le stock sera restauré.')) cancelMut.mutate(o.orderUUID) }}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {/* === MODAL CRÉATION === */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Nouvelle vente / commande" size="lg">
        <form onSubmit={submit} className="space-y-5" noValidate>

          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSaleMode('direct')}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                saleMode === 'direct'
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <ShoppingBag className={`w-6 h-6 shrink-0 ${saleMode === 'direct' ? 'text-brand-600' : 'text-gray-400'}`} />
              <div>
                <p className={`font-semibold text-sm ${saleMode === 'direct' ? 'text-brand-700' : 'text-gray-700'}`}>
                  Vente comptoir
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Client présent, paie et repart maintenant</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setSaleMode('order')}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                saleMode === 'order'
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Clock className={`w-6 h-6 shrink-0 ${saleMode === 'order' ? 'text-brand-600' : 'text-gray-400'}`} />
              <div>
                <p className={`font-semibold text-sm ${saleMode === 'order' ? 'text-brand-700' : 'text-gray-700'}`}>
                  Commande / livraison
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Réservation, crédit, ou livraison à faire</p>
              </div>
            </button>
          </div>

          {saleMode === 'direct' && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
              Vente comptoir → enregistrée directement comme <strong>Livrée</strong>. Stock débité immédiatement.
            </div>
          )}
          {saleMode === 'order' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-700">
              Commande → créée en <strong>Attente</strong>. À confirmer puis marquer livrée manuellement.
            </div>
          )}

          {/* Boutique + Paiement */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Boutique <span className="text-red-500">*</span></label>
              {isVendeur ? (
                <div className="input bg-gray-50 text-gray-700 cursor-default">
                  {activeShop?.shopName || '—'}
                </div>
              ) : (
                <select
                  className={`input ${formErrors.shop_id ? 'border-red-400' : ''}`}
                  value={form.shop_id}
                  onChange={(e) => setForm({ ...form, shop_id: e.target.value, items: [{ product_id: '', quantity: '' }] })}
                >
                  <option value="">— Choisir —</option>
                  {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
              {formErrors.shop_id && <p className="text-xs text-red-600 mt-1">{formErrors.shop_id}</p>}
            </div>
            <div>
              <label className="label">Paiement <span className="text-red-500">*</span></label>
              <select className="input" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{pmLabel[m]}</option>)}
              </select>
            </div>
          </div>

          {/* Client */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">
                Nom client{' '}
                {saleMode === 'order' && <span className="text-gray-400 font-normal text-xs">(recommandé)</span>}
              </label>
              <input className="input" placeholder="optionnel" value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            </div>
            <div>
              <label className="label">
                Téléphone client{saleMode === 'order' && <span className="text-red-500 ml-1">*</span>}
              </label>
              <input
                className={`input ${formErrors.customer_phone ? 'border-red-400' : ''}`}
                placeholder={saleMode === 'order' ? '0700000000' : 'optionnel'}
                value={form.customer_phone}
                onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
              />
              {formErrors.customer_phone && <p className="text-xs text-red-600 mt-1">{formErrors.customer_phone}</p>}
            </div>
          </div>

          {/* Adresse de livraison (delivery only) */}
          {saleMode === 'order' && (
            <div>
              <label className="label">Adresse de livraison <span className="text-red-500">*</span></label>
              <input
                className={`input ${formErrors.delivery_address ? 'border-red-400' : ''}`}
                placeholder="ex: Cocody Angré, rue des jardins…"
                value={form.delivery_address}
                onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
              />
              {formErrors.delivery_address && <p className="text-xs text-red-600 mt-1">{formErrors.delivery_address}</p>}
            </div>
          )}

          {/* Articles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Articles <span className="text-red-500">*</span></label>
              <button type="button" className="btn-ghost text-xs py-1 px-2" onClick={addItem}>+ Ajouter un article</button>
            </div>

            {!form.shop_id && (
              <p className="text-xs text-gray-400 italic">Choisissez d'abord une boutique pour voir les produits disponibles</p>
            )}

            {formErrors.items && <p className="text-xs text-red-600 mb-2">{formErrors.items}</p>}

            <div className="space-y-2">
              {form.items.map((item, idx) => {
                const prod = availableProducts.find((p) => String(p.product_id) === String(item.product_id))
                return (
                  <div key={idx} className="flex gap-2 items-center bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex-1">
                      <select
                        className="input bg-white text-sm"
                        value={item.product_id}
                        onChange={(e) => updateItem(idx, 'product_id', e.target.value)}
                      >
                        <option value="">— Produit —</option>
                        {availableProducts.map((p) => (
                          <option key={p.product_id} value={p.product_id} disabled={p.quantity === 0}>
                            {p.product_name} — {fmt(p.unit_price)} (stock: {p.quantity})
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      className="input bg-white w-20 text-sm text-center"
                      type="number"
                      min="1"
                      max={prod?.quantity || 9999}
                      placeholder="Qté"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                    />
                    {prod && item.quantity && (
                      <span className="text-sm font-medium text-gray-600 w-28 text-right shrink-0">
                        {fmt(Number(item.quantity) * prod.unit_price)}
                      </span>
                    )}
                    {form.items.length > 1 && (
                      <button type="button" className="btn-ghost p-1 text-gray-400" onClick={() => removeItem(idx)}>
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} placeholder="Remarques, instructions de livraison…"
              value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          {/* Total + bouton */}
          {totalAmount > 0 && (
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
              <span className="text-sm text-gray-600">Total</span>
              <span className="text-xl font-bold text-gray-900">{fmt(totalAmount)}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" className="btn-secondary" onClick={() => setCreateModal(false)}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={createMut.isPending}>
              {createMut.isPending
                ? 'Enregistrement…'
                : saleMode === 'direct'
                  ? '✓ Encaisser la vente'
                  : 'Créer la commande'}
            </button>
          </div>
        </form>
      </Modal>

      {/* === MODAL DÉTAIL === */}
      <Modal open={!!detailOrder} onClose={() => setDetailOrder(null)} title="Détail de la commande" size="md">
        {detailOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-gray-500 text-xs mb-1">Statut</p><Badge value={detailOrder.status} /></div>
              <div><p className="text-gray-500 text-xs mb-1">Paiement</p><p className="font-medium">{pmLabel[detailOrder.payment_method] || '—'}</p></div>
              <div><p className="text-gray-500 text-xs mb-1">Client</p><p className="font-medium">{detailOrder.customer_name || '—'}</p></div>
              <div><p className="text-gray-500 text-xs mb-1">Téléphone</p><p className="font-medium">{detailOrder.customer_phone || '—'}</p></div>
              <div><p className="text-gray-500 text-xs mb-1">Boutique</p><p className="font-medium">{detailOrder.shop_name || `#${detailOrder.shop_id}`}</p></div>
              <div><p className="text-gray-500 text-xs mb-1">Date</p><p className="font-medium">{fmtDate(detailOrder.created_at)}</p></div>
              {detailOrder.delivery_address && (
                <div className="col-span-2"><p className="text-gray-500 text-xs mb-1">Adresse de livraison</p><p className="font-medium">{detailOrder.delivery_address}</p></div>
              )}
            </div>
            {detailOrder.notes && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 italic">"{detailOrder.notes}"</div>
            )}
            {(detailOrder.items || []).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Articles</p>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100"><th className="text-left pb-2 font-medium text-gray-500">Produit</th><th className="text-right pb-2 font-medium text-gray-500">Qté</th><th className="text-right pb-2 font-medium text-gray-500">Sous-total</th></tr></thead>
                  <tbody>
                    {detailOrder.items.map((it, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="py-2">{it.product_name || `Produit #${it.product_id}`}</td>
                        <td className="py-2 text-right text-gray-500">{it.quantity}</td>
                        <td className="py-2 text-right font-medium">{fmt(it.unit_price * it.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <span className="text-sm text-gray-500">Total</span>
              <span className="text-lg font-bold">{fmt(detailOrder.total_amount)}</span>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => printDeliverySlip(detailOrder)}
                className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
              >
                <Printer className="w-4 h-4" />
                {detailOrder.delivery_address ? 'Imprimer le bon de livraison' : 'Imprimer le reçu'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
