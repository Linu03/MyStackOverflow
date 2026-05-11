import { useState, useEffect } from 'react'
import './App.css'
import Home from './pages/Home'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'

function App() {
  const [currentPage, setCurrentPage] = useState('home')

  useEffect(() => {
    const path = window.location.pathname
    if (path === '/sign-in') {
      setCurrentPage('sign-in')
    } else if (path === '/sign-up') {
      setCurrentPage('sign-up')
    } else {
      setCurrentPage('home')
    }
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname
      if (path === '/sign-in') {
        setCurrentPage('sign-in')
      } else if (path === '/sign-up') {
        setCurrentPage('sign-up')
      } else {
        setCurrentPage('home')
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (page: string) => {
    if (page === 'home') {
      window.history.pushState({}, '', '/')
    } else if (page === 'sign-in') {
      window.history.pushState({}, '', '/sign-in')
    } else if (page === 'sign-up') {
      window.history.pushState({}, '', '/sign-up')
    }
    setCurrentPage(page)
  }

  if (currentPage === 'sign-in') {
    return <SignIn />
  }

  if (currentPage === 'sign-up') {
    return <SignUp />
  }

  return <Home />
}

export default App
