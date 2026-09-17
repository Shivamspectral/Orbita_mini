import { FormEvent, useEffect, useState } from 'react'
import Modal from './Modal'
import { postData } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { useData } from '../../context/DataContext'

const TYPES = ['Regular', 'Emergency', 'Review', 'Planning', 'Committee']

export default function MeetingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const showToast = useToast()
  const { loadMeetings } = useData()

  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState('Regular')
  const [agenda, setAgenda] = useState('')
  const [notify, setNotify] = useState(true)
  const [minutes, setMinutes] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle('')
      setDate('')
      setTime('')
      setLocation('')
      setType('Regular')
      setAgenda('')
      setNotify(true)
      setMinutes(false)
    }
  }, [open])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      // Same as original form-meeting submit: notify/minutes checkboxes exist
      // in the UI but were never part of the payload sent to the backend.
      await postData('/meetings', {
        title: title.trim(),
        date,
        time,
        location: location.trim(),
        type,
        agenda: agenda.trim()
      })
      await loadMeetings()
      showToast('Meeting scheduled!')
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
        <i className="fa-solid fa-handshake" /> Schedule Council Meeting
      </h3>
      <form onSubmit={onSubmit}>
        <div className="form-section">Meeting information</div>
        <div className="form-grid">
          <div className="form-field full">
            <label>
              Meeting title <span className="required-star">*</span>
            </label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Monthly Student Council Review" required />
          </div>
          <div className="form-field">
            <label>
              Date <span className="required-star">*</span>
            </label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="form-field">
            <label>Start time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Location</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Principal cabin / Seminar hall" />
          </div>
          <div className="form-field">
            <label>Meeting type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="form-field full">
            <label>
              Agenda <span className="required-star">*</span>
            </label>
            <textarea value={agenda} onChange={(e) => setAgenda(e.target.value)} rows={5} placeholder="Agenda items, decisions required and discussion points..." required />
          </div>
          <div className="form-field full">
            <label>Meeting options</label>
            <div className="form-checks">
              <label className="form-check">
                <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Notify members
              </label>
              <label className="form-check">
                <input type="checkbox" checked={minutes} onChange={(e) => setMinutes(e.target.checked)} /> Prepare minutes template
              </label>
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="modal-btn btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="modal-btn btn-submit" disabled={submitting}>
            <i className="fa-solid fa-clock" /> Schedule Meeting
          </button>
        </div>
      </form>
    </Modal>
  )
}
