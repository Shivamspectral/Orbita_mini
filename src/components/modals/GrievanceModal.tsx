import { FormEvent, useEffect, useState } from 'react'
import Modal from './Modal'
import { postData } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { useData } from '../../context/DataContext'

const CATEGORIES = ['Academic', 'Infrastructure', 'Faculty', 'Examination', 'Fees / Finance', 'Hostel / Transport', 'Sports', 'Harassment / Safety', 'Other']
const PRIORITIES = ['Normal', 'High', 'Urgent', 'Emergency']
const CONTACTS = ['Portal notification', 'Email', 'Phone', 'No contact']

export default function GrievanceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const showToast = useToast()
  const { loadGrievances } = useData()

  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('Academic')
  const [priority, setPriority] = useState('Normal')
  const [department, setDepartment] = useState('')
  const [contact, setContact] = useState('Portal notification')
  const [description, setDescription] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [followup, setFollowup] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setSubject('')
      setCategory('Academic')
      setPriority('Normal')
      setDepartment('')
      setContact('Portal notification')
      setDescription('')
      setAnonymous(false)
      setFollowup(true)
    }
  }, [open])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      // Same as original form-grievance submit: category/priority/department/
      // preferred-contact/follow-up are captured in the form but only
      // subject/description/is_anonymous are actually sent to the backend.
      await postData('/grievances', {
        subject: subject.trim(),
        description: description.trim(),
        is_anonymous: anonymous
      })
      await loadGrievances()
      showToast('Grievance submitted successfully!')
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
        <i className="fa-solid fa-comment-dots" /> Submit Student Grievance
      </h3>
      <form onSubmit={onSubmit}>
        <div className="form-section">Complaint / grievance details</div>
        <div className="form-grid">
          <div className="form-field full">
            <label>
              Subject <span className="required-star">*</span>
            </label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Briefly describe the issue" required />
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
            <label>Department</label>
            <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Department / class" />
          </div>
          <div className="form-field">
            <label>Preferred contact</label>
            <select value={contact} onChange={(e) => setContact(e.target.value)}>
              {CONTACTS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="form-field full">
            <label>
              Details <span className="required-star">*</span>
            </label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Provide complete facts, dates, people involved and requested resolution..." required />
          </div>
          <div className="form-field full">
            <label>Privacy</label>
            <div className="form-checks">
              <label className="form-check">
                <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} /> Submit anonymously
              </label>
              <label className="form-check">
                <input type="checkbox" checked={followup} onChange={(e) => setFollowup(e.target.checked)} /> Allow follow-up questions
              </label>
            </div>
            <span className="field-help">Anonymous submissions will not intentionally attach your name to the grievance.</span>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="modal-btn btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="modal-btn btn-submit" disabled={submitting}>
            <i className="fa-solid fa-shield-halved" /> Submit Secure Ticket
          </button>
        </div>
      </form>
    </Modal>
  )
}
