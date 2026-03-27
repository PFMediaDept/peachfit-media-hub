import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import NotificationBell from './NotificationBell'

export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{
        marginLeft: 'var(--sidebar-width)',
        flex: 1,
        minHeight: '100vh',
        position: 'relative',
      }}>
        {/* Top bar with notification bell */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          padding: '12px 32px 0',
        }}>
          <NotificationBell />
        </div>
        <div style={{ padding: '12px 32px 32px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
