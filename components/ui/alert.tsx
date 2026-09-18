import { AlertCircle, CheckCircle2, Info } from 'lucide-react'

type AlertProps = {
  kind?: 'error' | 'success' | 'info'
  children: React.ReactNode
}

const KIND_CLASSES = {
  error: 'bg-red-50 text-red-700 border-red-200',
  success: 'bg-green-50 text-green-700 border-green-200',
  info: 'bg-primary-50 text-primary border-border-light',
}

const KIND_ICONS = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
}

export function Alert({ kind = 'info', children }: AlertProps) {
  const Icon = KIND_ICONS[kind]
  return (
    <div role="alert" className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm ${KIND_CLASSES[kind]}`}>
      <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
