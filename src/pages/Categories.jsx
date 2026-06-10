import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../api/categories'
import Modal from '../components/Modal'
import Field from '../components/Field'
import Spinner from '../components/Spinner'
import { useForm, rules } from '../hooks/useForm'
import { Plus, Pencil, Trash2, Tag, Download, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

const RULES = { name: [rules.required('Le nom'), rules.minLen(2)] }

export default function Categories() {
  const qc = useQueryClient()
  const [modal, setModal]     = useState(null)
  const [editing, setEditing] = useState(null)
  const [search, setSearch]   = useState('')
  const form = useForm({ name: '' }, RULES)

  const { data, isLoading } = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  const categories = data?.categories || []

  const filtered = categories.filter((c) =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase())
  )

  const invalidate = () => qc.invalidateQueries({ queryKey: ['categories'] })

  const createMut = useMutation({
    mutationFn: () => createCategory(form.values.name),
    onSuccess: () => { toast.success('Catégorie créée'); invalidate(); setModal(null) },
    onError: (e) => toast.error(e.response?.data?.error || 'Ce nom existe peut-être déjà'),
  })
  const updateMut = useMutation({
    mutationFn: () => updateCategory(editing.id, form.values.name),
    onSuccess: () => { toast.success('Catégorie mise à jour'); invalidate(); setModal(null) },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })
  const deleteMut = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => { toast.success('Catégorie supprimée'); invalidate() },
    onError: (e) => toast.error(e.response?.data?.error || 'Des produits utilisent peut-être cette catégorie'),
  })

  const openCreate = () => { form.reset({ name: '' }); setEditing(null); setModal('create') }
  const openEdit = (c) => { form.reset({ name: c.name }); setEditing(c); setModal('edit') }

  const submit = (e) => {
    e.preventDefault()
    const errs = form.validateAll()
    if (Object.keys(errs).length) return
    if (modal === 'create') createMut.mutate()
    else updateMut.mutate()
  }

  const exportExcel = () => {
    const rows = filtered.map((c) => ({ Catégorie: c.name }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Catégories')
    XLSX.writeFile(wb, `categories_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Catégories</h1>
          <p className="text-sm text-gray-500 mt-0.5">{categories.length} catégorie{categories.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={exportExcel}>
            <Download className="w-4 h-4" /> Exporter
          </button>
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Nouvelle catégorie
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Rechercher une catégorie…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="table-th">Nom</th>
                <th className="table-th w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-16 text-center">
                    <Tag className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400">Aucune catégorie</p>
                  </td>
                </tr>
              )}
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{c.name}</td>
                  <td className="table-td">
                    <div className="flex gap-1">
                      <button className="btn-ghost p-1.5" onClick={() => openEdit(c)} title="Modifier"><Pencil className="w-4 h-4" /></button>
                      <button
                        className="btn-ghost p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                        title="Supprimer"
                        onClick={() => {
                          if (window.confirm(`Supprimer "${c.name}" ? Les produits de cette catégorie seront affectés.`))
                            deleteMut.mutate(c.id)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Nouvelle catégorie' : 'Modifier la catégorie'} size="sm">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Nom" error={form.errors.name} required>
            <input className="input" {...form.field('name')} autoFocus placeholder="ex: Boissons" />
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 mt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={createMut.isPending || updateMut.isPending}>
              {modal === 'create' ? 'Créer' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
