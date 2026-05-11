import { useState } from 'react'
import Navbar from '../components/Navbar'

export default function SignUp() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username || !email || !password) {
      setError('Please fill in all fields')
      return
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    console.log('Sign up attempt:', { username, email, password })
    alert(`Account created for ${username}`)
  }

  return (
    <main className="app-container">
      <Navbar />

      <div className="auth-wrapper">
        <div className="auth-card">
          <header className="auth-header">
            <h1>Sign Up</h1>
            <p>Create your QBoard account</p>
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
                placeholder="Choose a username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
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
                placeholder="Create a password (min 6 chars)"
              />
            </div>

            <button type="submit" className="form-button">
              Sign Up
            </button>
          </form>

          <footer className="auth-footer">
            <p>
              Already have an account?{' '}
              <a href="/sign-in" className="auth-link">
                Sign in
              </a>
            </p>
          </footer>
        </div>
      </div>
    </main>
  )
}
