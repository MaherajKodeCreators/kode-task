import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Pagination({
  page,
  pageCount,
  onChange,
  totalItems,
  pageSize,
}: {
  page: number
  pageCount: number
  onChange: (page: number) => void
  /** When given with `pageSize`, shows "Showing X-Y of Z". */
  totalItems?: number
  pageSize?: number
}) {
  if (pageCount <= 1) return null

  const range =
    totalItems !== undefined && pageSize
      ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalItems)} of ${totalItems}`
      : null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
      {range && <p className="text-xs text-text-secondary">{range}</p>}
      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border-light text-text-secondary hover:bg-surface-overlay disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <span className="px-2 text-xs font-medium text-text-secondary">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border-light text-text-secondary hover:bg-surface-overlay disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
