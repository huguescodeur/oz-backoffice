import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUsers, getArchivedUsers, createUser, updateUser, deleteUser, restoreUser, assignShops, getUserShops } from '../api/users'
import { getShops } from '../api/shops'
import Modal from '../components/Modal'
import Field from '../components/Field'
import Spinner from '../components/Spinner'
import { useForm, rules } from '../hooks/useForm'
import Pagination from '../components/Pagination'
import { Plus, Trash2, Users as UsersIcon, Pencil, RotateCcw, Download, Search, Archive } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

const roleLabel = { admin: 'Admin', vendeur: 'Vendeur', super: 'Super Admin' }
const roleColor = { admin: 'bg-purple-100 text-purple-700', vendeur: 'bg-blue-100 text-blue-700', super: 'bg-gray-100 text-gray-700' }

const EMPTY_CREATE = { name: '', email: '', password: '', confirm: '', role: 'vendeur', shop_id: '', phone: '' }
const EMPTY_EDIT   = { firstname: '', lastname: '', email: '', phone: '', username: '', shop_id: '' }

const makeCreateRules = (role) => ({
  email:    [rules.required("L'email"), rules.email()],
  password: [rules.required('Le mot de passe'), rules.minLen(8)],
  confirm:  [rules.required('La confirmation'), rules.match('password', 'Les mots de passe')],
  phone:    [rules.required('Le téléphone'), (v) => v && !/^\d{10}$/.test(v.replace(/\s/g,'')) ? '10 chiffres (ex: 0701020304)' : undefined],
  shop_id:  [role === 'vendeur' ? rules.required('La boutique') : () => undefined],
})

function makeUsername(email) {
  const base = email.split('@')[0].replace(/[^a-z0-9_]/gi, '_').toLowerCase()
  const safe = base.replace(/^[^a-z]+/, '')   // strip leading non-letters
  const padded = safe.length < 3 ? safe + '_oz' : safe
  return padded.slice(0, 19)
}

function extractError(e) {
  if (!e?.response) return 'Erreur réseau'
  const data = e.response.data
  if (typeof data === 'string') return data.trim() || 'Erreur'
  if (data?.error) return data.error
  if (data?.message) return data.message
  return `Erreur ${e.response.status}`
}

