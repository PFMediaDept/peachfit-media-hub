import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const GREEN = 'var(--green)';
const CARD = 'var(--dark-card)';
const CARD_LIGHT = 'var(--dark-light)';
const BORDER = 'var(--dark-border)';
const WHITE = 'var(--white)';

const ACTION_ICONS = {
  task_created: '🆕', task_deleted: '🗑️', status_changed: '🔄',
  assignee_changed: '👤', field_changed: '✏️',
  subtask_completed: '✅', subtask_uncompleted: '⬜',
};

const ACTION_LABELS = {
  task_created: 'Created task', task_deleted: 'Deleted task', status_changed: 'Changed status',
  assignee_changed: 'Changed assignee', field_changed: 'Updated field',
  subtask_completed: 'Completed subtask', subtask_uncompleted: 'Uncompleted subtask',
};

const FIELD_LABELS = {
  title: 'Title', status_id: 'Status', assignee_id: 'Assignee', priority: 'Priority',
  due_date: 'Due Date', publish_date: 'Publish Date', editor_assigned: 'Editor',
  editor_assigned_id: 'Editor', thumbnail_status: 'Thumbnail', content_pillar: 'Pillar',
  qc_score: 'QC Score', description: 'Description', subtask: 'Subtask',
};

export default function ActivityLog() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState([]);
  const [members, setMembers] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => { load(); }, []);

  async function load() {
    const [lRes, mRes, sRes] = await Promise.all([
      supabase.from('activity_log').select('*, user:profiles!activity_log_user_id_fkey(full_name, avatar_url), task:pipeline_tasks(title, branch_slug)').order('created_at', { ascending: false }).limit(500),
      supabase.from('profiles').select('id, full_name'),
      supabase.from('pipeline_statuses').select('id, name'),
    ]);
    if (lRes.data) setLogs(lRes.data);
    if (mRes.data) setMembers(mRes.data);
    if (sRes.data) setStatuses(sRes.data);
    setLoading(false);
  }

  function getStatusName(id) { return statuses.find(s => s.id === id)?.name || id; }
  function getMemberName(id) { return members.find(m => m.id === id)?.full_name || id; }

  const filtered = useMemo(() => {
    let f = logs;
    if (filterUser !== 'all') f = f.filter(l => l.user_id === filterUser);
    if (filterAction !== 'all') f = f.filter(l => l.action === filterAction);
    return f;
  }, [logs, filterUser, filterAction]);

  const paginated = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  function formatValue(field, value) {
    if (!value || value === 'null') return '--';
    if (field === 'status_id') return getStatusName(value);
    if (field === 'assignee_id' || field === 'editor_assigned_id') return getMemberName(value);
    return value;
  }

  function timeAgo(ts) {
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  if (!isAdmin) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Admin access required.</div>;
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading activity...</div>;

  const uniqueActions = [...new Set(logs.map(l => l.action))];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', fontFamily: 'Outfit, Arial, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: WHITE, margin: '0 0 4px' }}>Activity Log</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{filtered.length} events tracked</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={filterUser} onChange={e => { setFilterUser(e.target.value); setPage(0); }} style={s.select}>
          <option value="all">All team members</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </select>
        <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(0); }} style={s.select}>
          <option value="all">All actions</option>
          {uniqueActions.map(a => <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 'auto' }}>
          Page {page + 1} of {totalPages || 1}
        </span>
      </div>

      {/* Log entries */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
        {paginated.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>No activity found.</div>
        )}
        {paginated.map(log => (
          <div key={log.id} style={s.logRow}>
            {/* Icon */}
            <span style={{ fontSize: 16, flexShrink: 0 }}>{ACTION_ICONS[log.action] || '📝'}</span>

            {/* Avatar */}
            {log.user?.avatar_url ? (
              <img src={log.user.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 28, height: 28, borderRadius: 6, background: CARD_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {log.user?.full_name?.charAt(0) || '?'}
              </div>
            )}

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: WHITE, lineHeight: 1.4 }}>
                <span style={{ fontWeight: 600 }}>{log.user?.full_name || 'Unknown'}</span>
                {' '}
                <span style={{ color: 'var(--text-secondary)' }}>{ACTION_LABELS[log.action] || log.action}</span>
                {log.field_changed && log.field_changed !== 'subtask' && (
                  <span style={{ color: 'var(--text-muted)' }}> -- {FIELD_LABELS[log.field_changed] || log.field_changed}</span>
                )}
              </div>

              {/* Task reference */}
              {log.task?.title && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  on "{log.task.title}"
                </div>
              )}

              {/* Value change */}
              {log.old_value && log.new_value && log.field_changed !== 'description' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 12 }}>
                  <span style={{ color: '#EF4444', background: '#EF444412', padding: '1px 6px', borderRadius: 3, textDecoration: 'line-through' }}>
                    {formatValue(log.field_changed, log.old_value)}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>→</span>
                  <span style={{ color: '#37CA37', background: '#37CA3712', padding: '1px 6px', borderRadius: 3 }}>
                    {formatValue(log.field_changed, log.new_value)}
                  </span>
                </div>
              )}

              {/* Subtask detail */}
              {log.action === 'subtask_completed' && log.new_value && (
                <div style={{ fontSize: 12, color: '#37CA37', marginTop: 2 }}>✓ {log.new_value}</div>
              )}
              {log.action === 'subtask_uncompleted' && log.new_value && (
                <div style={{ fontSize: 12, color: '#F59E0B', marginTop: 2 }}>↩ {log.new_value}</div>
              )}

              {/* Details */}
              {log.details && !log.old_value && log.action !== 'subtask_completed' && log.action !== 'subtask_uncompleted' && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{log.details}</div>
              )}
            </div>

            {/* Timestamp */}
            <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, whiteSpace: 'nowrap' }}>
              {timeAgo(log.created_at)}
            </span>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ ...s.pageBtn, opacity: page === 0 ? 0.3 : 1 }}>← Prev</button>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={{ ...s.pageBtn, opacity: page >= totalPages - 1 ? 0.3 : 1 }}>Next →</button>
        </div>
      )}
    </div>
  );
}

const s = {
  select: { background: CARD_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 8, color: WHITE, padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: 'Outfit, Arial, sans-serif', minWidth: 160 },
  logRow: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: `1px solid var(--dark-border)11` },
  pageBtn: { background: CARD_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 6, color: WHITE, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
};
