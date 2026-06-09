import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import QuestionDetails from './pages/QuestionDetails'
import { getSession } from './lib/api'

function GuestRoute({ children }: { children: React.ReactNode }) {
  const session = getSession()
  if (session) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  const location = useLocation()

  return (
    <Routes>
      <Route path="/" element={<Home key={location.key} />} />
      <Route path="/sign-in" element={<GuestRoute><SignIn /></GuestRoute>} />
      <Route path="/sign-up" element={<GuestRoute><SignUp /></GuestRoute>} />
      <Route path="/question/:id" element={<QuestionDetails />} />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  )
}

export default App
