import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProducts, createProduct, updateProduct, deleteProduct } from '../api/products'
import { getCategories } from '../api/categories'
import Modal from '../components/Modal'
import Field from '../components/Field'
import Spinner from '../components/Spinner'
import Pagination from '../components/Pagination'
import { useForm, rules } from '../hooks/useForm'
import { Plus, Pencil, Trash2, Package, Download, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

const EMPTY = { name: '', description: '', price: '', category_id: '' }

const RULES = {
  name:        [rules.required('Le nom')],
  price:       [rules.required('Le prix'), rules.positive('Le prix')],
  category_id: [rules.required('La catégorie')],
}

const fmt = (v) => new Intl.NumberFormat('fr-FR').format(v) + ' XAF'

export default function Products() {
  const qc = useQueryClient()
  const [page, setPage]       = useState(1)
  const [modal, setModal]     = useState(null)
  const [editing, setEditing] = useState(null)
  const [search, setSearch]   = useState('')
  const [filterCat, setFilterCat] = useState('')
  const form = useForm(EMPTY, RULES)

  const { data, isLoading } = useQuery({ queryKey: ['products', page], queryFn: () => getProducts(page) })
  const { data: catData }   = useQuery({ queryKey: ['categories'], queryFn: getCategories })

  const products   = data?.products || []
  const totalPages = data?.total_pages || 1
  const categories = catData?.categories || []

  const filtered = products.filter((p) => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.name?.toLowerCase().includes(q)
    const matchCat = !filterCat || String(p.category_id) === filterCat
    return matchSearch && matchCat
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['products'] })

  const createMut = useMutation({
    mutationFn: createProduct,
    onSuccess: () => { toast.success('Produit créé'); invalidate(); setModal(null) },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur lors de la création'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateProduct(id, data),
    onSuccess: () => { toast.success('Produit mis à jour'); invalidate(); setModal(null) },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })
  const deleteMut = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => { toast.success('Produit supprimé'); invalidate() },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  const openCreate = () => { form.reset(EMPTY); setEditing(null); setModal('create') }
  const openEdit = (p) => {
    form.reset({ name: p.name, description: p.description || '', price: String(p.price), category_id: String(p.category_id || '') })
    setEditing(p); setModal('edit')
  }

  const submit = (e) => {
    e.preventDefault()
    const errs = form.validateAll()
    if (Object.keys(errs).length) return
    const payload = {
      name: form.values.name,
      description: form.values.description || undefined,
      price: Number(form.values.price),
      category_id: Number(form.values.category_id),
    }
    if (modal === 'create') createMut.mutate(payload)
    else updateMut.mutate({ id: editing.id, data: payload })
  }

  const exportExcel = () => {
    const rows = filtered.map((p) => ({
      Nom:        p.name,
      Catégorie:  p.category_name || '',
      Description: p.description || '',
      'Prix (XAF)': p.price,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Produits')
    XLSX.writeFile(wb, `produits_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  const busy = createMut.isPending || updateMut.isPending

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Produits</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total || products.length} produit{products.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={exportExcel}>
            <Download className="w-4 h-4" /><span className="hidden sm:inline">Exporter</span>
          </button>
          <button className="btn-primary" onClick={openCreate} disabled={categories.length === 0}>
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">Nouveau produit</span>
          </button>
        </div>
      </div>

      {categories.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl px-4 py-3 text-sm">
          Créez d'abord au moins une catégorie avant d'ajouter des produits.
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Rechercher par nom…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-48" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="">Toutes catégories</option>
          {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="table-th">Nom</th>
                <th className="table-th">Catégorie</th>
                <th className="table-th text-right">Prix unitaire</th>
                <th className="table-th w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400">Aucun produit</p>
                  </td>
                </tr>
              )}
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="table-td">
                    <p className="font-medium">{p.name}</p>
                    {p.description && <p className="text-xs text-gray-400 truncate max-w-xs mt-0.5">{p.description}</p>}
                  </td>
                  <td className="table-td">
                    {p.category_name
                      ? <span className="badge bg-brand-50 text-brand-700">{p.category_name}</span>
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="table-td text-right font-mono font-medium">{fmt(p.price)}</td>
                  <td className="table-td">
                    <div className="flex gap-1">
                      <button className="btn-ghost p-1.5" onClick={() => openEdit(p)} title="Modifier"><Pencil className="w-4 h-4" /></button>
                      <button
                        className="btn-ghost p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                        title="Supprimer"
                        onClick={() => { if (window.confirm(`Supprimer "${p.name}" ?`)) deleteMut.mutate(p.id) }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Nouveau produit' : 'Modifier le produit'}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Catégorie" error={form.errors.category_id} required>
            <select className="input" {...form.field('category_id')}>
              <option value="">— Choisir une catégorie —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Nom du produit" error={form.errors.name} required>
            <input className="input" {...form.field('name')} placeholder="ex: Coca-Cola 33cl" />
          </Field>
          <Field label="Description" error={form.errors.description}>
            <textarea className="input resize-none" rows={2} {...form.field('description')} placeholder="Description optionnelle" />
          </Field>
          <Field label="Prix unitaire (XAF)" error={form.errors.price} required>
            <input className="input" type="number" min="1" step="50" {...form.field('price')} placeholder="ex: 500" />
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 mt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Enregistrement…' : modal === 'create' ? 'Créer le produit' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
