import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import NotificationBell from './NotificationBell'
import MobileNav from './MobileNav'
import ThemeToggle from "./ThemeToggle"
import WelcomeTour from "./WelcomeTour"

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const location = useLocation()

  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  // Prevent body scroll when sidebar open on mobile
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isMobile, sidebarOpen])

  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', paddingBottom: 72 }}>
        <WelcomeTour />
        {/* Mobile top bar */}
        <div style={styles.mobileTopBar}>
          <button onClick={() => setSidebarOpen(true)} style={styles.menuBtn}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--white)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/logo.avif" alt="PeachFit" style={{ width: 26, height: 26, objectFit: 'contain' }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--white)' }}>PeachFit</span>
          </div>
          <ThemeToggle /><NotificationBell />
        </div>

        {/* Sidebar overlay */}
        {sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} style={styles.overlay} />
        )}

        {/* Slide-in sidebar */}
        <div style={{
          ...styles.mobileSidebar,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}>
          <Sidebar />
        </div>

        {/* Page content */}
        <div style={{ padding: '8px 16px 16px' }}>
          <Outlet />
        </div>

        {/* Bottom tab bar */}
        <MobileNav onMenuToggle={() => setSidebarOpen(prev => !prev)} />
      </div>
    )
  }

  // Desktop layout
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <WelcomeTour />
      <Sidebar />
      <main style={{
        marginLeft: 'var(--sidebar-width)',
        flex: 1,
        minHeight: '100vh',
        position: 'relative',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          padding: '12px 32px 0',
        }}>
          <ThemeToggle /><NotificationBell />
        </div>
        <div style={{ padding: '12px 32px 32px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}

const styles = {
  mobileTopBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    paddingTop: 'max(10px, env(safe-area-inset-top))',
    background: 'var(--dark)',
    borderBottom: '1px solid var(--dark-border)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  menuBtn: {
    background: 'transparent',
    border: 'none',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 998,
  },
  mobileSidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: 280,
    height: '100vh',
    zIndex: 999,
    transition: 'transform 0.25s ease',
    overflow: 'auto',
    boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
  },
}
