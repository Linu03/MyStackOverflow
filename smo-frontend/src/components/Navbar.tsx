import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        QBoard
      </Link>
      <div className="navbar-actions">
        <Link to="/sign-in" className="navbar-button navbar-button--secondary">
          Sign in
        </Link>
        <Link to="/sign-up" className="navbar-button navbar-button--primary">
          Sign up
        </Link>
      </div>
    </nav>
  )
}
