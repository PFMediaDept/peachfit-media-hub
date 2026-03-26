# PEACHFIT MEDIA HUB -- BUILD HANDOFF DOCUMENT
# Use this to continue the build in a new chat session

---

## CONTEXT FOR NEW CHAT

Paste this at the start of your new chat:

"""
I'm building the PeachFit Media Hub -- a React web portal for my media department. It has role-based login (Supabase auth), four department branches (YouTube, Short Form, Ads/Creative, Production), an admin panel, embedded ClickUp pipelines, SOP libraries, onboarding checklists, and a branded dark theme.

Tech stack: React + Vite, Supabase (auth + PostgreSQL), deploying to Vercel. All free tier.

The foundation is built. I have the following files completed:

- package.json (dependencies defined)
- vite.config.js
- index.html (entry point with Outfit font)
- .env.example (Supabase URL and anon key)
- src/styles/global.css (PeachFit dark theme, brand colors)
- src/lib/supabase.js (Supabase client)
- src/lib/AuthContext.jsx (auth provider with role/branch loading)
- src/components/ProtectedRoute.jsx (route guard)
- src/components/Sidebar.jsx (nav with branch-based sections)
- src/components/Layout.jsx (sidebar + main content wrapper)
- src/pages/Login.jsx (branded login page)
- src/pages/Dashboard.jsx (landing page with announcements + branch cards)
- src/pages/Branch.jsx (branch overview, pipeline embed, SOPs, onboarding)
- src/pages/AdminUsers.jsx (user management + invite system)
- src/pages/GeneralPages.jsx (team directory, dept standards, brand assets, quick links)
- src/main.jsx (routing setup)
- supabase-schema.sql (full database schema with RLS policies + seed data)

What still needs to be built:
1. Admin SOP Manager page (CRUD for SOPs, assign to branches)
2. Admin Announcements page (create/edit/delete announcements)
3. Admin Onboarding Editor page (create/edit onboarding checklists per branch)
4. Admin Quick Links Editor page
5. Admin Brand Assets Editor page
6. Admin Branch Settings page (set ClickUp embed URLs per branch)
7. Admin Department Standards Editor page
8. Vercel deployment config (vercel.json for SPA routing)
9. README with full setup instructions
10. Onboarding email template (what new hires receive)

Brand specs:
- PeachFit Green: #37CA37 (docs) / #07FB89 (neon)
- Peach: #F4AB9C
- Black: #000000 / Dark: #0C0C0C / Dark Light: #1A1A1A
- White: #FFFFFF
- Font: Outfit (Google Fonts), Arial fallback
- Dark theme throughout
- No em dashes anywhere -- use double hyphens (--)

Please continue building the remaining admin pages and deployment config. Start with the Admin SOP Manager.
"""

---

## ALL COMPLETED FILES

Below is every file that has been built. Copy each one into the correct path in your project.

---

### FILE: package.json

```json
{
  "name": "peachfit-media-hub",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "@supabase/supabase-js": "^2.39.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.1.0"
  }
}
```

---

### FILE: vite.config.js

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

---

### FILE: index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PeachFit Media Hub</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

---

### FILE: .env.example

```
VITE_SUPABASE_URL=your-supabase-project-url-here
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

---

### FILE: src/styles/global.css

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --green: #37CA37;
  --neon-green: #07FB89;
  --peach: #F4AB9C;
  --black: #000000;
  --dark: #0C0C0C;
  --dark-light: #1A1A1A;
  --dark-card: #141414;
  --dark-border: #2A2A2A;
  --white: #FFFFFF;
  --gray-100: #F5F5F5;
  --gray-200: #E5E5E5;
  --gray-300: #CCCCCC;
  --gray-400: #999999;
  --gray-500: #666666;
  --gray-600: #444444;
  --text-primary: #FFFFFF;
  --text-secondary: #AAAAAA;
  --text-muted: #777777;
  --sidebar-width: 260px;
  --header-height: 64px;
}

body {
  font-family: 'Outfit', Arial, sans-serif;
  background-color: var(--dark);
  color: var(--text-primary);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

a {
  color: var(--green);
  text-decoration: none;
}

a:hover {
  color: var(--neon-green);
}

input, select, textarea {
  font-family: 'Outfit', Arial, sans-serif;
}

button {
  font-family: 'Outfit', Arial, sans-serif;
  cursor: pointer;
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: var(--dark);
}

::-webkit-scrollbar-thumb {
  background: var(--gray-600);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--gray-500);
}
```

---

### FILE: src/lib/supabase.js

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

### FILE: src/lib/AuthContext.jsx

