import { useState } from 'react'
import { CalendarDays, X } from 'lucide-react'

const today      = () => new Date().toISOString().slice(0, 10)
const daysAgo    = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10) }
const firstOfMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01` }
const firstOfYear  = () => `${new Date().getFullYear()}-01-01`
const monthsAgo    = (n) => { const d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString().slice(0, 10) }

const PRESETS = [
  { label: "Auj.",           from: () => today(),        to: () => today() },
  { label: '7 jours',        from: () => daysAgo(6),     to: () => today() },
  { label: 'Ce mois',        from: () => firstOfMonth(), to: () => today() },
  { label: '3 mois',         from: () => monthsAgo(3),   to: () => today() },
  { label: 'Cette année',    from: () => firstOfYear(),  to: () => today() },
]

export default function DateRangeFilter({ dateFrom, dateTo, onChange }) {
  const [custom, setCustom] = useState(false)

  const activePreset = PRESETS.findIndex((p) => p.from() === dateFrom && p.to() === dateTo)
  const hasFilter    = dateFrom || dateTo

  const apply = (from, to) => { onChange({ dateFrom: from, dateTo: to }); setCustom(false) }
  const reset = () => { onChange({ dateFrom: '', dateTo: '' }); setCustom(false) }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CalendarDays className="w-4 h-4 text-gray-400 shrink-0" />
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((p, i) => (
          <button
            key={i}
            onClick={() => apply(p.from(), p.to())}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              activePreset === i
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setCustom(!custom)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            custom || (hasFilter && activePreset === -1)
              ? 'bg-brand-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Perso.
        </button>
      </div>

      {custom && (
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <input
            type="date"
            className="input py-1 text-xs flex-1 min-w-32 sm:w-36 sm:flex-none"
            value={dateFrom}
            max={dateTo || today()}
            onChange={(e) => onChange({ dateFrom: e.target.value, dateTo })}
          />
          <span className="text-gray-400 text-xs">→</span>
          <input
            type="date"
            className="input py-1 text-xs flex-1 min-w-32 sm:w-36 sm:flex-none"
            value={dateTo}
            min={dateFrom}
            max={today()}
            onChange={(e) => onChange({ dateFrom, dateTo: e.target.value })}
          />
        </div>
      )}

      {hasFilter && (
        <button
          onClick={reset}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Tout</span>
        </button>
      )}
    </div>
  )
}
