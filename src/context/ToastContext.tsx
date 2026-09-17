import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react'

type ToastType = 'success' | 'error'
interface ToastItem {
  id: number
  message: string
  type: ToastType
  leaving: boolean
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++idRef.current
    setToasts((t) => [...t, { id, message, type, leaving: false }])
    // Same timing as original: visible ~3s, then slide-out animation.
    setTimeout(() => {
      setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x)))
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 300)
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div id="toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast ${t.type}`}
            style={t.leaving ? { opacity: 0, transform: 'translateX(100%)', transition: 'all .3s' } : undefined}
          >
            <i className={`fa-solid ${t.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`} /> {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx.showToast
}
