import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-end gap-2 pt-4">
      <button
        className="btn-secondary px-2 py-1"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm text-gray-600">
        Page {page} / {totalPages}
      </span>
      <button
        className="btn-secondary px-2 py-1"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