export default function Users() {
  const qc = useQueryClient()

  const [tab, setTab]         = useState('active')
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal]     = useState(false)
  const [editTarget, setEditTarget]   = useState(null)
  const [role, setRole]       = useState('vendeur')
  const [selectedShopIds, setSelectedShopIds] = useState([])

  const createForm = useForm(EMPTY_CREATE, makeCreateRules('vendeur'))
  const editForm   = useForm(EMPTY_EDIT, {})

  const isArchived = tab === 'archived'

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, isArchived],
    queryFn: () => isArchived ? getArchivedUsers(page) : getUsers(page),
  })
  const { data: shopsData } = useQuery({ queryKey: ['shops'], queryFn: () => getShops(1, 100) })

  const allUsers   = data?.users || []
  const totalPages = data?.total_pages || 1
  const shops      = shopsData?.shops || []

  const filtered = allUsers.filter((u) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.shop_name?.toLowerCase().includes(q)
    )
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] })

  const createMut = useMutation({
    mutationFn: createUser,
    onSuccess: () => { toast.success('Utilisateur créé'); invalidate(); setCreateModal(false) },
    onError: (e) => toast.error(extractError(e)),
  })

  const updateMut = useMutation({
    mutationFn: ({ uuid, data, shopIds }) =>
      updateUser(uuid, data).then(() => assignShops(uuid, shopIds)),
    onSuccess: () => { toast.success('Utilisateur mis à jour'); invalidate(); setEditModal(false) },
    onError: (e) => toast.error(extractError(e)),
  })

  const deleteMut = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => { toast.success('Utilisateur archivé'); invalidate() },
    onError: (e) => toast.error(extractError(e)),
  })

  const restoreMut = useMutation({
    mutationFn: restoreUser,
    onSuccess: () => { toast.success('Utilisateur restauré'); invalidate() },
    onError: (e) => toast.error(extractError(e)),
  })

  const handleRoleChange = (r) => {
    setRole(r)
    createForm.set('role', r)
    if (r !== 'vendeur') createForm.set('shop_id', '')
  }

  const submitCreate = (e) => {
    e.preventDefault()
    const errs = createForm.validateAll()
    if (Object.keys(errs).filter((k) => errs[k]).length) return
    const v = createForm.values
    const username = makeUsername(v.email)
    const payload = {
      firstname:    v.name.split(' ')[0] || v.name || 'Prénom',
      lastname:     v.name.split(' ').slice(1).join(' ') || 'N/A',
      username,
      email:        v.email,
      password:     v.password,
      phone:        v.phone.replace(/\s/g, ''),
      role,
      shop_id:      role === 'vendeur' && v.shop_id ? Number(v.shop_id) : undefined,
    }
    createMut.mutate(payload)
  }

  const { data: editUserShops } = useQuery({
    queryKey: ['user-shops', editTarget?.uuid],
    queryFn: () => getUserShops(editTarget.uuid),
    enabled: !!editTarget && editModal,
  })

  useEffect(() => {
    if (editUserShops) {
      setSelectedShopIds(editUserShops.map((s) => s.shopID ?? s.shop_id ?? s.id).filter(Boolean))
    }
  }, [editUserShops])

  const openEdit = (u) => {
    setEditTarget(u)
    setSelectedShopIds(u.shop_id ? [u.shop_id] : [])
    editForm.reset({
      firstname: u.firstname || u.name?.split(' ')[0] || '',
      lastname:  u.lastname  || u.name?.split(' ').slice(1).join(' ') || '',
      email:     u.email || '',
      phone:     u.phone || '',
      username:  u.username || '',
    })
    setEditModal(true)
  }

  const toggleShop = (id) => {
    setSelectedShopIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const submitEdit = (e) => {
    e.preventDefault()
    const v = editForm.values
    const payload = {
      firstname: v.firstname || undefined,
      lastname:  v.lastname  || undefined,
      email:     v.email     || undefined,
      phone:     v.phone     || undefined,
      username:  v.username  || undefined,
      role:      editTarget.role,
    }
    updateMut.mutate({ uuid: editTarget.uuid, data: payload, shopIds: selectedShopIds })
  }

  const exportExcel = () => {
    const rows = filtered.map((u) => ({
      Nom:       u.name,
      Username:  u.username,
      Email:     u.email,
      Téléphone: u.phone || '',
      Rôle:      roleLabel[u.role] || u.role,
      Boutique:  u.shop_name || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Équipe')
    XLSX.writeFile(wb, `equipe_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Équipe</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total || 0} membre{(data?.total || 0) > 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={exportExcel}>
            <Download className="w-4 h-4" /><span className="hidden sm:inline">Exporter</span>
          </button>
          <button className="btn-primary" onClick={() => { createForm.reset(EMPTY_CREATE); setRole('vendeur'); setCreateModal(true) }}>
            <Plus className="w-4 h-4" /> Nouveau membre
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'active' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => { setTab('active'); setPage(1) }}
        >
          <UsersIcon className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          Membres actifs
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'archived' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => { setTab('archived'); setPage(1) }}
        >
          <Archive className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          Archivés
        </button>
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Rechercher par nom, email, boutique…"
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
                <th className="table-th">Email</th>
                <th className="table-th">Téléphone</th>
                <th className="table-th">Rôle</th>
                <th className="table-th">Boutique</th>
                <th className="table-th w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <UsersIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400">{isArchived ? 'Aucun membre archivé' : "Aucun membre dans l'équipe"}</p>
                  </td>
                </tr>
              )}
              {filtered.map((u) => (
                <tr key={u.uuid || u.id} className={`hover:bg-gray-50 ${isArchived ? 'opacity-60' : ''}`}>
                  <td className="table-td">
                    <p className="font-medium">{u.name || '—'}</p>
                    <p className="text-xs text-gray-400">{u.username}</p>
                  </td>
                  <td className="table-td text-gray-500">{u.email}</td>
                  <td className="table-td text-gray-500">{u.phone || '—'}</td>
                  <td className="table-td">
                    <span className={`badge ${roleColor[u.role] || roleColor.vendeur}`}>{roleLabel[u.role] || u.role}</span>
                  </td>
                  <td className="table-td text-gray-500">{u.shop_name || '—'}</td>
                  <td className="table-td">
                    <div className="flex gap-1">
                      {!isArchived && (
                        <button
                          className="btn-ghost p-1.5 text-blue-500 hover:bg-blue-50"
                          onClick={() => openEdit(u)}
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {isArchived ? (
                        <button
                          className="btn-ghost p-1.5 text-green-600 hover:bg-green-50"
                          onClick={() => restoreMut.mutate(u.uuid)}
                          title="Restaurer"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          className="btn-ghost p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                          onClick={() => { if (window.confirm(`Archiver ${u.email} ?`)) deleteMut.mutate(u.uuid) }}
                          title="Archiver"
                        >
                          <Trash2 className="w-4 h-4" />
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
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Nouveau membre">
        <form onSubmit={submitCreate} className="space-y-4" noValidate>
          <Field label="Nom complet">
            <input className="input" {...createForm.field('name')} placeholder="ex: Marie Koné" />
          </Field>
          <Field label="Email" error={createForm.errors.email} required>
            <input className="input" type="email" {...createForm.field('email')} placeholder="marie@oz.ci" />
          </Field>
          <Field label="Téléphone" error={createForm.errors.phone} required hint="Format ivoirien : 07XXXXXXXX">
            <input className="input" {...createForm.field('phone')} placeholder="0701020304" maxLength={10} />
          </Field>
          <Field label="Mot de passe" error={createForm.errors.password} required hint="8 caractères minimum">
            <input className="input" type="password" {...createForm.field('password')} />
          </Field>
          <Field label="Confirmer le mot de passe" error={createForm.errors.confirm} required>
            <input className="input" type="password" {...createForm.field('confirm')} />
          </Field>
          <Field label="Rôle" required>
            <select className="input" value={role} onChange={(e) => handleRoleChange(e.target.value)}>
              <option value="vendeur">Vendeur</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
          {role === 'vendeur' && (
            <Field label="Boutique assignée" error={createForm.errors.shop_id} required>
              <select className="input" {...createForm.field('shop_id')}>
                <option value="">— Choisir une boutique —</option>
                {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 mt-2">
            <button type="button" className="btn-secondary" onClick={() => setCreateModal(false)}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={createMut.isPending}>
              {createMut.isPending ? 'Création…' : 'Créer le membre'}
            </button>
          </div>
        </form>
      </Modal>

      {/* === MODAL ÉDITION === */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title={`Modifier — ${editTarget?.name || ''}`}>
        <form onSubmit={submitEdit} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom">
              <input className="input" {...editForm.field('firstname')} />
            </Field>
            <Field label="Nom">
              <input className="input" {...editForm.field('lastname')} />
            </Field>
          </div>
          <Field label="Username">
            <input className="input" {...editForm.field('username')} />
          </Field>
          <Field label="Email">
            <input className="input" type="email" {...editForm.field('email')} />
          </Field>
          <Field label="Téléphone" hint="Format ivoirien : 07XXXXXXXX">
            <input className="input" {...editForm.field('phone')} placeholder="0701020304" maxLength={10} />
          </Field>
          {editTarget?.role === 'vendeur' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Boutiques assignées
                <span className="ml-1 text-xs text-gray-400 font-normal">(plusieurs possibles)</span>
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {shops.length === 0 && <p className="text-xs text-gray-400 p-1">Aucune boutique disponible</p>}
                {shops.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-brand-600"
                      checked={selectedShopIds.includes(s.id)}
                      onChange={() => toggleShop(s.id)}
                    />
                    <span className="text-sm text-gray-700">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" className="btn-secondary" onClick={() => setEditModal(false)}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={updateMut.isPending}>
              {updateMut.isPending ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
