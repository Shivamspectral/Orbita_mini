import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import NotificationPanel, { useNotices } from './NotificationPanel'
import SettingsPanel from './SettingsPanel'

export default function Topbar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const notices = useNotices()
  const [notifOpen, setNotifOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => setUnread(notices.length), [notices.length])

  // Close panels on outside click / Escape, same as original.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (notifOpen && !target.closest('.scms-notification-panel,#header-notification-btn')) setNotifOpen(false)
      if (settingsOpen && !target.closest('.scms-settings-panel,#header-settings-btn')) setSettingsOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNotifOpen(false)
        setSettingsOpen(false)
      }
    }
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [notifOpen, settingsOpen])

  const initials = (user?.name || '')
    .split(' ')
    .map((n) => n[0])
    .join('')

  return (
    <div ref={wrapRef}>
      <header id="main-header">
        <div className="header-profile">
          <img id="user-avatar" src={`https://ui-avatars.com/api/?name=${initials}&background=e0e7ff&color=4f46e5`} alt="Profile" />
          <div className="header-profile-text">
            <p>Welcome,</p>
            <h4 id="user-name">{user?.name || 'Loading...'}</h4>
            <span id="user-role" style={{ display: 'none' }}>
              {user?.role_name}
            </span>
          </div>
        </div>

        <div className="header-actions">
          <div className="search-bar">
            <i className="fa-solid fa-magnifying-glass" />
            <input type="text" placeholder="Search" />
          </div>
          <button className="icon-btn" id="header-chat-btn" title="Open Council Chat" onClick={() => navigate('/chat')}>
            <i className="fa-regular fa-comment-dots" />
          </button>
          <button
            className="icon-btn"
            id="header-notification-btn"
            title="Notifications"
            onClick={() => {
              setSettingsOpen(false)
              setNotifOpen((v) => !v)
            }}
          >
            <i className="fa-regular fa-bell" />
            <span className="notification-dot" />
            <span id="notification-count" className="scms-unread" style={{ display: unread ? 'grid' : 'none' }}>
              {Math.min(unread, 99)}
            </span>
          </button>
          <button
            className="icon-btn"
            id="header-settings-btn"
            title="Settings"
            onClick={() => {
              setNotifOpen(false)
              setSettingsOpen((v) => !v)
            }}
          >
            <i className="fa-solid fa-gear" />
          </button>
          <span
            className="scms-command-key"
            title="Command palette (Ctrl K)"
            role="button"
            tabIndex={0}
            onClick={() => window.dispatchEvent(new Event('scms:open-command-palette'))}
          >
            Ctrl K
          </span>
        </div>
      </header>

      <NotificationPanel open={notifOpen} onMarkRead={() => { setUnread(0); setNotifOpen(false) }} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
