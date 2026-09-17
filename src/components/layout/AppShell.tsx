import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import CommandPalette from './CommandPalette'

export default function AppShell() {
  return (
    <div className="app-wrapper" id="app-container">
      <div className="app-inner">
        <Topbar />
        <Sidebar />
        <main>
          <Outlet />
        </main>
      </div>
      <CommandPalette />
    </div>
  )
}
