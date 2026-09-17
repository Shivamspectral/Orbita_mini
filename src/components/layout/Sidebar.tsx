import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { MENU_CONFIG, NavItem } from '../../constants'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

// Same extra items the original always appends after the role-specific menu.
const EXTRA_ITEMS: NavItem[] = [
  { id: 'teams', icon: 'fa-people-group', label: 'Leadership & Teams' },
  { id: 'analytics', icon: 'fa-chart-line', label: 'Analytics Board' },
  { id: 'chat', icon: 'fa-comments', label: 'Council Chat' },
  { id: 'power', icon: 'fa-bolt', label: 'Power Suite' }
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const showToast = useToast()
  const [logo, setLogo] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLogo(localStorage.getItem('scms_sih_logo'))
  }, [])

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image file.', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      localStorage.setItem('scms_sih_logo', result)
      setLogo(result)
      showToast('SIH logo saved on this browser.')
    }
    reader.readAsDataURL(file)
  }

  const clearLogo = (e: React.MouseEvent) => {
    e.stopPropagation()
    localStorage.removeItem('scms_sih_logo')
    setLogo(null)
    if (fileInput.current) fileInput.current.value = ''
    showToast('SIH logo removed.')
  }

  const items = [...(MENU_CONFIG[user?.role || 'default'] || MENU_CONFIG.default), ...EXTRA_ITEMS]

  return (
    <aside id="sidebar-wrapper">
      <div className="brand-logo">
        <i className="fa-solid fa-bolt" />
        <div className="brand-titles">
          <h1>Siddhant</h1>
          <p>College</p>
          <span className="ssav-brand">
            <span>ASTRA</span>
            <span className="tm-mark">™</span>
          </span>
        </div>
      </div>

      <div className="sih-logo-slot" id="sih-logo-slot" title="Click to add your SIH logo" onClick={() => fileInput.current?.click()}>
        <input ref={fileInput} id="sih-logo-input" type="file" accept="image/*" hidden onChange={onLogoChange} />
        <div className="sih-logo-preview" id="sih-logo-preview">
          {logo ? <img src={logo} alt="SIH logo" /> : <i className="fa-solid fa-image" />}
        </div>
        <div className="sih-logo-copy">
          <strong>STUDENT COUNCIL</strong>
          <small>Official logo</small>
        </div>
        <button className="sih-logo-clear" id="sih-logo-clear" type="button" title="Remove logo" onClick={clearLogo}>
          <i className="fa-solid fa-xmark" />
        </button>
      </div>

      <nav id="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {items.map((item) => (
          <NavLink key={item.id} to={`/${item.id}`} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <i className={`fa-solid ${item.icon}`} /> {item.label}
          </NavLink>
        ))}
        <a
          href="#"
          className="nav-item logout-btn"
          onClick={(e) => {
            e.preventDefault()
            logout()
          }}
        >
          <i className="fa-solid fa-arrow-right-from-bracket" /> Logout
        </a>
      </nav>
    </aside>
  )
}
