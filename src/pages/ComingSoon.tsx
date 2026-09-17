const TITLES: Record<string, { title: string; icon: string }> = {
  teams: { title: 'Leadership & Teams', icon: 'fa-people-group' },
  analytics: { title: 'Analytics Board', icon: 'fa-chart-line' },
  chat: { title: 'Council Chat', icon: 'fa-comments' },
  power: { title: 'Power Suite', icon: 'fa-bolt' },
  finance: { title: 'Finance & Budget', icon: 'fa-file-invoice-dollar' }
}

export default function ComingSoon({ page }: { page: string }) {
  const meta = TITLES[page] || { title: 'This section', icon: 'fa-hourglass-half' }
  return (
    <div className="view-section">
      <div className="card">
        <div className="section-header">
          <h3>{meta.title}</h3>
        </div>
        <div className="empty-state" style={{ marginTop: '1rem' }}>
          <i className={`fa-solid ${meta.icon}`} />
          <strong>Coming in Phase 2</strong>
          <span>This section is part of Phase 2 — not built yet.</span>
        </div>
      </div>
    </div>
  )
}
