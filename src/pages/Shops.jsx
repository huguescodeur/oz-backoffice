import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getShops, createShop, updateShop, deleteShop } from '../api/shops'
import Modal from '../components/Modal'
import Field from '../components/Field'
import Spinner from '../components/Spinner'
import Pagination from '../components/Pagination'
import { useForm, rules } from '../hooks/useForm'
import { Plus, Pencil, Trash2, Store, Download, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

const EMPTY = { name: '', address: '', phone: '' }

const RULES = {
  name:    [rules.required('Le nom')],
  address: [rules.required("L'adresse")],
  phone:   [
    rules.required('Le téléphone'),
    (v) => v && !/^\d{10}$/.test(v) ? '10 chiffres requis (ex: 0102030405)' : undefined,
  ],
}


export default function Shops() {
  const qc = useQueryClient()
  const [page, setPage]       = useState(1)
  const [modal, setModal]     = useState(null)
  const [editing, setEditing] = useState(null)
  const [search, setSearch]   = useState('')
  const form = useForm(EMPTY, RULES)

  const { data, isLoading } = useQuery({ queryKey: ['shops', page], queryFn: () => getShops(page) })
  const shops      = data?.shops || []
  const totalPages = data?.total_pages || 1

  const filtered = shops.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.name?.toLowerCase().includes(q) || s.address?.toLowerCase().includes(q)
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['shops'] })

  const createMut = useMutation({
    mutationFn: createShop,
    onSuccess: () => { toast.success('Boutique créée'); invalidate(); setModal(null) },
    onError: (e) => toast.error(e.response?.data?.error || e.response?.data?.message || 'Erreur lors de la création'),
    // onError: (e) => toast.error(e.response?.data?.error || 'Ce nom est peut-être déjà utilisé'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateShop(id, data),
    onSuccess: () => { toast.success('Boutique mise à jour'); invalidate(); setModal(null) },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur lors de la mise à jour'),
  })
  const deleteMut = useMutation({
    mutationFn: deleteShop,
    onSuccess: () => { toast.success('Boutique supprimée'); invalidate() },
    onError: (e) => toast.error(e.response?.data?.error || 'Impossible de supprimer'),
  })

  const openCreate = () => { form.reset(EMPTY); setEditing(null); setModal('create') }
  const openEdit = (s) => {
    form.reset({ name: s.name, address: s.address || '', phone: s.phone || '' })
    setEditing(s); setModal('edit')
  }

  const submit = (e) => {
    e.preventDefault()
    const errs = form.validateAll()
    if (Object.keys(errs).length) return
    const payload = { name: form.values.name, address: form.values.address, phone: form.values.phone  }
    if (modal === 'create') createMut.mutate(payload)
    else updateMut.mutate({ id: editing.uuid, data: payload })
  }

  const confirmDelete = (s) => {
    if (window.confirm(`Supprimer "${s.name}" ? Cette action est irréversible.`)) deleteMut.mutate(s.uuid)
  }

  const exportExcel = () => {
    const rows = filtered.map((s) => ({
      Nom:       s.name,
      Adresse:   s.address || '',
      Téléphone: s.phone || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Boutiques')
    XLSX.writeFile(wb, `boutiques_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  const busy = createMut.isPending || updateMut.isPending

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Boutiques</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total || shops.length} boutique{(data?.total || shops.length) > 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={exportExcel}>
            <Download className="w-4 h-4" /><span className="hidden sm:inline">Exporter</span>
          </button>
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">Nouvelle boutique</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Rechercher par nom ou adresse…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="table-th">Nom</th>
                <th className="table-th">Adresse</th>
                <th className="table-th">Téléphone</th>
                <th className="table-th w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <Store className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400">Aucune boutique — créez-en une !</p>
                  </td>
                </tr>
              )}
              {filtered.map((s) => (
                <tr key={s.uuid} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{s.name}</td>
                  <td className="table-td text-gray-500">{s.address || '—'}</td>
                  <td className="table-td text-gray-500">{s.phone || '—'}</td>
                  <td className="table-td">
                    <div className="flex gap-1">
                      <button className="btn-ghost p-1.5" onClick={() => openEdit(s)} title="Modifier"><Pencil className="w-4 h-4" /></button>
                      <button className="btn-ghost p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600" onClick={() => confirmDelete(s)} title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Nouvelle boutique' : 'Modifier la boutique'}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Nom de la boutique" error={form.errors.name} required>
            <input className="input" {...form.field('name')} placeholder="ex: O'Z Plateau" />
          </Field>
          <Field label="Adresse" error={form.errors.address} required>
            <input className="input" {...form.field('address')} placeholder="ex: Plateau, Abidjan" />
          </Field>
          <Field label="Téléphone" error={form.errors.phone} hint="Format : 10 chiffres (ex: 0102030405)" required>
            <input className="input" {...form.field('phone')} placeholder="0102030405" maxLength={10} />
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 mt-4">
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Enregistrement…' : modal === 'create' ? 'Créer la boutique' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
