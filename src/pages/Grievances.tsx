import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { patchData } from '../services/api'
import GrievanceModal from '../components/modals/GrievanceModal'
import EmptyState from '../components/common/EmptyState'
import { exportDataset } from '../utils/export'

export default function Grievances() {
  const { user } = useAuth()
  const { grievances, loadGrievances } = useData()
  const showToast = useToast()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const canResolve = user?.role === 'lead' || user?.role === 'super_admin'

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return grievances
    return grievances.filter((g) => [g.subject, g.description, g.status].filter(Boolean).join(' ').toLowerCase().includes(q))
  }, [grievances, search])

  const markResolved = async (id: number) => {
    try {
      await patchData(`/grievances/${id}`, { status: 'Resolved' })
      await loadGrievances()
      showToast('Updated successfully!')
    } catch (err: any) {
      showToast(err?.message || 'Permission denied or update failed.', 'error')
    }
  }

  return (
    <div id="view-grievances" className="view-section">
      <div className="card">
        <div className="view-toolbar">
          <div>
            <div className="section-header" style={{ margin: 0 }}>
              <h3>Student Grievances</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '.78rem' }}>Securely review and resolve student concerns.</p>
          </div>
          <div className="toolbar-actions">
            <input className="toolbar-input" placeholder="Search grievances..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="small-btn" onClick={() => exportDataset('grievances', grievances as any)}>
              <i className="fa-solid fa-file-csv" /> Export
            </button>
            <button className="small-btn" onClick={() => setModalOpen(true)}>
              <i className="fa-solid fa-plus" /> New Ticket
            </button>
          </div>
        </div>
        <div className="list-group" id="grievances-container">
          {filtered.length === 0 && <EmptyState icon="fa-shield" title="No active grievances" text="No grievances have been submitted yet." />}
          {filtered.map((g) => {
            const badge = g.status === 'Resolved' ? 'pill-green' : 'pill-orange'
            const reporter = g.is_anonymous ? 'Anonymous submission' : g.created_by ? `Submitted by member #${g.created_by}` : 'Submitted by council member'
            return (
              <div className="record-card" key={g.id}>
                <div className="item-info">
                  <span className="item-title">{g.subject}</span>
                  <div className="record-meta">
                    <span>
                      <i className="fa-solid fa-user-shield" /> {reporter}
                    </span>
                  </div>
                  <span className="item-sub">{g.description}</span>
                </div>
                <div className="record-actions">
                  {g.status === 'Open' && canResolve ? (
                    <button className="pill-badge pill-green" style={{ border: 'none', cursor: 'pointer' }} onClick={() => markResolved(g.id)}>
                      Mark Resolved
                    </button>
                  ) : (
                    <span className={`pill-badge ${badge}`}>{g.status}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <GrievanceModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
