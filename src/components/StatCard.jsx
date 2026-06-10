export default function StatCard({ title, value, icon: Icon, color = 'brand', sub }) {
  const colors = {
    brand:  'bg-brand-50 text-brand-600',
    green:  'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red:    'bg-red-50 text-red-600',
  }
  return (
    <div className="card p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
      <div className={`p-2.5 rounded-lg shrink-0 ${colors[color]}`}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs sm:text-sm text-gray-500 truncate">{title}</p>
        <p className="text-lg sm:text-2xl font-semibold text-gray-900 mt-0.5 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  )
}
