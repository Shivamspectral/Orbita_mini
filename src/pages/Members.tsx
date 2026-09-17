import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import EmptyState from '../components/common/EmptyState'

export default function Members() {
  const { members } = useData()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return members
    return members.filter((m) => [m.name, m.role_name, m.team, m.class, m.branch, m.department].filter(Boolean).join(' ').toLowerCase().includes(q))
  }, [members, search])

  return (
    <div id="view-members" className="view-section">
      <div className="card">
        <div className="view-toolbar">
          <div>
            <div className="section-header" style={{ margin: 0 }}>
              <h3>Member Directory</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '.78rem' }}>Council leadership, committee members and roles.</p>
          </div>
          <input className="toolbar-input" placeholder="Search members..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div id="members-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {filtered.length === 0 && <EmptyState icon="fa-user-group" title="No members found" text="No members match your search." />}
          {filtered.map((m) => (
            <div className="record-card" key={m.id}>
              <div className="avatar-list-item">
                <div className="avatar-wrap">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=e0e7ff&color=4f46e5`} />
                </div>
                <div className="item-info">
                  <span className="item-title">{m.name}</span>
                  <span className="item-sub">{m.role_name}</span>
                  <div className="record-meta">
                    <span>
                      <i className="fa-solid fa-layer-group" /> {m.team}
                    </span>
                    <span>
                      <i className="fa-solid fa-graduation-cap" /> {[m.class, m.branch].filter(Boolean).join(' • ') || m.department}
                    </span>
                  </div>
                </div>
              </div>
              <span className={`pill-badge ${m.role_name === 'Faculty Coordinator' ? 'pill-blue' : 'pill-green'}`}>
                {m.role_name === 'Faculty Coordinator' ? 'Faculty' : 'Council'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
