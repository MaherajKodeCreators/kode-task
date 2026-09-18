import { useMemo, useState } from 'react'

export const DEFAULT_PAGE_SIZE = 10

/**
 * Client-side pagination over an already-filtered array. Lists in this app
 * are small (tens to low hundreds of rows), so paging in the browser avoids
 * a round trip and keeps the API simple - revisit with server-side paging
 * only if a list genuinely grows past a few thousand rows.
 */
export function usePagination<T>(items: T[], pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1)

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  // Clamp so switching filters (which can shrink the list) never strands the
  // user on a page that no longer exists.
  const safePage = Math.min(page, pageCount)

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, safePage, pageSize])

  function goToPage(next: number) {
    setPage(Math.min(Math.max(1, next), pageCount))
  }

  /** Call when a filter changes so the view resets to page 1. */
  function resetPage() {
    setPage(1)
  }

  return { page: safePage, pageCount, pageItems, goToPage, resetPage }
}
