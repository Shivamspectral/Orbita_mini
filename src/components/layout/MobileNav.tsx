import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { MENU_CONFIG, NavItem } from '../../constants'
import { useAuth } from '../../context/AuthContext'

const EXTRA_ITEMS: NavItem[] = [
  { id: 'teams', icon: 'fa-people-group', label: 'Leadership & Teams' },
  { id: 'analytics', icon: 'fa-chart-line', label: 'Analytics Board' },
  { id: 'chat', icon: 'fa-comments', label: 'Council Chat' },
  { id: 'power', icon: 'fa-bolt', label: 'Power Suite' },
  { id: 'finance', icon: 'fa-file-invoice-dollar', label: 'Finance' }
]

const MOBILE_LABELS: Record<string, string> = {
  'principal-dashboard': 'Principal',
  dashboard: 'Home',
  tasks: 'Tasks',
  events: 'Events',
  members: 'Members',
  meetings: 'Meetings',
  grievances: 'Grievances',
  teams: 'Teams',
  analytics: 'Analytics',
  chat: 'Chat',
  power: 'Power',
  finance: 'Finance'
}

function Item({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  return (
    <NavLink
      to={`/${item.id}`}
      onClick={onNavigate}
      className={({ isActive }) => `mobile-more-item${isActive ? ' active' : ''}`}
    >
      <span className="mobile-more-icon"><i className={`fa-solid ${item.icon}`} /></span>
      <span>{item.label}</span>
      <i className="fa-solid fa-chevron-right mobile-more-arrow" />
    </NavLink>
  )
}

export default function MobileNav() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)

  const items = useMemo(
    () => [...(MENU_CONFIG[user?.role || 'default'] || MENU_CONFIG.default), ...EXTRA_ITEMS],
    [user?.role]
  )

  const primary = items.slice(0, 4)
  const moreItems = items.filter((item) => !primary.some((p) => p.id === item.id))
  const activeMore = moreItems.some((item) => location.pathname === `/${item.id}`)

  useEffect(() => {
    setMoreOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!moreOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMoreOpen(false)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [moreOpen])

  return (
    <>
      {moreOpen && (
        <div className="mobile-more-overlay" onClick={() => setMoreOpen(false)}>
          <div className="mobile-more-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-more-handle" />
            <div className="mobile-more-head">
              <div>
                <span className="mobile-more-kicker">ASTRA • ORBITA MINI</span>
                <h3>More</h3>
              </div>
              <button className="mobile-sheet-close" onClick={() => setMoreOpen(false)} aria-label="Close menu">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="mobile-more-list">
              {moreItems.map((item) => <Item key={item.id} item={item} onNavigate={() => setMoreOpen(false)} />)}
              <button
                type="button"
                className="mobile-more-item mobile-more-logout"
                onClick={() => {
                  setMoreOpen(false)
                  logout()
                }}
              >
                <span className="mobile-more-icon"><i className="fa-solid fa-arrow-right-from-bracket" /></span>
                <span>Logout</span>
                <i className="fa-solid fa-chevron-right mobile-more-arrow" />
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {primary.map((item) => (
          <NavLink key={item.id} to={`/${item.id}`} className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
            <span className="mobile-nav-icon"><i className={`fa-solid ${item.icon}`} /></span>
            <span>{MOBILE_LABELS[item.id] || item.label}</span>
          </NavLink>
        ))}
        <button type="button" className={`mobile-nav-item${activeMore || moreOpen ? ' active' : ''}`} onClick={() => setMoreOpen(true)}>
          <span className="mobile-nav-icon"><i className="fa-solid fa-ellipsis" /></span>
          <span>More</span>
        </button>
      </nav>
    </>
  )
}
