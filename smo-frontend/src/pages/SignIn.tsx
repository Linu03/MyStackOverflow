import { useState } from 'react'
import Navbar from '../components/Navbar'

export default function SignIn() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username || !password) {
      setError('Please fill in all fields')
      return
    }

    console.log('Sign in attempt:', { username, password })
    // alert(`Signed in as ${username}`)
  }

  return (
    <main className="app-container">
      <Navbar />

      <div className="auth-wrapper">
        <div className="auth-card">
          <header className="auth-header">
            <h1>Sign In</h1>
            <p>Welcome back to QBoard</p>
          </header>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="form-error">{error}</div>}

            <div className="form-group">
              <label htmlFor="username" className="form-label">
                Username
              </label>
              <input
                id="username"
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>

            <button type="submit" className="form-button">
              Sign In
            </button>
          </form>

          <footer className="auth-footer">
            <p>
              Don't have an account?{' '}
              <a href="/sign-up" className="auth-link">
                Sign up
              </a>
            </p>
          </footer>
        </div>
      </div>
    </main>
  )
}
