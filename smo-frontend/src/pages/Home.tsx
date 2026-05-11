import questions from '../mockData'
import TagPill from '../components/tagPill'
import Navbar from '../components/Navbar'

export default function Home() {
  return (
    <main className="app-container">
      <Navbar />
      <header className="app-header">
        <p className="eyebrow">Internal Dashboard</p>
        <h1>Questions & Answers</h1>
        <p>Centralized knowledge base for team collaboration and problem solving.</p>
      </header>

      <section className="question-list">
        {questions.map((question) => (
          <article key={question.id} className="question-card">
            <div className="question-card-header">
              <div>
                <h2>{question.title}</h2>
              </div>
              <span className={question.is_solved ? 'status solved' : 'status open'}>
                {question.is_solved ? 'Solved' : 'Open'}
              </span>
            </div>
            <p className="question-description">{question.description}</p>
            <div className="question-meta">
              <span>{question.author?.username ?? 'anonymous'}</span>
              <span>{question.vote_count} votes</span>
              <span>{question.answers.length} answers</span>
              <span>{new Date(question.created_at).toLocaleDateString()}</span>
            </div>
            <div className="question-tags">
              {question.question_tags.map((questionTag, index) => (
                <TagPill key={`${question.id}-tag-${index}`} tag={questionTag.tag} />
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}
