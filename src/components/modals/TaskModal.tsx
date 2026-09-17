import { FormEvent, useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import { postData } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { useData } from '../../context/DataContext'
import { COUNCIL_TEAMS } from '../../data/councilTeams'
import type { Task } from '../../types'

const CATEGORIES = ['Academic', 'Event', 'Administration', 'Sports', 'Cultural', 'Technical', 'Student Welfare', 'Other']
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
const STATUSES = ['Pending', 'In Progress', 'Completed', 'On Hold']

interface TaskModalProps {
  open: boolean
  onClose: () => void
  // Pre-fills the form for editing, exactly like the original's editTask().
  // NOTE (preserved original bug, do not "fix"): the original's submit
  // handler always POSTs a new task regardless of whether the modal was
  // opened via "New Task" or via "Edit" -- editing a task never actually
  // persists changes to the existing record. This is replicated here on
  // purpose; see CONTINUE_HERE.md.
  editingTask?: Task | null
}

export default function TaskModal({ open, onClose, editingTask = null }: TaskModalProps) {
  const showToast = useToast()
  const { members, loadTasks } = useData()

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Academic')
  const [priority, setPriority] = useState('Medium')
  const [team, setTeam] = useState('')
  // The original wires the assignee <select> from two different places that
  // fight over it: renderMembers() (~line 2218) fills it with every
  // non-faculty member behind a "Select Member..." placeholder, and
  // initTaskAssignmentControls()'s refresh() (~line 2132) replaces it with a
  // team-filtered list that has no placeholder and excludes super_admin
  // instead of faculty. refresh() runs on every `change` of the team select,
  // so the moment the team control is touched (or editTask() dispatches a
  // synthetic change), the list permanently switches to the second variant.
  // `teamTouched` reproduces exactly that handover.
  const [teamTouched, setTeamTouched] = useState(false)
  const [assignee, setAssignee] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState('Pending')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(editingTask?.title || '')
      setCategory(editingTask?.category || 'Academic')
      setPriority(editingTask?.priority || 'Medium')
      setAssignee(editingTask?.assigned_to != null ? String(editingTask.assigned_to) : '')
      setTeam(editingTask?.assigned_team || '')
      // editTask() does `team.dispatchEvent(new Event('change'))` unconditionally.
      setTeamTouched(!!editingTask)
      setDueDate(editingTask?.due_date || '')
      setStatus(editingTask?.status || 'Pending')
      setDescription(editingTask?.description || '')
    }
  }, [open, editingTask])

  const assignable = useMemo(() => {
    // Untouched team control -> renderMembers()'s list.
    if (!teamTouched) return members.filter((m: any) => m.role_name !== 'Faculty Coordinator')
    // Touched -> initTaskAssignmentControls()'s refresh() filter, verbatim:
    // a member qualifies if they're named in the picked team (lead, committee
    // member, faculty coordinator or faculty) or their `team` field matches
    // the team id case-insensitively.
    const teamObj = COUNCIL_TEAMS.find((t) => t.id === team) || null
    const names = teamObj
      ? [teamObj.lead, ...teamObj.members.map((x) => x[0]), ...(teamObj.facultyCoordinators || []).map((x) => x[0]), teamObj.faculty]
          .filter(Boolean)
          .map(String)
      : []
    // NOTE: the /members payload has no `role` field (see types/index.ts), so
    // this super_admin check never excludes anyone -- true in the original too.
    return members.filter(
      (m: any) => m.role !== 'super_admin' && (!team || names.includes(m.name) || String(m.team || '').toLowerCase() === String(team).toLowerCase())
    )
  }, [members, team, teamTouched])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!assignee) {
      showToast('Please select an assignee.', 'error')
      return
    }
    setSubmitting(true)
    try {
      // Always POST, even when editingTask is set -- see the note on the
      // component props above.
      await postData('/tasks', {
        title: title.trim(),
        description: description.trim(),
        assigned_to: parseInt(assignee, 10),
        assigned_team: team,
        category,
        priority,
        status,
        due_date: dueDate
      })
      await loadTasks()
      showToast('Task assigned successfully!')
      onClose()
    } catch (err: any) {
      showToast(err?.message || 'Operation failed.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <h3>
        <i className="fa-solid fa-clipboard-user" /> Create / Assign Task
      </h3>
      <form onSubmit={onSubmit}>
        <div className="form-section">Task information</div>
        <div className="form-grid">
          <div className="form-field full">
            <label>
              Task title <span className="required-star">*</span>
            </label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Prepare Independence Day report" required />
          </div>
          <div className="form-field">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Team</label>
            <select
              value={team}
              onChange={(e) => {
                setTeam(e.target.value)
                setTeamTouched(true)
              }}
            >
              <option value="">Individual / no team</option>
              {/* PRESERVED QUIRK: COUNCIL_TEAMS entries have no `name`/`title`
                  field, so the original's `t.name||t.title||t.id` always falls
                  through to the raw id -- the options read "executive",
                  "cultural", "pr", "tnp" and so on rather than proper labels.
                  Flagged for Shiv rather than relabelled here. */}
              {COUNCIL_TEAMS.map((t) => (
                <option key={t.id} value={t.id}>
                  {(t as any).name || (t as any).title || t.id}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>
              Assignee <span className="required-star">*</span>
            </label>
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)} required>
              {!teamTouched && <option value="">Select Member...</option>}
              {assignable.length ? (
                assignable.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.role_name || 'Member'}
                  </option>
                ))
              ) : (
                <option value="">No members in this team</option>
              )}
            </select>
          </div>
          <div className="form-field">
            <label>Due date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="form-field full">
            <label>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add instructions, expected output, links or notes..." />
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="modal-btn btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="modal-btn btn-submit" disabled={submitting}>
            <i className="fa-solid fa-paper-plane" /> Assign Task
          </button>
        </div>
      </form>
    </Modal>
  )
}
