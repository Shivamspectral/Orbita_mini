import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { apiFetch, getToken, setToken, clearToken, setUnauthorizedHandler } from '../services/api'
import type { User } from '../types'

const SESSION_KEY = 'scms_frontend_session_v1'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const clearSession = useCallback(() => {
    clearToken()
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(clearSession)
  }, [clearSession])

  useEffect(() => {
    ;(async () => {
      const token = getToken()
      if (token) {
        try {
          const profile = await apiFetch<User>('/auth/me')
          if (profile) setUser(profile)
        } catch {
          clearSession()
        }
      }
      setLoading(false)
    })()
  }, [clearSession])

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiFetch<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { email, password },
      skipAuth: true
    })
    if (!result?.token || !result?.user) throw new Error('Invalid credentials.')
    setToken(result.token)
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user: result.user, loginAt: new Date().toISOString() }))
    setUser(result.user)
    return result.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' })
    } catch {
      // same as original: ignore logout errors, clear session regardless
    }
    clearSession()
  }, [clearSession])

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
