import { useMemo } from 'react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import EmptyState from '../components/common/EmptyState'

// Ported from the original's #view-analytics (~line 1574) and
// refreshAnalyticsBoard() (~lines 1819-1852 in
// _reference/original_index.html). Pure client-side computation over data
// already loaded by DataContext -- no new backend calls, per
// PHASE2_CONTINUE.md item 3.
//
// Not ported: the original's counts/mix also include a 'Finance' row
// (SCMS_STATE.finances.length). Finance is excluded from this whole
// migration (see constants.ts -- loadFinances() in the original is a stub
// that always returns [], the module is disabled), so DataContext never
// loads finance data at all. Adding a hardcoded 'Finance: 0' row would be
// fabricating a data point the app doesn't actually have, so it's dropped
// from the distribution/mix here. Flagged for Shiv, not silently patched
// over.
//
// Also not ported: updateCouncilPulse() (~line 2453), an animated SVG line
// chart the original computes but whose target markup
// (#pulse-line-a/#pulse-area-a/#pulse-dot/etc.) doesn't exist anywhere in
// original_index.html -- every setAttr() call in that function is a no-op
// against a nonexistent element. It looks like dead code left over from an
// earlier version of the dashboard. Building new SVG markup for it would
// mean inventing UI that was never actually shown in the original, which
// conflicts with the "don't redesign" rule -- flagging this to Shiv instead
// of guessing at a design for it.

function pct(n: number, d: number) {
  return d ? Math.round((n / d) * 100) : 0
}

