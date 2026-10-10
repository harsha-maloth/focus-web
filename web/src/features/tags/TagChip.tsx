import type { Tag } from '../../lib/types'

export function TagChip({ tag }: { tag: Pick<Tag, 'name' | 'color'> }) {
  return (
    <span className="tag-chip">
      <span className="tag-dot" style={{ background: tag.color }} aria-hidden="true" />
      {tag.name}
    </span>
  )
}
