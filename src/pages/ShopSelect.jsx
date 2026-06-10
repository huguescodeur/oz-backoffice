import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMyShops } from '../api/auth'
import { Store, Zap } from 'lucide-react'
import Spinner from '../components/Spinner'
import toast from 'react-hot-toast'

export default function ShopSelect() {
  const { myShops, setShops, selectShop, user, logout } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Toujours re-fetch depuis l'API pour avoir les boutiques à jour
    setLoading(true)
    getMyShops()
      .then((shops) => {
        setShops(shops)
        if (shops.length === 0) {
          toast.error("Aucune boutique assignée. Contactez votre administrateur.")
        } else if (shops.length === 1) {
          selectShop(shops[0])
          navigate('/')
        }
      })
      .catch(() => toast.error('Erreur lors du chargement des boutiques'))
      .finally(() => setLoading(false))
  }, [])

  const pick = (shop) => {
    selectShop(shop)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-brand-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 text-white">
            <Zap className="w-8 h-8 text-brand-500" />
            <span className="text-3xl font-bold tracking-wide">O'Z</span>
          </div>
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Choisir une boutique</h1>
          <p className="text-sm text-gray-500 mb-6">
            Bonjour {user?.firstname || user?.username}, sélectionnez la boutique où vous travaillez aujourd'hui.
          </p>

          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <div className="space-y-3">
              {myShops.map((shop) => (
                <button
                  key={shop.shopID}
                  onClick={() => pick(shop)}
                  className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-brand-500 hover:bg-brand-50 transition-all text-left"
                >
                  <div className="p-2.5 bg-brand-100 rounded-lg">
                    <Store className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{shop.shopName}</p>
                    {shop.shopAddress && (
                      <p className="text-sm text-gray-500">{shop.shopAddress}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={logout}
            className="w-full mt-6 text-sm text-gray-400 hover:text-gray-600 text-center transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  )
}
