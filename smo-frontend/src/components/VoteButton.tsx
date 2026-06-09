import { useState, useEffect } from 'react'

export interface VoteResult {
  vote_count: number
  upvotes: number
  downvotes: number
}

interface VoteButtonProps {
  upvotes: number
  downvotes: number
  onVote: (value: 1 | -1) => Promise<VoteResult>
  disabled?: boolean
}

export default function VoteButton({ upvotes, downvotes, onVote, disabled }: VoteButtonProps) {
  const [displayUp, setDisplayUp] = useState(upvotes)
  const [displayDown, setDisplayDown] = useState(downvotes)
  const [isVoting, setIsVoting] = useState(false)

  useEffect(() => {
    setDisplayUp(upvotes)
    setDisplayDown(downvotes)
  }, [upvotes, downvotes])

  async function handleVote(value: 1 | -1) {
    const prev = { up: displayUp, down: displayDown }

    if (value === 1) {
      setDisplayUp((c) => c + 1)
    } else {
      setDisplayDown((c) => c + 1)
    }

    setIsVoting(true)
    try {
      const result = await onVote(value)
      setDisplayUp(result.upvotes)
      setDisplayDown(result.downvotes)
    } catch {
      setDisplayUp(prev.up)
      setDisplayDown(prev.down)
    } finally {
      setIsVoting(false)
    }
  }

  return (
    <div className="vote-button">
      <div className="vote-button__group">
        <button
          type="button"
          className="vote-button__arrow"
          onClick={() => handleVote(1)}
          disabled={disabled || isVoting}
          aria-label="Upvote"
        >
          ▲
        </button>
        <span className="vote-button__count vote-button__count--up">{displayUp}</span>
      </div>

      <div className="vote-button__group">
        <button
          type="button"
          className="vote-button__arrow"
          onClick={() => handleVote(-1)}
          disabled={disabled || isVoting}
          aria-label="Downvote"
        >
          ▼
        </button>
        <span className="vote-button__count vote-button__count--down">{displayDown}</span>
      </div>
    </div>
  )
}
