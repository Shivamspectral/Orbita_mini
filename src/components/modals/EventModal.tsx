import { FormEvent, useEffect, useState } from 'react'
import Modal from './Modal'
import { postData } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { useData } from '../../context/DataContext'

const TYPES = ['Academic', 'Sports', 'Cultural', 'Technical', 'Workshop', 'Meeting', 'Other']
const PRIORITIES = ['Normal', 'High', 'Critical']

export default function EventModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const showToast = useToast()
  const { loadEvents } = useData()

  const [title, setTitle] = useState('')
  const [type, setType] = useState('Academic')
  const [priority, setPriority] = useState('Normal')
  const [date, setDate] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [location, setLocation] = useState('')
  const [capacity, setCapacity] = useState('')
  const [organizer, setOrganizer] = useState('')
  const [description, setDescription] = useState('')
  const [notify, setNotify] = useState(true)
  const [isPublic, setIsPublic] = useState(false)
  const [registration, setRegistration] = useState(false)
  const [feedbackPrompt, setFeedbackPrompt] = useState('')
  const [photos, setPhotos] = useState<FileList | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle('')
      setType('Academic')
      setPriority('Normal')
      setDate('')
      setStart('')
      setEnd('')
      setLocation('')
      setCapacity('')
      setOrganizer('')
      setDescription('')
      setNotify(true)
      setIsPublic(false)
      setRegistration(false)
      setFeedbackPrompt('')
      setPhotos(null)
    }
  }, [open])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const files = [...(photos || [])].slice(0, 8)
      const photoPayload: { name: string; type: string; data: string }[] = []
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue
        if (file.size > 4 * 1024 * 1024) {
          showToast('Each event photo must be 4MB or smaller.', 'error')
          setSubmitting(false)
          return
        }
        const data = await new Promise<string>((resolve) => {
          const r = new FileReader()
          r.onload = () => resolve(r.result as string)
          r.readAsDataURL(file)
        })
        photoPayload.push({ name: file.name, type: file.type, data })
      }

      // NOTE: mirrors the original form-event submit handler exactly -- it
      // only ever sent these fields. Start/end time, capacity and the
      // "notify" checkbox are captured in the form but were never included
      // in the original payload either; preserved as-is for fidelity.
      await postData('/events', {
        title: title.trim(),
        date,
        location: location.trim(),
        description: description.trim(),
        type,
        priority,
        organizer: organizer.trim(),
        is_public: isPublic,
        registration_enabled: registration,
        feedback_prompt: feedbackPrompt.trim(),
        photos: photoPayload
      })
      await loadEvents()
      showToast('Event scheduled successfully!')
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
        <i className="fa-solid fa-calendar-plus" /> Create Council Event
      </h3>
      <form onSubmit={onSubmit}>
        <div className="form-section">Event details</div>
        <div className="form-grid">
          <div className="form-field full">
            <label>
              Event name <span className="required-star">*</span>
            </label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Inter-Department Football Tournament" required />
          </div>
          <div className="form-field">
            <label>Event type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
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
            <label>
              Date <span className="required-star">*</span>
            </label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="form-field">
            <label>Start time</label>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="form-field">
            <label>End time</label>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Venue / Location</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Auditorium / Ground / Lab" />
          </div>
          <div className="form-field">
            <label>Expected capacity</label>
            <input type="number" min={0} value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Number of participants" />
          </div>
          <div className="form-field">
            <label>Organizer</label>
            <input type="text" value={organizer} onChange={(e) => setOrganizer(e.target.value)} placeholder="Council / Department / Club" />
          </div>
          <div className="form-field full">
            <label>Details</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Agenda, requirements, instructions, guest details..." />
          </div>
          <div className="form-field full">
            <label>Event options</label>
            <div className="form-checks">
              <label className="form-check">
                <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Notify council members
              </label>
              <label className="form-check">
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> Publish to student portal
              </label>
              <label className="form-check">
                <input type="checkbox" checked={registration} onChange={(e) => setRegistration(e.target.checked)} /> Enable registration
              </label>
            </div>
          </div>
          <div className="form-field full">
            <label>Event photos</label>
            <input type="file" accept="image/*" multiple onChange={(e) => setPhotos(e.target.files)} />
            <span className="field-help">Upload multiple photos. Published photos are shown in the Student Portal gallery.</span>
          </div>
          <div className="form-field full">
            <label>Feedback</label>
            <input type="text" value={feedbackPrompt} onChange={(e) => setFeedbackPrompt(e.target.value)} placeholder="Feedback prompt for students (optional)" />
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="modal-btn btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="modal-btn btn-submit" disabled={submitting}>
            <i className="fa-solid fa-calendar-check" /> Save Event
          </button>
        </div>
      </form>
    </Modal>
  )
}