export default function Analytics() {
  const { tasks, events, meetings, members, grievances, loadAll } = useData()
  const showToast = useToast()

  const stats = useMemo(() => {
    const completed = tasks.filter((t) => t.status === 'Completed').length
    const resolved = grievances.filter((g) => g.status === 'Resolved').length
    const taskPct = pct(completed, tasks.length)
    const grievancePct = pct(resolved, grievances.length)
    const counts: [string, number][] = [
      ['Tasks', tasks.length],
      ['Events', events.length],
      ['Meetings', meetings.length],
      ['Grievances', grievances.length]
    ]
    const max = Math.max(1, ...counts.map(([, v]) => v))
    const health: [string, number][] = [
      ['Task completion', taskPct],
      ['Grievance resolution', grievancePct],
      ['Meeting coverage', pct(meetings.length, Math.max(1, events.length))]
    ]
    const now = new Date()
    const safeDate = (v?: string) => {
      if (!v) return null
      const d = new Date(v)
      return isNaN(d.getTime()) ? null : d
    }
    const alerts: [string, string, string][] = [];

tasks
  .filter((t) => {
    const dueDate = safeDate(t.due_date);

    return (
      t.status !== 'Completed' &&
      dueDate !== null &&
      dueDate < now
    );
  })
  .slice(0, 3)
  .forEach((t) =>
    alerts.push([
      'fa-triangle-exclamation',
      `Overdue task: ${t.title}`,
      'Immediate follow-up recommended.'
    ])
  );
    grievances
      .filter((g) => g.status === 'Open')
      .slice(0, 3)
      .forEach((g) => alerts.push(['fa-shield', `Open grievance: ${g.subject}`, 'Welfare review required.']))
    const workload: Record<string, number> = {}
    tasks.forEach((t) => {
      const name = t.assigned_name || 'Unassigned'
      workload[name] = (workload[name] || 0) + 1
    })
    const total = Math.max(1, tasks.length)
    const leaderboard = Object.entries(workload).sort((a, b) => b[1] - a[1]).slice(0, 10)

    return { completed, resolved, taskPct, grievancePct, counts, max, health, alerts, workload, total, leaderboard }
  }, [tasks, events, meetings, grievances])

  const exportAnalyticsCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Task Completion', `${stats.taskPct}%`],
      ['Grievances Resolved', `${stats.grievancePct}%`],
      ['Council Members', String(members.length)],
      ['Total Activities', String(tasks.length + events.length + meetings.length)]
    ]
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'SCMS_Analytics.csv'
    a.click()
    showToast('Analytics CSV exported.')
  }

  return (
    <div id="view-analytics" className="view-section">
      <div className="view-toolbar">
        <div>
          <div className="profile-chip">
            <span className="status-dot" /> Council Analytics Board
          </div>
          <p style={{ marginTop: '.45rem', color: 'var(--text-muted)', fontSize: '.8rem' }}>
            Statistical insights from the existing Tasks, Events, Meetings, and Grievances modules.
          </p>
        </div>
        <div className="analytics-toolbar">
          <button className="analytics-btn" onClick={() => loadAll()}>
            <i className="fa-solid fa-rotate" /> Refresh
          </button>
          <button className="analytics-btn" onClick={exportAnalyticsCSV}>
            <i className="fa-solid fa-file-csv" /> Export CSV
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">Task Completion</div>
          <div className="kpi-value">{stats.taskPct}%</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Grievances Resolved</div>
          <div className="kpi-value">{stats.grievancePct}%</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Council Members</div>
          <div className="kpi-value">{members.length}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Total Activities</div>
          <div className="kpi-value">{tasks.length + events.length + meetings.length}</div>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <div className="analytics-head">
            <h3>Activity Distribution</h3>
            <span>Live from current records</span>
          </div>
          <div className="bar-chart">
            {stats.counts.map(([label, val]) => (
              <div className="bar-col" key={label}>
                <div className="bar-value">{val}</div>
                <div className="bar" style={{ height: `${Math.max(6, (val / stats.max) * 78)}%` }} />
                <div className="bar-label">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="analytics-card">
          <div className="analytics-head">
            <h3>Task Health</h3>
            <span>Completion vs pending</span>
          </div>
          <div className="donut-wrap">
            <div className="donut-box">
              <div
                className="analytics-donut"
                style={{ background: `conic-gradient(var(--accent-blue) 0 ${stats.taskPct}%, #e5e7eb ${stats.taskPct}% 100%)` }}
              />
              <div className="donut-center">{stats.taskPct}%</div>
            </div>
            <div className="legend">
              <div className="legend-row">
                <span>
                  <span className="legend-dot" style={{ background: 'var(--accent-blue)' }} />
                  Completed
                </span>
                <b>{stats.completed}</b>
              </div>
              <div className="legend-row">
                <span>
                  <span className="legend-dot" style={{ background: '#e5e7eb' }} />
                  Remaining
                </span>
                <b>{Math.max(0, tasks.length - stats.completed)}</b>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="analytics-grid three">
        <div className="analytics-card">
          <div className="analytics-head">
            <h3>Operational Health</h3>
            <span>Current snapshot</span>
          </div>
          <div>
            {stats.health.map(([label, val]) => (
              <div className="analytics-stat" key={label}>
                <div style={{ flex: 1 }}>
                  <span>{label}</span>
                  <div className="analytics-progress">
                    <span style={{ width: `${val}%` }} />
                  </div>
                </div>
                <b>{val}%</b>
              </div>
            ))}
          </div>
        </div>
        <div className="analytics-card">
          <div className="analytics-head">
            <h3>Smart Alerts</h3>
            <span>Read-only</span>
          </div>
          <div>
            {stats.alerts.length ? (
              stats.alerts.map(([icon, title, text], i) => (
                <div className="analytics-alert" key={i}>
                  <i className={`fa-solid ${icon}`} />
                  <div>
                    <strong>{title}</strong>
                    <small>{text}</small>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState icon="fa-circle-check" title="No smart alerts" text="Operational signals look healthy." />
            )}
          </div>
        </div>
        <div className="analytics-card">
          <div className="analytics-head">
            <h3>Council Activity Mix</h3>
            <span>Records</span>
          </div>
          <div>
            {stats.counts.map(([label, val]) => (
              <div className="analytics-stat" key={label}>
                <span>{label}</span>
                <b>{val}</b>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="analytics-card" style={{ marginTop: '1.25rem' }}>
        <div className="analytics-head">
          <h3>Workload Snapshot</h3>
          <span>Top assignment signals</span>
        </div>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Assignee / Signal</th>
              <th>Tasks</th>
              <th>Share</th>
            </tr>
          </thead>
          <tbody>
            {stats.leaderboard.length ? (
              stats.leaderboard.map(([name, val], i) => (
                <tr key={name}>
                  <td className="analytics-rank">#{i + 1}</td>
                  <td>{name}</td>
                  <td>{val}</td>
                  <td>{Math.round((val / stats.total) * 100)}%</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>No task workload data.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
