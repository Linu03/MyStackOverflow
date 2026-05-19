import questions from '../mockData'
import TagPill from '../components/tagPill'
import QuestionCard from '../components/QuestionCard'
import Navbar from '../components/Navbar'
import type { QuestionSummary } from '../components/types'

export default function Home() {
  // Convert questions to QuestionSummary format
  const questionSummaries: QuestionSummary[] = questions.map(question => ({
    id: question.id,
    title: question.title,
    is_solved: question.is_solved,
    vote_count: question.vote_count,
    created_at: question.created_at,
    author: question.author,
    question_tags: question.question_tags,
    answer_count: question.answers.length
  }))

  return (
    <main className="app-container">
      <Navbar />
      <header className="app-header">
        <p className="eyebrow">Internal Dashboard</p>
        <h1>Questions & Answers</h1>
        <p>Centralized knowledge base for team collaboration and problem solving.</p>
      </header>

      <section className="question-list">
        {questionSummaries.map((question) => (
          <QuestionCard key={question.id} question={question} />
        ))}
      </section>
    </main>
  )
}
