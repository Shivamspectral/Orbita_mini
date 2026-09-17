// Data adapter for the existing FastAPI backend.
// Ported 1:1 from the original index.html `apiFetch()` / postData / patchData /
// deleteData. Same base URL resolution (window.ORBITA_API_BASE, set by
// /api-config.js), same '/api' prefix, same Bearer token header, same
// error shape. Nothing about the API contract has changed.

const TOKEN_KEY = 'scms_auth_token_v2'

let authToken: string | null = null
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn
}

export function getToken(): string | null {
  if (authToken === null) {
    authToken = localStorage.getItem(TOKEN_KEY) || ''
  }
  return authToken || null
}

export function setToken(token: string) {
  authToken = token
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  authToken = ''
  localStorage.removeItem(TOKEN_KEY)
}

interface ApiFetchOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
  skipAuth?: boolean
}

declare global {
  interface Window {
    ORBITA_API_BASE?: string
  }
}

export async function apiFetch<T = any>(endpoint: string, options: ApiFetchOptions = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase()
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const token = getToken()
  if (token && options.skipAuth !== true) headers.Authorization = `Bearer ${token}`

  let body: BodyInit | undefined
  if (options.body !== undefined) {
    body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
  }

  const base = (window.ORBITA_API_BASE || '').replace(/\/$/, '')
  if (!base) {
    throw new Error('Backend API URL is not configured. Set ORBITA_API_BASE for this deployment.')
  }

  let response: Response
  try {
    response = await fetch(base + '/api' + endpoint, { method, headers, body, cache: 'no-store' })
  } catch (e) {
    throw new Error('Backend unavailable. Start the Orbita FastAPI server and try again.')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401) {
      clearToken()
      onUnauthorized?.()
    }
    throw new Error(data.detail || data.error || `API request failed (${response.status})`)
  }
  return data as T
}

export async function postData(endpoint: string, payload: unknown): Promise<void> {
  await apiFetch(endpoint, { method: 'POST', body: payload })
}

export async function patchData(endpoint: string, payload: unknown): Promise<void> {
  await apiFetch(endpoint, { method: 'PATCH', body: payload })
}

export async function deleteData(endpoint: string): Promise<void> {
  await apiFetch(endpoint, { method: 'DELETE' })
}
