import { Search } from 'lucide-react'

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div className="relative flex-1 sm:max-w-xs">
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="block w-full rounded-[8px] border border-border-light py-2 pl-10 pr-3.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  )
}

export function StatusFilter<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T | 'all'
  onChange: (value: T | 'all') => void
  options: { value: T; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T | 'all')}
      aria-label="Filter by status"
      className="rounded-[8px] border border-border-light px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <option value="all">All statuses</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

/** Layout wrapper: search + filter(s) side by side on desktop, stacked on mobile. */
export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-center">{children}</div>
}
