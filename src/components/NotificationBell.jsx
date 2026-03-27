import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const GREEN = '#37CA37';
const PEACH = '#F4AB9C';
const CARD = 'var(--dark-card)';
const CARD_LIGHT = 'var(--dark-light)';
const BORDER = 'var(--dark-border)';
const WHITE = 'var(--white)';

const TYPE_ICONS = {
  task_assigned: '📋',
  subtask_assigned: '☑️',
  editor_assigned: '🎬',
  comment: '💬',
  mention: '@',
  status_change: '🔄',
};

const TYPE_COLORS = {
  task_assigned: GREEN,
  subtask_assigned: '#3B82F6',
  editor_assigned: '#F59E0B',
  comment: '#8B5CF6',
  mention: PEACH,
  status_change: '#6B7280',
};

export default function NotificationBell({ onTaskClick }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    init();
    // Close on outside click
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    fetchNotifications(user.id);

    // Real-time subscription
    const channel = supabase
      .channel('notifications-' + user.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }

  async function fetchNotifications(uid) {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setNotifications(data);
  }

  async function markRead(id) {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  async function markAllRead() {
    if (!userId) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  async function clearAll() {
    if (!userId) return;
    await supabase.from('notifications').delete().eq('user_id', userId).eq('read', true);
    setNotifications(prev => prev.filter(n => !n.read));
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  function timeAgo(ts) {
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }

  function handleClick(n) {
    markRead(n.id);
    if (n.task_id && onTaskClick) onTaskClick(n.task_id);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button onClick={() => setOpen(!open)} style={styles.bellBtn}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={unreadCount > 0 ? GREEN : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <div style={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</div>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={styles.dropdown}>
          {/* Header */}
          <div style={styles.dropdownHeader}>
            <span style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>Notifications</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={styles.headerAction}>Mark all read</button>
              )}
              {notifications.some(n => n.read) && (
                <button onClick={clearAll} style={styles.headerAction}>Clear read</button>
              )}
            </div>
          </div>

          {/* List */}
          <div style={styles.list}>
            {notifications.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No notifications yet
              </div>
            )}
            {notifications.map(n => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  ...styles.item,
                  background: n.read ? 'transparent' : GREEN + '08',
                  borderLeft: n.read ? '3px solid transparent' : `3px solid ${TYPE_COLORS[n.type] || GREEN}`,
                }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', width: '100%' }}>
                  <span style={{ fontSize: 16, lineHeight: '20px', flexShrink: 0 }}>
                    {TYPE_ICONS[n.type] || '📋'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 12, fontWeight: n.read ? 400 : 600,
                        color: n.read ? '#9CA3AF' : WHITE,
                      }}>
                        {n.title}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    <p style={{
                      margin: '2px 0 0', fontSize: 12,
                      color: n.read ? '#6B7280' : '#D1D5DB',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {n.body}
                    </p>
                  </div>
                  {!n.read && (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, flexShrink: 0, marginTop: 7 }} />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  bellBtn: {
    position: 'relative', background: 'transparent', border: 'none',
    cursor: 'pointer', padding: 8, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: 2, right: 2,
    background: '#EF4444', color: WHITE, fontSize: 9, fontWeight: 700,
    borderRadius: 10, minWidth: 16, height: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 4px', lineHeight: 1,
  },
  dropdown: {
    position: 'absolute', top: '100%', right: 0, marginTop: 8,
    width: 380, maxHeight: 480,
    background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
    boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
    overflow: 'hidden', zIndex: 1000,
  },
  dropdownHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', borderBottom: `1px solid ${BORDER}`,
  },
  headerAction: {
    background: 'transparent', border: 'none', color: GREEN,
    fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: '2px 6px',
  },
  list: { overflowY: 'auto', maxHeight: 420 },
  item: {
    display: 'flex', width: '100%', padding: '10px 14px',
    border: 'none', borderBottom: `1px solid ${BORDER}22`,
    cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
    background: 'transparent',
  },
};
