import { FormEvent, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Login() {
  const { mode: modeParam } = useParams()
  const mode = modeParam === 'principal' ? 'principal' : 'council'
  const navigate = useNavigate()
  const { login } = useAuth()
  const showToast = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const principal = mode === 'principal'

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const user = await login(email.trim(), password)
      showToast(`Welcome, ${user.name || email}!`)
      // Same as the original's role -> landing-page mapping: super_admin
      // lands on the Principal Dashboard, everyone else on the Council
      // Dashboard.
      navigate(user.role === 'super_admin' ? '/principal-dashboard' : '/dashboard')
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div id="login-screen">
      <div className="login-box">
        <img className="login-logo-img" src="/student-council-logo.jpeg" alt="Student Council logo" />
        <h2 id="login-title">{principal ? 'Principal / Super Admin Login' : 'Council Portal'}</h2>
        <p id="login-subtitle">{principal ? 'Authorized institutional access' : 'Sign in to your council account'}</p>
        <div className="login-switch">
          <button type="button" className={!principal ? 'active' : ''} onClick={() => navigate('/login/council')}>
            Council
          </button>
          <button type="button" className={principal ? 'active' : ''} onClick={() => navigate('/login/principal')}>
            Principal / Super Admin
          </button>
        </div>
        <div style={{ margin: '-.25rem 0 1rem', fontSize: '.62rem', fontWeight: 800, letterSpacing: '.08em', color: '#6b7280', textTransform: 'uppercase' }}>
          ASTRA • ORBITA MINI
        </div>
        <form onSubmit={onSubmit}>
          <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit">{submitting ? <><i className="fa-solid fa-spinner fa-spin" /> Signing in...</> : 'Access System'}</button>
        </form>
        <div id="login-error" style={{ display: error ? 'block' : 'none' }}>
          <i className="fa-solid fa-circle-exclamation" /> {error}
        </div>
        <div style={{ marginTop: 12, fontSize: '.68rem', lineHeight: 1.45, color: '#6b7280', textAlign: 'center' }}>
          Authentication is provided by the configured institutional account layer. Do not share passwords.
        </div>
      </div>
    </div>
  )
}
