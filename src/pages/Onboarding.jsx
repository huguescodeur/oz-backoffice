import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getOnboardingStatus } from '../api/dashboard'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/Spinner'
import { Check, Store, Package, Users, ArrowRight, Zap } from 'lucide-react'

const STEPS = [
  {
    key: 'has_shop',
    icon: Store,
    title: 'Créez votre première boutique',
    desc: 'Ajoutez une boutique pour commencer à gérer votre activité.',
    cta: 'Créer une boutique',
    path: '/shops',
  },
  {
    key: 'has_product',
    icon: Package,
    title: 'Ajoutez vos produits',
    desc: 'Référencez les produits que vous vendez avec leurs prix.',
    cta: 'Ajouter des produits',
    path: '/products',
  },
  {
    key: 'has_vendeur',
    icon: Users,
    title: 'Ajouter un vendeur',
    desc: 'Créez des comptes vendeurs pour votre équipe en boutique.',
    cta: 'Ajouter un vendeur',
    path: '/users',
    optional: true,
  },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['onboarding'],
    queryFn: getOnboardingStatus,
    refetchOnWindowFocus: true,
  })

  const done = (key) => data?.[key] === true
  const allDone = data?.complete

  if (isLoading) return (
    <div className="min-h-screen bg-brand-900 flex items-center justify-center">
      <Spinner />
    </div>
  )

  return (
    <div className="min-h-screen bg-brand-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 text-white">
            <Zap className="w-8 h-8 text-brand-500" />
            <span className="text-3xl font-bold tracking-wide">O'Z</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-8 pt-8 pb-6 border-b border-gray-100">
            {allDone ? (
              <>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Vous êtes prêt !</h1>
                <p className="text-sm text-gray-500 mt-1">Votre espace O'Z est configuré. Bonne gestion !</p>
              </>
            ) : (
              <>
                <h1 className="text-xl font-bold text-gray-900">Bienvenue sur O'Z 👋</h1>
                <p className="text-sm text-gray-500 mt-1">Suivez ces étapes pour configurer votre espace.</p>
                <div className="mt-4 flex gap-1.5">
                  {STEPS.map((s, i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${done(s.key) ? 'bg-brand-500' : 'bg-gray-200'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="divide-y divide-gray-100">
            {STEPS.map((step, i) => {
              const isDone = done(step.key)
              const Icon = step.icon
              return (
                <div key={i} className={`px-8 py-5 flex items-start gap-4 ${isDone ? 'opacity-60' : ''}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isDone ? 'bg-green-100' : 'bg-brand-50'}`}>
                    {isDone
                      ? <Check className="w-4 h-4 text-green-600" />
                      : <Icon className="w-4 h-4 text-brand-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                      {step.optional && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Optionnel</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                  </div>
                  {!isDone && (
                    <button
                      onClick={() => navigate(step.path)}
                      className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
                    >
                      {step.cta} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Se déconnecter
            </button>
            <button
              onClick={() => navigate('/')}
              className="btn-primary"
            >
              {allDone ? 'Accéder au tableau de bord' : 'Passer cette étape →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
