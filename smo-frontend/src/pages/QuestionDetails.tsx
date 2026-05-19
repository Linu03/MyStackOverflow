import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import type { Question } from '../components/types'
import questions from '../mockData'
import Navbar from '../components/Navbar'
import TagPill from '../components/tagPill'

export default function QuestionDetails() {
  const { id } = useParams<{ id: string }>()
  const [question, setQuestion] = useState<Question | null>(null)

  useEffect(() => {
    if (id) {
      const foundQuestion = questions.find(q => q.id === id)
      setQuestion(foundQuestion || null)
    }
  }, [id])

  if (!question) {
    return (
      <main className="app-container">
        <Navbar />
        <div className="question-not-found">
          <h1>Question not found</h1>
          <p>The question you're looking for doesn't exist.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="app-container">
      <Navbar />
      <article className="question-details">
        <header className="question-header">
          <div className="question-title-section">
            <h1>{question.title}</h1>
            <span className={question.is_solved ? 'status solved' : 'status open'}>
              {question.is_solved ? 'Solved' : 'Open'}
            </span>
          </div>
          <div className="question-meta">
            <span>Asked by {question.author?.username ?? 'anonymous'}</span>
            <span>{question.vote_count} votes</span>
            <span>{question.answers.length} answers</span>
            <span>{new Date(question.created_at).toLocaleDateString()}</span>
          </div>
          <div className="question-tags">
            {question.question_tags.map((questionTag, index) => (
              <TagPill key={`${question.id}-tag-${index}`} tag={questionTag.tag} />
            ))}
          </div>
        </header>

        <section className="question-description">
          <h2>Question</h2>
          <p>{question.description}</p>
        </section>

        <section className="question-comments">
          <h3>Comments ({question.comments.length})</h3>
          {question.comments.length > 0 ? (
            <div className="comments-list">
              {question.comments.map(comment => (
                <div key={comment.id} className="comment">
                  <div className="comment-meta">
                    <span className="comment-author">{comment.author?.username ?? 'anonymous'}</span>
                    <span className="comment-date">{new Date(comment.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="comment-body">{comment.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-comments">No comments yet.</p>
          )}
        </section>

        <section className="question-answers">
          <h2>Answers ({question.answers.length})</h2>
          {question.answers.length > 0 ? (
            <div className="answers-list">
              {question.answers.map(answer => (
                <div key={answer.id} className="answer">
                  <div className="answer-header">
                    <div className="answer-meta">
                      <span className="answer-author">{answer.author?.username ?? 'anonymous'}</span>
                      <span className="answer-date">{new Date(answer.created_at).toLocaleDateString()}</span>
                      {answer.is_accepted && <span className="accepted-badge">Accepted Answer</span>}
                      {answer.is_ai_generated && <span className="ai-badge">AI Generated</span>}
                    </div>
                    <div className="answer-votes">
                      <span>{answer.vote_count} votes</span>
                    </div>
                  </div>
                  <div className="answer-body">
                    <p>{answer.body}</p>
                  </div>
                  {answer.comments.length > 0 && (
                    <div className="answer-comments">
                      <h4>Comments ({answer.comments.length})</h4>
                      {answer.comments.map(comment => (
                        <div key={comment.id} className="comment">
                          <div className="comment-meta">
                            <span className="comment-author">{comment.author?.username ?? 'anonymous'}</span>
                            <span className="comment-date">{new Date(comment.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="comment-body">{comment.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="no-answers">No answers yet. Be the first to answer!</p>
          )}
        </section>
      </article>
    </main>
  )
}