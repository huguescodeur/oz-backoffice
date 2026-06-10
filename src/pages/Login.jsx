import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMyShops } from '../api/auth'
import { Zap } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const { login, setShops, selectShop } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(form.identifier, form.password)
      if (user.role === 'super') {
        navigate('/super')
      } else if (user.role === 'vendeur') {
        const shops = await getMyShops()
        setShops(shops)
        if (shops.length === 0) {
          toast.error("Vous n'êtes assigné à aucune boutique. Contactez votre administrateur.")
          return
        }
        if (shops.length === 1) {
          selectShop(shops[0])
          navigate('/')
        } else {
          navigate('/shop-select')
        }
      } else {
        navigate('/')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Identifiants incorrects')
    } finally {
      setLoading(false)
    }
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

        <div className="card p-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Connexion</h1>
          <p className="text-sm text-gray-500 mb-6">Email ou nom d'utilisateur</p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Identifiant</label>
              <input
                className="input"
                type="text"
                required
                autoFocus
                placeholder="email ou username"
                value={form.identifier}
                onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Mot de passe</label>
              <input
                className="input"
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <button type="submit" className="btn-primary w-full justify-center mt-2" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className="text-center mt-4">
            <Link to="/forgot-password" className="text-sm text-brand-600 hover:underline">
              Mot de passe oublié ?
            </Link>
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-brand-600 font-medium hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
