import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { deleteData, patchData } from '../services/api'
import TaskModal from '../components/modals/TaskModal'
import EmptyState from '../components/common/EmptyState'
import { exportDataset, exportTasksPDF } from '../utils/export'
import type { Task } from '../types'

// Same rule as the original's canCompleteTask(): only the assignee or a
// super_admin may toggle a task's completion.
function canCompleteTask(t: Task, userId?: number, role?: string) {
  return role === 'super_admin' || (t.assigned_to != null && Number(t.assigned_to) === Number(userId))
}

export default function Tasks() {
  const { user } = useAuth()
  const { tasks, loadTasks } = useData()
  const showToast = useToast()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return tasks
    return tasks.filter((t) => [t.title, t.description, t.assigned_name, t.status, t.priority].filter(Boolean).join(' ').toLowerCase().includes(q))
  }, [tasks, search])

  const openNew = () => {
    setEditingTask(null)
    setModalOpen(true)
  }

  const openEdit = (t: Task) => {
    setEditingTask(t)
    setModalOpen(true)
  }

  const onDelete = async (id: number) => {
    if (!confirm('Delete this record? This action cannot be undone.')) return
    try {
      await deleteData(`/tasks/${id}`)
      await loadTasks()
      showToast('Deleted successfully.')
    } catch (err: any) {
      showToast(err?.message || 'Delete failed. The local data store may not allow deletion.', 'error')
    }
  }

  const onToggleComplete = async (t: Task) => {
    if (!canCompleteTask(t, user?.id, user?.role)) {
      showToast('Only the assigned member can mark this task complete.', 'error')
      return
    }
    const next = t.status === 'Completed' ? 'Pending' : 'Completed'
    try {
      await patchData(`/tasks/${t.id}`, {
        status: next,
        completed_by: user?.id,
        completed_at: next === 'Completed' ? new Date().toISOString() : null
      })
      await loadTasks()
      showToast(next === 'Completed' ? 'Task marked complete.' : 'Task reopened.')
    } catch (err: any) {
      showToast(err?.message || 'Permission denied or update failed.', 'error')
    }
  }

  return (
    <div id="view-tasks" className="view-section">
      <div className="card">
        <div className="view-toolbar">
          <div>
            <div className="section-header" style={{ margin: 0 }}>
              <h3>Task Center</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '.78rem' }}>Assign, monitor and close council work.</p>
          </div>
          <div className="toolbar-actions">
            <input className="toolbar-input" placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="small-btn" onClick={() => exportDataset('tasks', tasks as any)}>
              <i className="fa-solid fa-file-csv" /> CSV
            </button>
            <button
              className="small-btn"
              onClick={() => {
                try {
                  exportTasksPDF(tasks)
                } catch (err: any) {
                  showToast(err?.message || 'PDF export failed.', 'error')
                }
              }}
            >
              <i className="fa-solid fa-file-pdf" /> PDF Report
            </button>
            <button className="small-btn" onClick={openNew}>
              <i className="fa-solid fa-plus" /> New Task
            </button>
          </div>
        </div>
        <div className="list-group" id="tasks-container">
          {filtered.length === 0 && <EmptyState icon="fa-clipboard-check" title="No tasks found" text="Create a task to start tracking council work." />}
          {filtered.map((t) => (
            <div className="record-card" key={t.id}>
              <div className="item-info">
                <span className="item-title">{t.title}</span>
                <div className="record-meta">
                  <span>
                    <i className="fa-solid fa-user" /> {t.assigned_name || '-'}
                  </span>
                  <span>
                    <i className="fa-regular fa-calendar" /> {t.due_date || '-'}
                  </span>
                  <span>
                    <i className="fa-solid fa-flag" /> {t.priority || 'Medium'}
                  </span>
                </div>
                <span className="item-sub">{t.description || 'No description provided'}</span>
              </div>
              <div className="record-actions">
                <button className="small-btn" title="Edit task" onClick={() => openEdit(t)}>
                  <i className="fa-solid fa-pen" />
                </button>
                <button className="small-btn" title="Delete task" onClick={() => onDelete(t.id)}>
                  <i className="fa-solid fa-trash" />
                </button>
                <button
                  className={`pill-badge ${t.status === 'Completed' ? 'pill-green' : 'pill-orange'}`}
                  style={{ border: 'none', cursor: 'pointer' }}
                  title="Only the assigned member can complete this task"
                  onClick={() => onToggleComplete(t)}
                >
                  {t.status}
                  {canCompleteTask(t, user?.id, user?.role) ? '' : ' 🔒'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TaskModal open={modalOpen} onClose={() => setModalOpen(false)} editingTask={editingTask} />
    </div>
  )
}