```jsx
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, user_branches(branch_id, branches(id, name, slug, color))')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setProfile(null)
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    if (error) throw error
  }

  const isAdmin = profile?.role === 'admin'

  const branches = profile?.user_branches?.map(ub => ub.branches) ?? []

  const value = {
    user,
    profile,
    branches,
    isAdmin,
    loading,
    signIn,
    signOut,
    updatePassword,
    refreshProfile: () => user && fetchProfile(user.id),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
```

---

### FILE: src/components/ProtectedRoute.jsx

```jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export function ProtectedRoute({ children, adminOnly = false }) {
  const { user, isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--dark)',
        color: 'var(--text-secondary)',
        fontFamily: 'Outfit, Arial, sans-serif',
        fontSize: '14px',
      }}>
        Loading...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
```

---

### FILE: src/components/Sidebar.jsx

```jsx
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
```

---

### FILE: src/components/Layout.jsx

```jsx
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{
        marginLeft: 'var(--sidebar-width)',
        flex: 1,
        padding: '32px',
        minHeight: '100vh',
      }}>
        <Outlet />
      </main>
    </div>
  )
}
```

---

### FILE: src/pages/Login.jsx
(Full file already in project -- 180 lines, branded login page with PeachFit dark theme)

### FILE: src/pages/Dashboard.jsx
(Full file already in project -- 200 lines, landing page with greeting, branch cards, announcements, quick access)

### FILE: src/pages/Branch.jsx
(Full file already in project -- 350 lines, contains BranchOverview, BranchPipeline, BranchSOPs, BranchOnboarding components)

### FILE: src/pages/AdminUsers.jsx
(Full file already in project -- 280 lines, user management with invite form and user list)

### FILE: src/pages/GeneralPages.jsx
(Full file already in project -- 150 lines, contains TeamDirectory, DeptStandards, BrandAssets, QuickLinks)

### FILE: src/main.jsx

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Branch, { BranchOverview, BranchPipeline, BranchSOPs, BranchOnboarding } from './pages/Branch'
import AdminUsers from './pages/AdminUsers'
import { TeamDirectory, DeptStandards, BrandAssets, QuickLinks } from './pages/GeneralPages'
import './styles/global.css'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/team" element={<TeamDirectory />} />
            <Route path="/standards" element={<DeptStandards />} />
            <Route path="/assets" element={<BrandAssets />} />
            <Route path="/links" element={<QuickLinks />} />

            <Route path="/branch/:slug" element={<Branch />}>
              <Route index element={<BranchOverview />} />
              <Route path="pipeline" element={<BranchPipeline />} />
              <Route path="sops" element={<BranchSOPs />} />
              <Route path="onboarding" element={<BranchOnboarding />} />
            </Route>

            <Route path="/admin/users" element={
              <ProtectedRoute adminOnly>
                <AdminUsers />
              </ProtectedRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

---

### FILE: supabase-schema.sql
(Full 250-line SQL file with all tables, RLS policies, triggers, and seed data -- already in project)

---

## SETUP INSTRUCTIONS (FOR WHEN YOU DEPLOY)

1. Create GitHub repo called peachfit-media-hub
2. Copy all files into the repo with correct folder structure
3. In Supabase dashboard, go to SQL Editor, paste supabase-schema.sql, click Run
4. In Supabase dashboard, go to Settings > API, copy the Project URL and anon/public key
5. Create .env file (copy .env.example) and paste your Supabase URL and key
6. Run: npm install
7. Run: npm run dev (to test locally)
8. Push to GitHub
9. In Vercel, import the GitHub repo, it auto-detects Vite
10. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY as environment variables in Vercel
11. Deploy

## CREATE YOUR ADMIN ACCOUNT

After running the schema, create your first user in Supabase:
1. Go to Authentication > Users > Invite User
2. Enter garrett@peachfitwellness.com
3. After the user is created, go to Table Editor > profiles
4. Find your row, change role from 'member' to 'admin'
5. Add your full_name and title
6. Go to user_branches table, add rows linking your user_id to all 4 branch IDs (so you can see everything)

---

## FOLDER STRUCTURE

```
peachfit-media-hub/
  index.html
  package.json
  vite.config.js
  .env.example
  supabase-schema.sql
  src/
    main.jsx
    styles/
      global.css
    lib/
      supabase.js
      AuthContext.jsx
    components/
      ProtectedRoute.jsx
      Sidebar.jsx
      Layout.jsx
    pages/
      Login.jsx
      Dashboard.jsx
      Branch.jsx
      AdminUsers.jsx
      GeneralPages.jsx
```
