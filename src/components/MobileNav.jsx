import { useLocation, useNavigate } from 'react-router-dom';

const GREEN = '#37CA37';
const BG = '#0C0C0C';
const BORDER = '#2A2A2A';

const tabs = [
  {
    key: 'home',
    label: 'Home',
    path: '/dashboard',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? GREEN : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    key: 'tasks',
    label: 'My Tasks',
    path: '/my-tasks',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? GREEN : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    key: 'calendar',
    label: 'Calendar',
    path: '/calendar',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? GREEN : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    key: 'menu',
    label: 'Menu',
    path: null,
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? GREEN : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    ),
  },
];

export default function MobileNav({ onMenuToggle }) {
  const location = useLocation();
  const navigate = useNavigate();

  function isActive(tab) {
    if (tab.key === 'home') return location.pathname === '/dashboard' || location.pathname === '/';
    if (tab.path) return location.pathname.startsWith(tab.path);
    return false;
  }

  function handleTap(tab) {
    if (tab.key === 'menu') {
      if (onMenuToggle) onMenuToggle();
    } else if (tab.path) {
      navigate(tab.path);
    }
  }

  return (
    <nav style={styles.bar}>
      {tabs.map(tab => {
        const active = isActive(tab);
        return (
          <button key={tab.key} onClick={() => handleTap(tab)} style={styles.tab}>
            {tab.icon(active)}
            <span style={{ ...styles.label, color: active ? GREEN : '#6B7280' }}>{tab.label}</span>
            {active && <div style={styles.indicator} />}
          </button>
        );
      })}
    </nav>
  );
}

const styles = {
  bar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    background: BG,
    borderTop: `1px solid ${BORDER}`,
    paddingBottom: 'env(safe-area-inset-bottom, 8px)',
    paddingTop: 6,
    zIndex: 900,
  },
  tab: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    background: 'transparent',
    border: 'none',
    padding: '4px 12px',
    cursor: 'pointer',
    position: 'relative',
    minWidth: 56,
  },
  label: {
    fontSize: 10,
    fontWeight: 600,
    fontFamily: 'Outfit, Arial, sans-serif',
  },
  indicator: {
    position: 'absolute',
    top: -6,
    width: 20,
    height: 3,
    borderRadius: 2,
    background: GREEN,
  },
};
