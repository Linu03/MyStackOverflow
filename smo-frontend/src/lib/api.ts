// ─── Base ─────────────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

const STORAGE_KEY = 'smo_session'

// ─── Session helpers ──────────────────────────────────────────────────────────

export interface Session {
  access_token: string
  refresh_token: string
  user: { id: string; username: string; email: string }
}

export function getSession(): Session | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function saveSession(session: Session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
}

// ─── Fetch wrapper ────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
  withAuth = false,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (withAuth) {
    const session = getSession()
    if (session) headers['Authorization'] = `Bearer ${session.access_token}`
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  // Token expirat — incearca refresh automat
  if (res.status === 401 && withAuth) {
    const session = getSession()
    if (session?.refresh_token) {
      const refreshed = await authApi.refresh(session.refresh_token)
      if (refreshed) {
        headers['Authorization'] = `Bearer ${refreshed.access_token}`
        const retryRes = await fetch(`${API_URL}${path}`, { ...options, headers })
        if (!retryRes.ok) throw new Error((await retryRes.json()).error ?? 'Request failed')
        return retryRes.json()
      }
    }
    clearSession()
    throw new Error('Session expired. Please sign in again.')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed with status ${res.status}`)
  }

  return res.json()
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  async register(username: string, email: string, password: string): Promise<Session> {
    const data = await request<Session>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    })
    saveSession(data)
    return data
  },

  async login(email: string, password: string): Promise<Session> {
    const data = await request<Session>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    saveSession(data)
    return data
  },

  async refresh(refresh_token: string): Promise<{ access_token: string; refresh_token: string } | null> {
    try {
      const data = await request<{ access_token: string; refresh_token: string }>('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token }),
      })
      const session = getSession()
      if (session) saveSession({ ...session, ...data })
      return data
    } catch {
      return null
    }
  },
}

// ─── Questions API ────────────────────────────────────────────────────────────

import type { QuestionSummary, Question } from '../components/types'

export const questionsApi = {
  async getAll(): Promise<QuestionSummary[]> {
    return request<QuestionSummary[]>('/api/questions')
  },

  async getById(id: string): Promise<Question> {
    return request<Question>(`/api/questions/${id}`)
  },

  async create(payload: {
    title: string
    description: string
    tags?: string[]
    allow_ai_companion?: boolean
  }): Promise<Question> {
    return request<Question>('/api/questions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, true)
  },
}
