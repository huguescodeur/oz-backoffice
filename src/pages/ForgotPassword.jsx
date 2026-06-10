import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap, ArrowLeft, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { forgotPassword } from '../api/auth'

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await forgotPassword(identifier)
      setSent(true)
    } catch {
      toast.error('Une erreur est survenue, veuillez réessayer.')
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
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-green-600" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">Email envoyé</h1>
              <p className="text-sm text-gray-500 mb-6">
                Si ce compte existe, un lien de réinitialisation a été envoyé. Vérifiez votre boîte mail (et les spams).
              </p>
              <Link to="/login" className="btn-primary justify-center w-full">
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">Mot de passe oublié</h1>
              <p className="text-sm text-gray-500 mb-6">
                Entrez votre email ou nom d'utilisateur pour recevoir un lien de réinitialisation.
              </p>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="label">Email ou nom d'utilisateur</label>
                  <input
                    className="input"
                    type="text"
                    required
                    autoFocus
                    placeholder="email ou username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-primary w-full justify-center mt-2" disabled={loading}>
                  {loading ? 'Envoi...' : 'Envoyer le lien'}
                </button>
              </form>
              <Link
                to="/login"
                className="flex items-center gap-1.5 justify-center text-sm text-gray-500 hover:text-gray-700 mt-6"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour à la connexion
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
