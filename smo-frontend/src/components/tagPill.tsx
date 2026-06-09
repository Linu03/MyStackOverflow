import type { Tag } from './types'

interface TagPillProps {
  tag: Tag
  onRemove?: () => void
}

export default function TagPill({ tag, onRemove }: TagPillProps) {
  return (
    <span className="tag-pill">
      {tag.name}
      {onRemove && (
        <button
          type="button"
          className="tag-pill-remove"
          onClick={onRemove}
          aria-label={`Remove ${tag.name}`}
        >
          ×
        </button>
      )}
    </span>
  )
}
