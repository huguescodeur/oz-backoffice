import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Zap, Eye, EyeOff, CheckCircle, XCircle, Loader } from 'lucide-react'
import toast from 'react-hot-toast'
import { validateResetToken, resetPasswordByToken } from '../api/auth'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') || ''

  const [status, setStatus] = useState('checking') // checking | valid | invalid | success
  const [form, setForm] = useState({ newPassword: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) {
      setStatus('invalid')
      return
    }
    validateResetToken(token)
      .then(() => setStatus('valid'))
      .catch(() => setStatus('invalid'))
  }, [token])

  const submit = async (e) => {
    e.preventDefault()
    if (form.newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (form.newPassword !== form.confirm) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    try {
      await resetPasswordByToken(token, form.newPassword)
      setStatus('success')
    } catch (err) {
      toast.error(err.response?.data || 'Lien invalide ou expiré.')
    } finally {
      setLoading(false)
    }
  }

  const renderBody = () => {
    if (status === 'checking') {
      return (
        <div className="flex flex-col items-center gap-3 py-4">
          <Loader className="w-8 h-8 text-brand-500 animate-spin" />
          <p className="text-sm text-gray-500">Vérification du lien...</p>
        </div>
      )
    }

    if (status === 'invalid') {
      return (
        <div className="text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Lien invalide ou expiré</h1>
          <p className="text-sm text-gray-500 mb-6">
            Ce lien de réinitialisation n'est plus valide. Faites une nouvelle demande.
          </p>
          <button className="btn-primary w-full justify-center" onClick={() => navigate('/forgot-password')}>
            Nouvelle demande
          </button>
        </div>
      )
    }

    if (status === 'success') {
      return (
        <div className="text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Mot de passe mis à jour</h1>
          <p className="text-sm text-gray-500 mb-6">
            Votre mot de passe a été réinitialisé avec succès.
          </p>
          <button className="btn-primary w-full justify-center" onClick={() => navigate('/login')}>
            Se connecter
          </button>
        </div>
      )
    }

    return (
      <>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Nouveau mot de passe</h1>
        <p className="text-sm text-gray-500 mb-6">Choisissez un nouveau mot de passe sécurisé.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Nouveau mot de passe</label>
            <div className="relative">
              <input
                className="input pr-10"
                type={showPwd ? 'text' : 'password'}
                required
                autoFocus
                placeholder="Min. 6 caractères"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPwd((v) => !v)}
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Confirmer le mot de passe</label>
            <input
              className="input"
              type={showPwd ? 'text' : 'password'}
              required
              placeholder="Répétez le mot de passe"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary w-full justify-center mt-2" disabled={loading}>
            {loading ? 'Enregistrement...' : 'Réinitialiser'}
          </button>
        </form>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-brand-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 text-white">
            <Zap className="w-8 h-8 text-brand-500" />
            <span className="text-3xl font-bold tracking-wide">O'Z</span>
          </div>
        </div>
        <div className="card p-8">{renderBody()}</div>
      </div>
    </div>
  )
}
