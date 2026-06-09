import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../hooks/useAuth'

export default function SignUp() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const { signUp, isLoading, error, clearError } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    clearError()

    if (!username || !email || !password) {
      setLocalError('Please fill in all fields')
      return
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters')
      return
    }

    const success = await signUp(username, email, password)
    if (success) navigate('/', { replace: true })
  }

  const displayError = localError || error

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
            {displayError && <div className="form-error">{displayError}</div>}

            <div className="form-group">
              <label htmlFor="username" className="form-label">Username</label>
              <input
                id="username"
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                id="email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password (min 6 chars)"
                required
              />
            </div>

            <button type="submit" className="form-button" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <footer className="auth-footer">
            <p>
              Already have an account?{' '}
              <a href="/sign-in" className="auth-link">Sign in</a>
            </p>
          </footer>
        </div>
      </div>
    </main>
  )
}
