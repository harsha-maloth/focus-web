/** Placeholder rows shown while a list loads. Announces "Loading" once; the shapes are decoration. */
export function SkeletonRows({ count = 3, label = 'Loading' }: { count?: number; label?: string }) {
  return (
    <div className="skeleton-list" role="status" aria-busy="true">
      <span className="sr-only">{label}…</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-row" aria-hidden="true">
          <span className="skeleton-line skeleton-line--wide" />
          <span className="skeleton-line skeleton-line--short" />
        </div>
      ))}
    </div>
  )
}

/** Placeholder for the Stats summary cards. */
export function SkeletonCards({ count = 4, label = 'Loading' }: { count?: number; label?: string }) {
  return (
    <div className="stat-grid" role="status" aria-busy="true">
      <span className="sr-only">{label}…</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="stat-card" aria-hidden="true">
          <span className="skeleton-line skeleton-line--short" />
          <span className="skeleton-line skeleton-line--wide skeleton-line--tall" />
        </div>
      ))}
    </div>
  )
}
