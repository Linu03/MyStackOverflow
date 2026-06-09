import { useState, useEffect } from 'react'
import { authApi, getSession, clearSession } from '../lib/api'

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
    const session = getSession()
    if (session?.user) {
      setState({ user: session.user, isAuthenticated: true, isLoading: false, error: null })
    } else {
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [])

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const session = await authApi.login(email, password)
      setState({ user: session.user, isAuthenticated: true, isLoading: false, error: null })
      return true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign in failed'
      setState((prev) => ({ ...prev, isLoading: false, error: message }))
      return false
    }
  }

  const signUp = async (username: string, email: string, password: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const session = await authApi.register(username, email, password)
      setState({ user: session.user, isAuthenticated: true, isLoading: false, error: null })
      return true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign up failed'
      setState((prev) => ({ ...prev, isLoading: false, error: message }))
      return false
    }
  }

  const signOut = () => {
    clearSession()
    setState({ user: null, isAuthenticated: false, isLoading: false, error: null })
  }

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
