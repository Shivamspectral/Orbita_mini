import { useEffect, useRef, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'

export default function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const showToast = useToast()
  const { loadAll } = useData()
  const { user } = useAuth()
  const [dark, setDark] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    const d = localStorage.getItem('scms_dark_mode') === '1'
    const a = localStorage.getItem('scms_auto_refresh') === '1'
    setDark(d)
    setAutoRefresh(a)
    document.documentElement.classList.toggle('scms-dark', d)
    if (a) timerRef.current = window.setInterval(() => loadAll(), 60000)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleDarkMode = (enabled: boolean) => {
    setDark(enabled)
    document.documentElement.classList.toggle('scms-dark', enabled)
    localStorage.setItem('scms_dark_mode', enabled ? '1' : '0')
  }

  const toggleAutoRefresh = (enabled: boolean) => {
    setAutoRefresh(enabled)
    localStorage.setItem('scms_auto_refresh', enabled ? '1' : '0')
    if (timerRef.current) window.clearInterval(timerRef.current)
    if (enabled) timerRef.current = window.setInterval(() => loadAll(), 60000)
    showToast(enabled ? 'Auto refresh enabled.' : 'Auto refresh disabled.')
  }

  const printCurrentView = () => {
    onClose()
    window.print()
  }


  return (
    <div className={`scms-settings-panel${open ? ' show' : ''}`} aria-hidden={!open}>
      <div className="scms-settings-head">
        <h3>
          <i className="fa-solid fa-sliders" /> Workspace Settings
        </h3>
        <button className="small-btn" onClick={onClose}>
          <i className="fa-solid fa-xmark" />
        </button>
      </div>
      <div className="scms-setting">
        <div className="scms-setting-row">
          <div>
            <strong>Dark mode</strong>
            <small>Use a low-light council workspace.</small>
          </div>
          <label className="scms-switch">
            <input type="checkbox" checked={dark} onChange={(e) => toggleDarkMode(e.target.checked)} />
            <span className="scms-slider" />
          </label>
        </div>
      </div>
      <div className="scms-setting">
        <div className="scms-setting-row">
          <div>
            <strong>Auto refresh</strong>
            <small>Refresh operational data every 60 seconds.</small>
          </div>
          <label className="scms-switch">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => toggleAutoRefresh(e.target.checked)} />
            <span className="scms-slider" />
          </label>
        </div>
      </div>
      <div className="scms-setting">
        <div className="toolbar-actions settings-print-only">
          <button className="small-btn" onClick={printCurrentView}>
            <i className="fa-solid fa-print" /> Print
          </button>
        </div>
      </div>
    </div>
  )
}
