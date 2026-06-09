import { useState, useEffect } from 'react'
import { questionsApi } from '../lib/api'
import QuestionCard from '../components/QuestionCard'
import Navbar from '../components/Navbar'
import type { QuestionSummary } from '../components/types'

export default function Home() {
  const [questions, setQuestions] = useState<QuestionSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    questionsApi.getAll()
      .then(setQuestions)
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load questions'
        setError(message)
      })
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <main className="app-container">
      <Navbar />
      <header className="app-header">
        <p className="eyebrow">Internal Dashboard</p>
        <h1>Questions & Answers</h1>
        <p>Centralized knowledge base for team collaboration and problem solving.</p>
      </header>

      <section className="question-list">
        {isLoading && <p>Loading questions...</p>}
        {error && <p className="form-error">{error}</p>}
        {!isLoading && !error && questions.length === 0 && (
          <p>No questions yet. Be the first to ask!</p>
        )}
        {questions.map((question) => (
          <QuestionCard key={question.id} question={question} />
        ))}
      </section>
    </main>
  )
}
