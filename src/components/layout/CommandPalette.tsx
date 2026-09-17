import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { exportFullSnapshot } from '../../utils/export'
import EmptyState from '../common/EmptyState'

// Ported from the original's COMMANDS array / renderCommandPalette() /
// openCommandPalette() / closeCommandPalette() (~line 1909 in
// _reference/original_index.html). Page entries navigate with React Router
// instead of clicking a `.nav-item`; the rest call the equivalent local
// action.
//
// Left out on purpose:
// - 'settings' (toggleSettings): the settings panel's open/closed state
//   lives in Topbar, not anywhere global yet. Wiring this needs either
//   lifting that state up or a shared event bus.
// - 'operations': the original's Operations Hub page isn't part of this
//   migration at all (not in MENU_CONFIG / App.tsx), so it's dropped
//   rather than pointed at a route that doesn't exist.
//
// 'briefing' (generateSCMSBriefing) is wired below. The original calls that
// function directly, which writes into the Power Suite's assistant panel
// without navigating there -- from any other page the command silently does
// nothing until you happen to open Power Suite later. Since the Power page
// isn't mounted outside its own route in this SPA, a literal port would do
// nothing at all, which is worse. Instead this navigates to /power with
// { state: { briefing: true } }; Power.tsx generates the briefing and
// switches to its assistant tab when it sees that state. Deliberate
// deviation from the original, flagged in README.md.
interface Command {
  id: string
  label: string
  icon: string
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { tasks, events, meetings, members, grievances, loadAll } = useData()
  const { user } = useAuth()
  const showToast = useToast()

  const commands: Command[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-border-all' },
    { id: 'tasks', label: 'Task Center', icon: 'fa-clipboard-check' },
    { id: 'events', label: 'Event Management', icon: 'fa-calendar' },
    { id: 'members', label: 'Member Directory', icon: 'fa-users' },
    { id: 'meetings', label: 'Meeting Management', icon: 'fa-handshake' },
    { id: 'finance', label: 'Finance & Budget • Future Update', icon: 'fa-chart-pie' },
    { id: 'grievances', label: 'Student Grievances', icon: 'fa-shield' },
    { id: 'analytics', label: 'Analytics Board', icon: 'fa-chart-line' },
    { id: 'chat', label: 'Council Connect', icon: 'fa-comments' },
    { id: 'power', label: 'SCMS Power Suite', icon: 'fa-bolt' },
    { id: 'briefing', label: 'Generate daily council briefing', icon: 'fa-wand-magic-sparkles' },
    { id: 'refresh', label: 'Refresh all data', icon: 'fa-rotate' },
    { id: 'export', label: 'Export full snapshot', icon: 'fa-file-export' },
    { id: 'print', label: 'Print current page', icon: 'fa-print' }
  ]

  const runCommand = (id: string) => {
    switch (id) {
      case 'refresh':
        loadAll()
        showToast('Data refreshed.')
        break
      case 'export':
        exportFullSnapshot({ user, tasks, events, meetings, members, grievances })
        showToast('Full snapshot exported.')
        break
      case 'print':
        window.print()
        break
      case 'briefing':
        navigate('/power', { state: { briefing: true } })
        break
      default:
        navigate('/' + id)
    }
    close()
  }

  const filtered = commands.filter((c) => !query || `${c.id} ${c.label}`.toLowerCase().includes(query.toLowerCase()))

  const openPalette = () => {
    setQuery('')
    setActiveIndex(0)
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 30)
  }
  const close = () => setOpen(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        openPalette()
      }
      if (e.key === 'Escape') close()
    }
    const onOpenEvent = () => openPalette()
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scms:open-command-palette', onOpenEvent)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scms:open-command-palette', onOpenEvent)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => setActiveIndex(0), [query])

  if (!open) return null

  return (
    <div
      id="command-overlay"
      className="command-overlay show"
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div className="command-box">
        <div className="command-input-wrap">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            ref={inputRef}
            id="command-input"
            className="command-input"
            placeholder="Search pages and actions..."
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') close()
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActiveIndex((i) => Math.max(i - 1, 0))
              }
              if (e.key === 'Enter' && filtered[activeIndex]) runCommand(filtered[activeIndex].id)
            }}
          />
        </div>
        <div id="command-list" className="command-list">
          {filtered.length ? (
            filtered.map((c, i) => (
              <div key={c.id} className={`command-item${i === activeIndex ? ' active' : ''}`} onClick={() => runCommand(c.id)}>
                <i className={`fa-solid ${c.icon}`} />
                <span>{c.label}</span>
                <span className="command-hint">Enter</span>
              </div>
            ))
          ) : (
            <EmptyState icon="fa-magnifying-glass" title="No commands" text="Try another keyword." />
          )}
        </div>
      </div>
    </div>
  )
}
