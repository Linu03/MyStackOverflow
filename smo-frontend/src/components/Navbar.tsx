export default function Navbar() {
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault()
    window.history.pushState({}, '', '/')
    window.dispatchEvent(new Event('popstate'))
  }

  const handleSignIn = (e: React.MouseEvent) => {
    e.preventDefault()
    window.history.pushState({}, '', '/sign-in')
    window.dispatchEvent(new Event('popstate'))
  }

  const handleSignUp = (e: React.MouseEvent) => {
    e.preventDefault()
    window.history.pushState({}, '', '/sign-up')
    window.dispatchEvent(new Event('popstate'))
  }

  return (
    <nav className="navbar">
      <a href="/" onClick={handleLogoClick} className="navbar-logo">
        QBoard
      </a>
      <div className="navbar-actions">
        <a href="/sign-in" onClick={handleSignIn} className="navbar-button navbar-button--secondary">
          Sign in
        </a>
        <a href="/sign-up" onClick={handleSignUp} className="navbar-button navbar-button--primary">
          Sign up
        </a>
      </div>
    </nav>
  )
}
