import { Inbox } from 'lucide-react'

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border-light bg-white p-6 ${className}`}>
      {children}
    </div>
  )
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border-light p-8 text-center">
      <Inbox className="mx-auto h-8 w-8 text-text-secondary" strokeWidth={1.5} aria-hidden />
      <p className="mt-3 text-sm font-medium text-text-primary">{title}</p>
      {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12" aria-label="Loading">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const isBooked = status === 'BOOKED'
  return (
    <span
      className={`inline-flex items-center justify-center rounded-sm px-3 py-0.5 text-xs font-medium ${
        isBooked ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'
      }`}
    >
      {status}
    </span>
  )
}
