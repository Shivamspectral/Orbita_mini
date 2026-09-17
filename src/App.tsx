import { ReactNode, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider, useData } from './context/DataContext'
import { ToastProvider } from './context/ToastContext'
import AppShell from './components/layout/AppShell'
import PublicHome from './pages/PublicHome'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PrincipalDashboard from './pages/PrincipalDashboard'
import Tasks from './pages/Tasks'
import Events from './pages/Events'
import Meetings from './pages/Meetings'
import Members from './pages/Members'
import Grievances from './pages/Grievances'
import Chat from './pages/Chat'
import Analytics from './pages/Analytics'
import Teams from './pages/Teams'
import Power from './pages/Power'
import ComingSoon from './pages/ComingSoon'

const LAST_PAGE_KEY = 'scms_last_page'

// Same role -> landing-page mapping as the original's buildSidebar()/
// initApp(): super_admin lands on principal-dashboard, everyone else on
// dashboard.
function landingPageFor(role?: string) {
  return role === 'super_admin' ? 'principal-dashboard' : 'dashboard'
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/" replace />
  return <>{children}</>
}

// Loads Phase 1 data once a user is authenticated, and remembers the last
// visited page (localStorage['scms_last_page']) the same way the original
// did, so a returning session can be sent back to where it left off.
function AuthedShell() {
  const { loadAll } = useData()
  const location = useLocation()

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const page = location.pathname.replace(/^\//, '')
    if (page) localStorage.setItem(LAST_PAGE_KEY, page)
  }, [location.pathname])

  return <AppShell />
}

// On initial load, if a session is restored (page refresh, etc.) and the
// person is sitting on a public route, send them to their role's landing
// page or their last-visited Phase 1 page -- mirrors the original's
// restore-session behavior.
function SessionRedirect() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (loading || !user) return
    const onPublicRoute = location.pathname === '/' || location.pathname.startsWith('/login')
    if (!onPublicRoute) return
    const last = localStorage.getItem(LAST_PAGE_KEY)
    navigate('/' + (last && last !== 'dashboard' ? last : landingPageFor(user.role)), { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading])

  return null
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <ToastProvider>
          <SessionRedirect />
          <Routes>
            <Route path="/" element={<PublicHome />} />
            <Route path="/login/:mode" element={<Login />} />

            <Route
              element={
                <RequireAuth>
                  <AuthedShell />
                </RequireAuth>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/principal-dashboard" element={<PrincipalDashboard />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/events" element={<Events />} />
              <Route path="/meetings" element={<Meetings />} />
              <Route path="/members" element={<Members />} />
              <Route path="/grievances" element={<Grievances />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/power" element={<Power />} />
              <Route path="/finance" element={<ComingSoon page="finance" />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </DataProvider>
    </AuthProvider>
  )
}
