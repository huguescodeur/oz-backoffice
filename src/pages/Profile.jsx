import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { updateMe, resetPassword } from '../api/auth'
import { User, Lock, Save } from 'lucide-react'

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}

export default function Profile() {
  const { user, updateUser } = useAuth()

  const [info, setInfo] = useState({
    firstname: user?.firstname || '',
    lastname:  user?.lastname  || '',
    username:  user?.username  || '',
    email:     user?.email     || '',
    phone:     user?.phone     || '',
  })
  const [infoErr, setInfoErr] = useState({})

  const [pwd, setPwd] = useState({ old_password: '', new_password: '', confirm: '' })
  const [pwdErr, setPwdErr] = useState({})

  const infoMut = useMutation({
    mutationFn: () => updateMe(info),
    onSuccess: () => {
      updateUser(info)
      toast.success('Profil mis à jour')
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  const pwdMut = useMutation({
    mutationFn: () => resetPassword(pwd.old_password, pwd.new_password),
    onSuccess: () => {
      toast.success('Mot de passe modifié')
      setPwd({ old_password: '', new_password: '', confirm: '' })
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Ancien mot de passe incorrect'),
  })

  const submitInfo = (e) => {
    e.preventDefault()
    const errs = {}
    if (!info.firstname.trim()) errs.firstname = 'Requis'
    if (!info.lastname.trim())  errs.lastname  = 'Requis'
    if (!info.username.trim())  errs.username  = 'Requis'
    if (!info.email.trim())     errs.email     = 'Requis'
    if (info.phone.length !== 10) errs.phone   = '10 chiffres requis'
    setInfoErr(errs)
    if (Object.keys(errs).length === 0) infoMut.mutate()
  }

  const submitPwd = (e) => {
    e.preventDefault()
    const errs = {}
    if (!pwd.old_password) errs.old_password = 'Requis'
    if (pwd.new_password.length < 6) errs.new_password = 'Minimum 6 caractères'
    if (pwd.new_password !== pwd.confirm) errs.confirm = 'Les mots de passe ne correspondent pas'
    setPwdErr(errs)
    if (Object.keys(errs).length === 0) pwdMut.mutate()
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-semibold text-gray-900">Mon profil</h1>

      {/* Infos personnelles */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-brand-600" />
          <h2 className="text-sm font-semibold text-gray-800">Informations personnelles</h2>
        </div>
        <form onSubmit={submitInfo} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom" error={infoErr.firstname}>
              <input className="input" value={info.firstname}
                onChange={(e) => setInfo({ ...info, firstname: e.target.value })} />
            </Field>
            <Field label="Nom" error={infoErr.lastname}>
              <input className="input" value={info.lastname}
                onChange={(e) => setInfo({ ...info, lastname: e.target.value })} />
            </Field>
          </div>
          <Field label="Nom d'utilisateur" error={infoErr.username}>
            <input className="input" value={info.username}
              onChange={(e) => setInfo({ ...info, username: e.target.value })} />
          </Field>
          <Field label="Email" error={infoErr.email}>
            <input className="input" type="email" value={info.email}
              onChange={(e) => setInfo({ ...info, email: e.target.value })} />
          </Field>
          <Field label="Téléphone" error={infoErr.phone}>
            <input className="input" value={info.phone} maxLength={10}
              placeholder="0701020304"
              onChange={(e) => setInfo({ ...info, phone: e.target.value })} />
          </Field>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={infoMut.isPending}>
              <Save className="w-4 h-4" />
              {infoMut.isPending ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>

      {/* Changement de mot de passe */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-4 h-4 text-brand-600" />
          <h2 className="text-sm font-semibold text-gray-800">Changer le mot de passe</h2>
        </div>
        <form onSubmit={submitPwd} className="space-y-4" noValidate>
          <Field label="Mot de passe actuel" error={pwdErr.old_password}>
            <input className="input" type="password" value={pwd.old_password}
              onChange={(e) => setPwd({ ...pwd, old_password: e.target.value })} />
          </Field>
          <Field label="Nouveau mot de passe" error={pwdErr.new_password}>
            <input className="input" type="password" value={pwd.new_password}
              onChange={(e) => setPwd({ ...pwd, new_password: e.target.value })} />
          </Field>
          <Field label="Confirmer le nouveau mot de passe" error={pwdErr.confirm}>
            <input className="input" type="password" value={pwd.confirm}
              onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} />
          </Field>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={pwdMut.isPending}>
              <Lock className="w-4 h-4" />
              {pwdMut.isPending ? 'Modification…' : 'Changer le mot de passe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
