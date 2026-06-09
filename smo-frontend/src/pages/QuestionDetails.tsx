import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import type { Question } from '../components/types'
import { questionsApi, answersApi } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/Navbar'
import TagPill from '../components/tagPill'
import VoteButton, { type VoteResult } from '../components/VoteButton'

export default function QuestionDetails() {
  const { id } = useParams<{ id: string }>()
  const { isAuthenticated, user } = useAuth()
  const [question, setQuestion] = useState<Question | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [answerBody, setAnswerBody] = useState('')
  const [answerError, setAnswerError] = useState('')
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    questionsApi.getById(id)
      .then(setQuestion)
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load question'
        setError(message)
      })
      .finally(() => setIsLoading(false))
  }, [id])

  useEffect(() => {
    if (!id || !question?.allow_ai_companion) return
    const hasAiAnswer = question.answers.some((a) => a.is_ai_generated)
    if (hasAiAnswer || question.is_solved) return

    const interval = setInterval(() => {
      questionsApi.getById(id).then(setQuestion).catch(() => {})
    }, 5000)

    const timeout = setTimeout(() => clearInterval(interval), 60000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [id, question?.allow_ai_companion, question?.is_solved, question?.answers.length])

  async function handleSubmitAnswer(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return

    setAnswerError('')
    if (!answerBody.trim()) {
      setAnswerError('Answer cannot be empty')
      return
    }

    setIsSubmittingAnswer(true)
    try {
      const newAnswer = await answersApi.create(id, answerBody.trim())
      setQuestion((prev) =>
        prev ? { ...prev, answers: [...prev.answers, newAnswer] } : prev
      )
      setAnswerBody('')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to post answer'
      setAnswerError(message)
    } finally {
      setIsSubmittingAnswer(false)
    }
  }

  async function handleVote(value: 1 | -1): Promise<VoteResult> {
    if (!id) throw new Error('Question not found')
    const result = await questionsApi.vote(id, value)
    setQuestion((prev) =>
      prev
        ? { ...prev, vote_count: result.vote_count, upvotes: result.upvotes, downvotes: result.downvotes }
        : prev
    )
    return result
  }

  async function handleAccept(answerId: string) {
    setAcceptingId(answerId)
    try {
      const updated = await answersApi.accept(answerId)
      setQuestion((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          is_solved: true,
          answers: prev.answers.map((a) =>
            a.id === updated.id
              ? updated
              : { ...a, is_accepted: false }
          ),
        }
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to accept answer'
      setAnswerError(message)
    } finally {
      setAcceptingId(null)
    }
  }

  const isQuestionAuthor = user?.id === question?.author_id

  if (isLoading) {
    return (
      <main className="app-container">
        <Navbar />
        <p>Loading...</p>
      </main>
    )
  }

  if (error || !question) {
    return (
      <main className="app-container">
        <Navbar />
        <div className="question-not-found">
          <h1>Question not found</h1>
          <p>{error ?? "The question you're looking for doesn't exist."}</p>
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
            {isAuthenticated ? (
              <VoteButton
                upvotes={question.upvotes ?? 0}
                downvotes={question.downvotes ?? 0}
                onVote={handleVote}
              />
            ) : (
              <span className="vote-button vote-button--readonly">
                <span className="vote-button__count vote-button__count--up">▲ {question.upvotes ?? 0}</span>
                <span className="vote-button__count vote-button__count--down">▼ {question.downvotes ?? 0}</span>
              </span>
            )}
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

          {isAuthenticated ? (
            <form className="answer-form" onSubmit={handleSubmitAnswer}>
              <label htmlFor="answer-body" className="form-label">Your answer</label>
              <textarea
                id="answer-body"
                className="form-input form-textarea"
                value={answerBody}
                onChange={(e) => setAnswerBody(e.target.value)}
                placeholder="Write your answer here..."
                rows={4}
              />
              {answerError && <p className="field-error">{answerError}</p>}
              <button type="submit" className="form-button" disabled={isSubmittingAnswer}>
                {isSubmittingAnswer ? 'Posting...' : 'Post answer'}
              </button>
            </form>
          ) : (
            <p className="answer-sign-in-hint">
              <Link to="/sign-in">Sign in</Link> to post an answer.
            </p>
          )}

          {question.allow_ai_companion &&
            !question.is_solved &&
            !question.answers.some((a) => a.is_ai_generated) && (
            <p className="companion-waiting">AI Companion is working on an answer…</p>
          )}

          {question.answers.length > 0 ? (
            <div className="answers-list">
              {question.answers.map(answer => (
                <div
                  key={answer.id}
                  className={
                    answer.is_accepted
                      ? 'answer answer--accepted'
                      : answer.is_ai_generated
                        ? 'answer answer--ai'
                        : 'answer'
                  }
                >
                  <div className="answer-header">
                    <div className="answer-meta">
                      <span className="answer-author">{answer.author?.username ?? 'anonymous'}</span>
                      <span className="answer-date">{new Date(answer.created_at).toLocaleDateString()}</span>
                      {answer.is_ai_generated && <span className="ai-badge">AI Generated</span>}
                      {answer.is_accepted && <span className="accepted-badge">Accepted Answer</span>}
                    </div>
                    <div className="answer-votes">
                      <span>{answer.vote_count} votes</span>
                    </div>
                  </div>
                  <div className="answer-body">
                    <p>{answer.body}</p>
                  </div>
                  {isQuestionAuthor && !answer.is_accepted && (
                    <button
                      type="button"
                      className="accept-answer-button"
                      onClick={() => handleAccept(answer.id)}
                      disabled={acceptingId === answer.id}
                    >
                      {acceptingId === answer.id ? 'Accepting...' : 'Accept answer'}
                    </button>
                  )}
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
