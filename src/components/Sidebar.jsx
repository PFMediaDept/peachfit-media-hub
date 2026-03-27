import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

const branchIcons = {
  youtube: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  'short-form': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  'ads-creative': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  production: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
}

const sectionIcons = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  pipeline: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  sops: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  onboarding: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  assets: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  team: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  standards: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  links: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  calendar: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  admin: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
}

const branchColors = {
  youtube: '#378ADD',
  'short-form': '#7F77DD',
  'ads-creative': '#D85A30',
  production: '#D4537E',
}

export default function Sidebar() {
  const { profile, branches, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const navLinkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '14px',
    color: isActive ? 'var(--white)' : 'var(--text-secondary)',
    background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
    textDecoration: 'none',
    transition: 'all 0.15s',
  })

  return (
    <aside style={styles.sidebar}>
      <div style={styles.logo}>
        <div style={styles.logoMark}>P</div>
        <div>
          <div style={styles.logoText}>PeachFit</div>
          <div style={styles.logoSub}>Media Hub</div>
        </div>
      </div>

      <nav style={styles.nav}>
        <div style={styles.sectionLabel}>General</div>
        <NavLink to="/dashboard" style={navLinkStyle}>
          {sectionIcons.dashboard}
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/my-tasks" style={navLinkStyle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          <span>My Tasks</span>
        </NavLink>
        <NavLink to="/team" style={navLinkStyle}>
          {sectionIcons.team}
          <span>Team directory</span>
        </NavLink>
        <NavLink to="/standards" style={navLinkStyle}>
          {sectionIcons.standards}
          <span>Dept standards</span>
        </NavLink>
        <NavLink to="/assets" style={navLinkStyle}>
          {sectionIcons.assets}
          <span>Brand assets</span>
        </NavLink>
        <NavLink to="/links" style={navLinkStyle}>
          {sectionIcons.links}
          <span>Quick links</span>
        </NavLink>
        <NavLink to="/calendar" style={navLinkStyle}>
          {sectionIcons.calendar}
          <span>Content calendar</span>
        </NavLink>

        {branches.length > 0 && (
          <>
            <div style={{ ...styles.sectionLabel, marginTop: '20px' }}>My branches</div>
            {branches.map((branch) => (
              <div key={branch.id}>
                <NavLink
                  to={`/branch/${branch.slug}`}
                  style={navLinkStyle}
                  end
                >
                  <span style={{ color: branchColors[branch.slug] || 'var(--green)' }}>
                    {branchIcons[branch.slug] || branchIcons.youtube}
                  </span>
                  <span>{branch.name}</span>
                </NavLink>
                <div style={styles.subNav}>
                  <NavLink to={`/branch/${branch.slug}/pipeline`} style={navLinkStyle}>
                    {sectionIcons.pipeline}
                    <span>Pipeline</span>
                  </NavLink>
                  <NavLink to={`/branch/${branch.slug}/sops`} style={navLinkStyle}>
                    {sectionIcons.sops}
                    <span>SOPs & training</span>
                  </NavLink>
                  <NavLink to={`/branch/${branch.slug}/onboarding`} style={navLinkStyle}>
                    {sectionIcons.onboarding}
                    <span>Onboarding</span>
                  </NavLink>
                </div>
              </div>
            ))}
          </>
        )}

        {isAdmin && (
          <>
            <div style={{ ...styles.sectionLabel, marginTop: '20px' }}>Admin</div>
            <NavLink to="/admin/users" style={navLinkStyle}>
              {sectionIcons.admin}
              <span>User management</span>
            </NavLink>
            <NavLink to="/admin/sops" style={navLinkStyle}>
              {sectionIcons.sops}
              <span>SOP manager</span>
            </NavLink>
            <NavLink to="/admin/announcements" style={navLinkStyle}>
              {sectionIcons.dashboard}
              <span>Announcements</span>
            </NavLink>
            <NavLink to="/admin/onboarding" style={navLinkStyle}>
              {sectionIcons.onboarding}
              <span>Onboarding editor</span>
            </NavLink>
            <NavLink to="/admin/settings" style={navLinkStyle}>
              {sectionIcons.admin}
              <span>Settings</span>
            </NavLink>
          </>
        )}
      </nav>

      <div style={styles.userArea}>
        <div style={styles.userInfo}>
          <div style={styles.avatar}>
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <div style={styles.userName}>{profile?.full_name || 'User'}</div>
            <div style={styles.userRole}>{profile?.title || 'Team Member'}</div>
          </div>
        </div>
        <button onClick={handleSignOut} style={styles.signOut}>
          Sign out
        </button>
      </div>
    </aside>
  )
}

const styles = {
  sidebar: {
    width: 'var(--sidebar-width)',
    height: '100vh',
    position: 'fixed',
    left: 0,
    top: 0,
    background: 'var(--dark-card)',
    borderRight: '1px solid var(--dark-border)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px 20px 16px',
    borderBottom: '1px solid var(--dark-border)',
  },
  logoMark: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'var(--green)',
    color: 'var(--black)',
    fontSize: '18px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoText: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--white)',
  },
  logoSub: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  nav: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 12px',
  },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    padding: '4px 14px 8px',
  },
  subNav: {
    paddingLeft: '16px',
  },
  userArea: {
    padding: '16px',
    borderTop: '1px solid var(--dark-border)',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'var(--green)',
    color: 'var(--black)',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userName: {
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--white)',
  },
  userRole: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  signOut: {
    width: '100%',
    padding: '8px',
    background: 'transparent',
    border: '1px solid var(--dark-border)',
    borderRadius: '8px',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    cursor: 'pointer',
  },
}
