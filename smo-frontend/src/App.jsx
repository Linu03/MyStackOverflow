import questions from './mockData'
import './App.css'

function App() {
  return (
    <main className="app-container">
      <header className="app-header">
        <div>
          <h1>Mock Questions</h1>
          <p>Example data for question cards. This page now shows the mock questions directly.</p>
        </div>
      </header>

      <section className="question-list">
        {questions.map((question) => (
          <article key={question.id} className="question-card">
            <div className="question-card-header">
              <h2>{question.title}</h2>
              <span className={question.is_solved ? 'status solved' : 'status open'}>
                {question.is_solved ? 'Solved' : 'Open'}
              </span>
            </div>
            <p className="question-description">{question.description}</p>
            <div className="question-meta">
              <span>Votes: {question.vote_count}</span>
              <span>Answers: {question.answers.length}</span>
              <span>Author: {question.author?.username ?? 'anonymous'}</span>
            </div>
            <div className="question-tags">
              {question.question_tags.map((tagItem, index) => (
                <span key={`${question.id}-tag-${index}`} className="tag">
                  {tagItem.tag.name}
                </span>
              ))}
            </div>
          </article>
        ))}
      </section>

      <footer className="app-footer">
        <p>These questions are stored in mock data and rendered from the app.</p>
      </footer>
    </main>
  )
}

export default App