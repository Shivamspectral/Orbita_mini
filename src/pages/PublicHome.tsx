import { useNavigate } from 'react-router-dom'
import { OFFICIAL_ROSTER } from '../data/officialRoster'

const LEAD_ROLES = ['President', 'Vice-President', 'General Secretary', 'Treasurer']

export default function PublicHome() {
  const navigate = useNavigate()
  const leads = OFFICIAL_ROSTER.filter((x) => LEAD_ROLES.includes(x.role_name))

  return (
    <section id="home-screen" className="home-shell">
      <div className="home-card">
        <div className="home-hero">
          <img className="home-logo" src="/student-council-logo.jpeg" alt="Student Council logo" />
          <div className="home-eyebrow">ASTRA • ORBITA MINI • SCMS</div>
          <h1>
            Student Council
            <br />
            <span>Command Center</span>
          </h1>
          <p>
            A professional Student Council Management System for leadership, teams, tasks, events, meetings, finance,
            documents, grievances, media and achievements — with a dedicated Principal control layer.
          </p>
          <div className="home-actions">
            <button className="home-btn primary" onClick={() => navigate('/login/council')}>
              <i className="fa-solid fa-right-to-bracket" /> Council Login
            </button>
            <button className="home-btn secondary" onClick={() => navigate('/login/principal')}>
              <i className="fa-solid fa-user-shield" /> Principal Login
            </button>
          </div>
          <div className="home-grid">
            <div className="home-mini">
              <i className="fa-solid fa-people-group" />
              <strong>Leadership & Teams</strong>
              <small>Role-based council operations and team coordination.</small>
            </div>
            <div className="home-mini">
              <i className="fa-solid fa-calendar-days" />
              <strong>Events & Calendar</strong>
              <small>Plan activities, meetings and publish event media.</small>
            </div>
            <div className="home-mini">
              <i className="fa-solid fa-file-invoice-dollar" />
              <strong>Finance & Budget • Future Update</strong>
              <small>Principal and Treasury approval workflows.</small>
            </div>
            <div className="home-mini">
              <i className="fa-solid fa-shield-heart" />
              <strong>Student Welfare</strong>
              <small>Secure grievance handling and council support.</small>
            </div>
          </div>
        </div>
        <aside className="home-side">
          <h3>About the Council</h3>
          <p>Student leadership, participation and accountability brought into one workspace.</p>
          <div id="home-leadership-list">
            {leads.map((m) => (
              <div className="home-lead" key={m.id}>
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=f3e4d7&color=7a1f3d`} />
                <div>
                  <strong>{m.name}</strong>
                  <small>{m.role_name}</small>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 18, padding: 14, borderRadius: 16, background: '#fff', border: '1px solid rgba(122,31,61,.09)' }}>
            <strong style={{ fontSize: '.8rem', color: 'var(--wine-dark)' }}>Student Portal Ready</strong>
            <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: 4 }}>
              Published event photos and public council information can appear here.
            </small>
            <div id="home-gallery" className="student-gallery" style={{ marginTop: 10 }} />
          </div>
          <div style={{ marginTop: 18, fontSize: '.68rem', color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--wine)' }}>ASTRA</strong> • OrbitA Mini SCMS
          </div>
        </aside>
      </div>
    </section>
  )
}
