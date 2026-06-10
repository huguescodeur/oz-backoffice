const variants = {
  PENDING:   'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  default:   'bg-gray-100 text-gray-700',
}

const labels = {
  PENDING:   'En attente',
  CONFIRMED: 'Confirmée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
}

export default function Badge({ value, className = '' }) {
  const color = variants[value] || variants.default
  return (
    <span className={`badge ${color} ${className}`}>
      {labels[value] || value}
    </span>
  )
}
