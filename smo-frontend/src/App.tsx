import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import QuestionDetails from './pages/QuestionDetails'
import AskQuestion from './pages/AskQuestion'
import { getSession } from './lib/api'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const session = getSession()
  if (!session) return <Navigate to="/sign-in" replace />
  return <>{children}</>
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const session = getSession()
  if (session) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  const location = useLocation()

  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><Home key={location.key} /></ProtectedRoute>} />
      <Route path="/sign-in" element={<GuestRoute><SignIn /></GuestRoute>} />
      <Route path="/sign-up" element={<GuestRoute><SignUp /></GuestRoute>} />
      <Route path="/questions/new" element={<ProtectedRoute><AskQuestion /></ProtectedRoute>} />
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
