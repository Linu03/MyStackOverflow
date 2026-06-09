import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const { isAuthenticated, user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = () => {
    signOut()
    navigate('/')
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        QBoard
      </Link>
      <div className="navbar-actions">
        {isAuthenticated ? (
          <>
            <span className="navbar-username">{user?.username}</span>
            <button onClick={handleSignOut} className="navbar-button navbar-button--secondary">
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link to="/sign-in" className="navbar-button navbar-button--secondary">
              Sign in
            </Link>
            <Link to="/sign-up" className="navbar-button navbar-button--primary">
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
