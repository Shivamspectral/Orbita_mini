import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'

export default function PrincipalDashboard() {
  const { tasks, events, grievances } = useData()
  const navigate = useNavigate()

  // Same computation as refreshPrincipalDashboard() in the original.
  // Finance is intentionally excluded (always "Future" -- see constants.ts).
  const kpis = useMemo(() => {
    const openGrievances = grievances.filter((g) => !['resolved', 'closed'].includes(String(g.status || 'Open').toLowerCase())).length
    const activeTasks = tasks.filter((t) => t.status !== 'Completed').length
    const upcomingEvents = events.filter((e) => e.date && new Date(e.date) >= new Date()).length
    return { openGrievances, activeTasks, upcomingEvents }
  }, [tasks, events, grievances])

  return (
    <div id="view-principal-dashboard" className="view-section">
      <div className="principal-view">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <div className="dash-eyebrow">
              <span className="live-dot" /> PRINCIPAL COMMAND CENTER
            </div>
            <h1 style={{ color: 'var(--wine-dark)', marginTop: 6 }}>Super Admin Dashboard</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '.82rem', marginTop: 5 }}>Institution-level oversight of the Student Council.</p>
          </div>
        </div>
        <div className="principal-grid" style={{ marginTop: 20 }}>
          <div className="principal-kpi">
            <span>Finance & Budget</span>
            <strong id="principal-pending-finance">Future</strong>
          </div>
          <div className="principal-kpi">
            <span>Open Grievances</span>
            <strong id="principal-open-grievances">{kpis.openGrievances}</strong>
          </div>
          <div className="principal-kpi">
            <span>Active Tasks</span>
            <strong id="principal-active-tasks">{kpis.activeTasks}</strong>
          </div>
          <div className="principal-kpi">
            <span>Upcoming Events</span>
            <strong id="principal-upcoming-events">{kpis.upcomingEvents}</strong>
          </div>
        </div>
      </div>
      <div className="dash-two-col">
        <div className="card">
          <div className="section-header">
            <div>
              <h3>Finance & Budget</h3>
              <div className="team-small">Planned for a future update</div>
            </div>
            <span className="profile-chip">FUTURE MODULE</span>
          </div>
          <div className="empty-state" style={{ marginTop: '1rem' }}>
            Finance requests, budgets, treasury workflows and approvals will be available in a future update.
          </div>
        </div>
        <div className="card">
          <div className="section-header">
            <h3>Administrative Shortcuts</h3>
          </div>
          <div className="module-grid">
            <div className="module-tile" onClick={() => navigate('/finance')}>
              <i className="fa-solid fa-file-invoice-dollar" />
              <strong>Finance • Future</strong>
              <small>Coming in a future update</small>
            </div>
            <div className="module-tile" onClick={() => navigate('/teams')}>
              <i className="fa-solid fa-people-group" />
              <strong>Leadership</strong>
              <small>Manage teams</small>
            </div>
            <div className="module-tile" onClick={() => navigate('/power')}>
              <i className="fa-solid fa-bolt" />
              <strong>Power Suit</strong>
              <small>Command tools</small>
            </div>
            <div className="module-tile" onClick={() => navigate('/analytics')}>
              <i className="fa-solid fa-chart-line" />
              <strong>Reports</strong>
              <small>Analytics & exports</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
