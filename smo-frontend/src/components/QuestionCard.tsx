import { useNavigate } from 'react-router-dom'
import type { QuestionSummary } from './types'
import TagPill from './tagPill'

interface QuestionCardProps {
  question: QuestionSummary
}

export default function QuestionCard({ question }: QuestionCardProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/question/${question.id}`)
  }

  return (
    <article className="question-card" onClick={handleClick}>
      <div className="question-card-header">
        <div>
          <h2>{question.title}</h2>
        </div>
        <span className={question.is_solved ? 'status solved' : 'status open'}>
          {question.is_solved ? 'Solved' : 'Open'}
        </span>
      </div>
      <div className="question-meta">
        <span>{question.author?.username ?? 'anonymous'}</span>
        <span>{question.vote_count} votes</span>
        <span>{question.answer_count} answers</span>
        <span>{new Date(question.created_at).toLocaleDateString()}</span>
      </div>
      <div className="question-tags">
        {question.question_tags.map((questionTag, index) => (
          <TagPill key={`${question.id}-tag-${index}`} tag={questionTag.tag} />
        ))}
      </div>
    </article>
  )
}
