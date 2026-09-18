export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6 ${className}`}>
      {children}
    </div>
  )
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12" aria-label="Loading">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const isBooked = status === 'BOOKED'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isBooked ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {status}
    </span>
  )
}
