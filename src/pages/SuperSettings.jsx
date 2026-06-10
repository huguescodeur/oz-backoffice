import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, Save, Check } from 'lucide-react'
import { getSettings, setSetting } from '../api/super'
import Spinner from '../components/Spinner'
import toast from 'react-hot-toast'

const SETTING_LABELS = {
  platform_name:        { label: 'Nom de la plateforme', type: 'text' },
  platform_tagline:     { label: 'Slogan', type: 'text' },
  primary_color:        { label: 'Couleur principale', type: 'color' },
  support_email:        { label: 'Email de support', type: 'email' },
  max_shops_per_admin:  { label: 'Boutiques max par admin', type: 'number' },
}

export default function SuperSettings() {
  const queryClient = useQueryClient()
  const { data: settings, isLoading } = useQuery({
    queryKey: ['super-settings'],
    queryFn: getSettings,
  })

  const [form, setForm] = useState({})
  const [saved, setSaved] = useState({})

  useEffect(() => {
    if (settings) setForm({ ...settings })
  }, [settings])

  const mutation = useMutation({
    mutationFn: ({ key, value }) => setSetting(key, value),
    onSuccess: (_, { key }) => {
      queryClient.invalidateQueries({ queryKey: ['super-settings'] })
      setSaved((prev) => ({ ...prev, [key]: true }))
      setTimeout(() => setSaved((prev) => ({ ...prev, [key]: false })), 2000)
      toast.success('Paramètre enregistré')
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  const handleSave = (key) => {
    const value = form[key] ?? ''
    mutation.mutate({ key, value })
  }

  const allKeys = settings ? Object.keys(settings) : Object.keys(SETTING_LABELS)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6 text-brand-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres plateforme</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configuration globale de la plateforme O'Z</p>
        </div>
      </div>

      <div className="card divide-y divide-gray-100">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          allKeys.map((key) => {
            const meta = SETTING_LABELS[key] || { label: key, type: 'text' }
            const isColor = meta.type === 'color'
            return (
              <div key={key} className="px-6 py-5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {meta.label}
                  </label>
                  <div className="flex items-center gap-3">
                    {isColor ? (
                      <>
                        <input
                          type="color"
                          value={form[key] || '#000000'}
                          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                          className="h-9 w-16 rounded border border-gray-300 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={form[key] || ''}
                          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                          className="input w-32 text-sm font-mono"
                          placeholder="#000000"
                        />
                      </>
                    ) : (
                      <input
                        type={meta.type}
                        value={form[key] ?? ''}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                        className="input w-full max-w-md"
                        onKeyDown={(e) => e.key === 'Enter' && handleSave(key)}
                      />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1 font-mono">{key}</p>
                </div>
                <button
                  onClick={() => handleSave(key)}
                  disabled={mutation.isPending}
                  className={`btn shrink-0 flex items-center gap-2 px-4 py-2 text-sm transition-all ${
                    saved[key]
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'btn-primary'
                  }`}
                >
                  {saved[key] ? (
                    <><Check className="w-4 h-4" /> Enregistré</>
                  ) : (
                    <><Save className="w-4 h-4" /> Enregistrer</>
                  )}
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
