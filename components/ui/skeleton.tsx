export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-overlay ${className}`} />
}

/** Row-shaped skeleton for tables, matching the padding of a real `<tr>`. */
export function SkeletonRow({ columns = 4 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-[10rem]" />
        </td>
      ))}
    </tr>
  )
}

/** Card-shaped skeleton for list pages built from stacked cards. */
export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border-light bg-white p-6">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="mt-2 h-3 w-1/2" />
      <Skeleton className="mt-4 h-3 w-2/3" />
    </div>
  )
}
