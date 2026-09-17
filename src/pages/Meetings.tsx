import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { patchData } from '../services/api'
import MeetingModal from '../components/modals/MeetingModal'
import EmptyState from '../components/common/EmptyState'
import { exportDataset, exportMeetingsPDF } from '../utils/export'

const DONE_STATUSES = ['Completed', 'Complete', 'Closed', 'Done']

export default function Meetings() {
  const { meetings, loadMeetings } = useData()
  const showToast = useToast()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return meetings
    return meetings.filter((m) => [m.title, m.agenda, m.location, m.type].filter(Boolean).join(' ').toLowerCase().includes(q))
  }, [meetings, search])

  const onComplete = async (id: number, title: string) => {
    if (!confirm(`Mark "${title}" as completed?`)) return
    try {
      await patchData(`/meetings/${id}`, { status: 'Completed' })
      await loadMeetings()
      showToast('Meeting marked as completed!')
    } catch (err: any) {
      showToast(err?.message || 'Permission denied or update failed.', 'error')
    }
  }

  return (
    <div id="view-meetings" className="view-section">
      <div className="card">
        <div className="view-toolbar">
          <div>
            <div className="section-header" style={{ margin: 0 }}>
              <h3>Meeting Management</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '.78rem' }}>Schedule discussions and keep the council aligned.</p>
          </div>
          <div className="toolbar-actions">
            <input className="toolbar-input" placeholder="Search meetings..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="small-btn" onClick={() => exportDataset('meetings', meetings as any)}>
              <i className="fa-solid fa-file-csv" /> CSV
            </button>
            <button
              className="small-btn"
              onClick={() => {
                try {
                  exportMeetingsPDF(meetings)
                } catch (err: any) {
                  showToast(err?.message || 'PDF export failed.', 'error')
                }
              }}
            >
              <i className="fa-solid fa-file-pdf" /> PDF Report
            </button>
            <button className="small-btn" onClick={() => setModalOpen(true)}>
              <i className="fa-solid fa-plus" /> Schedule
            </button>
          </div>
        </div>
        <div className="list-group" id="meetings-container">
          {filtered.length === 0 && <EmptyState icon="fa-handshake" title="No meetings scheduled" text="Schedule a meeting to keep the council aligned." />}
          {filtered.map((m) => {
            const done = DONE_STATUSES.includes(m.status || '')
            const badge = done ? 'pill-green' : 'pill-purple'
            const status = m.status || 'Scheduled'
            return (
              <div className={`record-card meeting-record ${done ? 'meeting-completed' : ''}`} key={m.id}>
                <div className="item-info">
                  <span className="item-title">{m.title}</span>
                  <div className="record-meta">
                    <span>
                      <i className="fa-regular fa-calendar" /> {m.date || 'TBA'}
                    </span>
                    <span>
                      <i className="fa-regular fa-clock" /> {m.time || 'TBA'}
                    </span>
                    <span>
                      <i className="fa-solid fa-location-dot" /> {m.location || 'TBA'}
                    </span>
                    <span>
                      <i className="fa-solid fa-tag" /> {m.type || 'Regular'}
                    </span>
                  </div>
                  <span className="item-sub">{m.agenda || 'No agenda provided'}</span>
                </div>
                <div className="record-actions">
                  <span className={`pill-badge ${badge}`}>{status}</span>
                  {done ? (
                    <span className={`pill-badge ${badge}`}>
                      <i className="fa-solid fa-circle-check" /> Completed
                    </span>
                  ) : (
                    <button className="small-btn" onClick={() => onComplete(m.id, m.title)}>
                      <i className="fa-solid fa-circle-check" /> Mark completed
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <MeetingModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
