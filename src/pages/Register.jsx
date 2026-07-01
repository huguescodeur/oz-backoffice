import { useNavigate, Link } from 'react-router-dom'
import { registerAdmin } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { useForm, rules } from '../hooks/useForm'
import Field from '../components/Field'
import { Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { useState } from 'react'

const EMPTY = { firstname: '', lastname: '', username: '', email: '', phone: '', password: '', confirm: '' }

const RULES = {
  firstname: [rules.required('Le prénom')],
  lastname:  [rules.required('Le nom')],
  username:  [rules.required("Le nom d'utilisateur"), rules.minLen(3)],
  email:     [rules.required("L'email"), rules.email()],
  phone:     [rules.required('Le téléphone'), rules.phone10()],
  password:  [rules.required('Le mot de passe'), rules.minLen(6)],
  confirm:   [rules.required('La confirmation'), rules.match('password', 'Les mots de passe')],
}

export default function Register() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [loading, setLoading] = useState(false)
  const form = useForm(EMPTY, RULES)

  const submit = async (e) => {
    e.preventDefault()
    const errs = form.validateAll()
    if (Object.keys(errs).filter((k) => errs[k]).length) return
    setLoading(true)
    try {
      await registerAdmin({
        firstname: form.values.firstname,
        lastname:  form.values.lastname,
        username:  form.values.username,
        email:     form.values.email,
        phone:     form.values.phone,
        password:  form.values.password,
      })
      await login(form.values.email, form.values.password)
      toast.success('Compte créé — bienvenue !')
      navigate('/onboarding')
    } catch (err) {
      const msg = err.response?.data?.error || "Erreur lors de l'inscription"
      if (msg.includes('email') || msg.includes('duplicate')) toast.error('Cet email est déjà utilisé')
      else if (msg.includes('username')) toast.error("Ce nom d'utilisateur est déjà pris")
      else toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 text-white">
            <Zap className="w-8 h-8 text-brand-500" />
            <span className="text-3xl font-bold tracking-wide">O'Z</span>
          </div>
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Créer votre espace</h1>
          <p className="text-sm text-gray-500 mb-6">Compte propriétaire — gérez vos boutiques et votre équipe</p>

          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom" error={form.errors.firstname} required>
                <input className="input" {...form.field('firstname')} />
              </Field>
              <Field label="Nom" error={form.errors.lastname} required>
                <input className="input" {...form.field('lastname')} />
              </Field>
            </div>

            <Field label="Nom d'utilisateur" error={form.errors.username} required hint="3 caractères minimum, sans espace">
              <input className="input" {...form.field('username')} placeholder="ex: hugues_patron" />
            </Field>

            <Field label="Email" error={form.errors.email} required>
              <input className="input" type="email" {...form.field('email')} />
            </Field>

            <Field label="Téléphone" error={form.errors.phone} required hint="10 chiffres, ex: 0708091011">
              <input className="input" type="tel" {...form.field('phone')} placeholder="0708091011" maxLength={10} />
            </Field>

            <Field label="Mot de passe" error={form.errors.password} required hint="6 caractères minimum">
              <input className="input" type="password" {...form.field('password')} />
            </Field>

            <Field label="Confirmer le mot de passe" error={form.errors.confirm} required>
              <input className="input" type="password" {...form.field('confirm')} />
            </Field>

            <button type="submit" className="btn-primary w-full justify-center mt-2" disabled={loading}>
              {loading ? 'Création en cours…' : 'Créer mon compte'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-brand-600 font-medium hover:underline">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
