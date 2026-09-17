import EmptyState from '../common/EmptyState'
import { useData } from '../../context/DataContext'

function safeDate(v?: string) {
  const d = v ? new Date(v) : null
  return d && !isNaN(d.getTime()) ? d : null
}

export function useNotices() {
  const { tasks, grievances } = useData()
  const now = new Date()
  const notices: { icon: string; title: string; text: string }[] = []

  tasks
    .filter((t) => t.status !== 'Completed')
    .slice(0, 8)
    .forEach((t) => {
      const d = safeDate(t.due_date)
      const overdue = !!(d && d < now)
      notices.push({
        icon: overdue ? 'fa-triangle-exclamation' : 'fa-clipboard-check',
        title: overdue ? `Overdue: ${t.title}` : `Task: ${t.title}`,
        text: `${t.assigned_name || 'Unassigned'} · ${t.status || 'Pending'}`
      })
    })

  grievances
    .filter((g) => g.status === 'Open')
    .slice(0, 5)
    .forEach((g) => {
      notices.push({ icon: 'fa-shield', title: `Open grievance: ${g.subject}`, text: `Priority: ${g.priority || 'Normal'}` })
    })

  return notices.slice(0, 15)
}

export default function NotificationPanel({ open, onMarkRead }: { open: boolean; onMarkRead: () => void }) {
  const notices = useNotices()

  return (
    <div className={`scms-notification-panel${open ? ' show' : ''}`} aria-hidden={!open}>
      <div className="scms-settings-head">
        <h3>
          <i className="fa-regular fa-bell" /> Notifications
        </h3>
        <button className="small-btn" onClick={onMarkRead}>
          Mark read
        </button>
      </div>
      <div className="scms-notification-list">
        {notices.length ? (
          notices.map((n, i) => (
            <div className="scms-notice" key={i}>
              <i className={`fa-solid ${n.icon}`} />
              <div>
                <strong>{n.title}</strong>
                <small>{n.text}</small>
              </div>
            </div>
          ))
        ) : (
          <EmptyState icon="fa-bell-slash" title="All clear" text="No urgent operational notifications." />
        )}
      </div>
    </div>
  )
}
