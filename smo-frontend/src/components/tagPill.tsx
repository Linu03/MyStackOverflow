import type { Tag } from './types'

interface TagPillProps {
  tag: Tag
}

export default function TagPill({ tag }: TagPillProps) {
  return <span className="tag-pill">{tag.name}</span>
}
