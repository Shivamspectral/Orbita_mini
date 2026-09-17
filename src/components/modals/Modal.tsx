import { ReactNode, useEffect, useState } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  maxWidth?: string
}

// Reproduces the original openModal/closeModal transition: the modal is
// mounted with class "hide", then "show" is toggled on next tick so the
// CSS transition (opacity/transform) plays, matching the original exactly.
export default function Modal({ open, onClose, children, maxWidth }: ModalProps) {
  const [rendered, setRendered] = useState(open)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (open) {
      setRendered(true)
      const t = setTimeout(() => setShown(true), 10)
      return () => clearTimeout(t)
    } else {
      setShown(false)
      const t = setTimeout(() => setRendered(false), 300)
      return () => clearTimeout(t)
    }
  }, [open])

  if (!rendered) return null

  return (
    <div className={`modal ${shown ? 'show' : ''}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={maxWidth ? { maxWidth } : undefined}>
        {children}
      </div>
    </div>
  )
}
