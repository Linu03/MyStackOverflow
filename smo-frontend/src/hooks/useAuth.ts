import { useState, useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  username: string
  email: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

// ─── Mock "database" ─────────────────────────────────────────────────────────

interface MockAccount {
  id: string
  username: string
  email: string
  password: string
}

const MOCK_USERS: MockAccount[] = [
  { id: 'u1', username: 'frontend_dev', email: 'frontend@example.com', password: 'password123' },
  { id: 'u2', username: 'css_master',   email: 'css@example.com',      password: 'password123' },
  { id: 'u3', username: 'react_student',email: 'react@example.com',    password: 'password123' },
  { id: 'u4', username: 'react_guru',   email: 'guru@example.com',     password: 'password123' },
  { id: 'u5', username: 'db_admin',     email: 'db@example.com',       password: 'password123' },
  { id: 'u6', username: 'backend_dev',  email: 'backend@example.com',  password: 'password123' },
]

const STORAGE_KEY = 'smo_auth_user'

// ─── Simulated async delay ────────────────────────────────────────────────────

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  })

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const user: User = JSON.parse(stored)
        setState({ user, isAuthenticated: true, isLoading: false, error: null })
      } catch {
        localStorage.removeItem(STORAGE_KEY)
        setState((prev) => ({ ...prev, isLoading: false }))
      }
    } else {
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [])

  /**
   * Sign in with username + password.
   * Returns true on success, false on failure.
   */
  const signIn = async (username: string, password: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    await delay(400) // simulate network latency

    const account = MOCK_USERS.find(
      (u) => u.username === username && u.password === password,
    )

    if (!account) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Invalid username or password.',
      }))
      return false
    }

    const user: User = { id: account.id, username: account.username, email: account.email }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    setState({ user, isAuthenticated: true, isLoading: false, error: null })
    return true
  }

  /**
   * Register a new account.
   * Returns true on success, false if the username/email is already taken.
   */
  const signUp = async (
    username: string,
    email: string,
    password: string,
  ): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    await delay(400)

    const usernameTaken = MOCK_USERS.some((u) => u.username === username)
    if (usernameTaken) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Username is already taken.',
      }))
      return false
    }

    const emailTaken = MOCK_USERS.some((u) => u.email === email)
    if (emailTaken) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Email is already registered.',
      }))
      return false
    }

    // Add to the in-memory mock store
    const newAccount: MockAccount = {
      id: `u${Date.now()}`,
      username,
      email,
      password,
    }
    MOCK_USERS.push(newAccount)

    const user: User = { id: newAccount.id, username, email }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    setState({ user, isAuthenticated: true, isLoading: false, error: null })
    return true
  }

  /** Clear the current session. */
  const signOut = () => {
    localStorage.removeItem(STORAGE_KEY)
    setState({ user: null, isAuthenticated: false, isLoading: false, error: null })
  }

  /** Manually clear any auth error. */
  const clearError = () => {
    setState((prev) => ({ ...prev, error: null }))
  }

  return {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    signIn,
    signUp,
    signOut,
    clearError,
  }
}
