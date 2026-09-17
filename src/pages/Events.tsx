import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import EventModal from '../components/modals/EventModal'
import EmptyState from '../components/common/EmptyState'
import { exportDataset } from '../utils/export'

// Event feedback is LOCAL-ONLY in the original (never sent to the backend --
// it was stored via a fake local-DB layer that this migration does not
// carry over). Preserved here as a lightweight localStorage-only quirk so
// the "Feedback" button still does something; ask Shiv if he'd rather drop
// it entirely once he reviews Phase 1.
const FEEDBACK_KEY = 'scms_event_feedback_v1'

function readFeedbackStore(): Record<string, { text: string; created_at: string }[]> {
  try {
    return JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '{}')
  } catch {
    return {}
  }
}

export default function Events() {
  const { events } = useData()
  const showToast = useToast()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return events
    return events.filter((e) => [e.title, e.description, e.location, e.type].filter(Boolean).join(' ').toLowerCase().includes(q))
  }, [events, search])

  const collectEventFeedback = (id: number) => {
    const text = prompt('Student feedback:')
    if (!text) return
    const store = readFeedbackStore()
    const list = store[id] || []
    list.push({ text, created_at: new Date().toISOString() })
    store[id] = list
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(store))
    showToast('Event feedback recorded.')
  }

  return (
    <div id="view-events" className="view-section">
      <div className="card">
        <div className="view-toolbar">
          <div>
            <div className="section-header" style={{ margin: 0 }}>
              <h3>Event Management</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '.78rem' }}>Plan and track all council activities.</p>
          </div>
          <div className="toolbar-actions">
            <input className="toolbar-input" placeholder="Search events..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="small-btn" onClick={() => exportDataset('events', events as any)}>
              <i className="fa-solid fa-file-csv" /> Export
            </button>
            <button className="small-btn" onClick={() => setModalOpen(true)}>
              <i className="fa-solid fa-plus" /> New Event
            </button>
          </div>
        </div>
        <div className="list-group" id="events-container">
          {filtered.length === 0 && <EmptyState icon="fa-calendar-xmark" title="No events" text="Schedule the next council activity." />}
          {filtered.map((e) => (
            <div className="record-card" key={e.id}>
              <div className="item-info">
                <span className="item-title">{e.title}</span>
                <div className="record-meta">
                  <span>
                    <i className="fa-solid fa-calendar" /> {e.date || 'TBA'}
                  </span>
                  <span>
                    <i className="fa-solid fa-location-dot" /> {e.location || 'TBA'}
                  </span>
                  <span>
                    <i className="fa-solid fa-tag" /> {e.type || 'Council Event'}
                  </span>
                </div>
                <span className="item-sub">{e.description || 'No additional details'}</span>
                {e.feedback_prompt && (
                  <span className="item-sub">
                    <i className="fa-solid fa-comment" /> Feedback: {e.feedback_prompt}
                  </span>
                )}
                {Array.isArray(e.photos) && e.photos.length > 0 && (
                  <div className="event-media-grid">
                    {e.photos.slice(0, 6).map((p, i) => (
                      <img key={i} src={p.data} alt="Event photo" />
                    ))}
                  </div>
                )}
              </div>
              <span className="pill-badge pill-blue">{e.is_public ? 'Published' : 'Scheduled'}</span>
              <button className="small-btn" onClick={() => collectEventFeedback(e.id)}>
                <i className="fa-solid fa-comment-dots" /> Feedback
              </button>
            </div>
          ))}
        </div>
      </div>

      <EventModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
