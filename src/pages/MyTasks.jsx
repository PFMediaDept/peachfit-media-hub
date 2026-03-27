import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

const GREEN = '#37CA37';
const NEON = '#07FB89';
const PEACH = '#F4AB9C';
const BG = '#0C0C0C';
const CARD = '#141414';
const CARD_LIGHT = '#1A1A1A';
const BORDER = '#2A2A2A';
const WHITE = '#FFFFFF';

const BRANCH_COLORS = {
  youtube: '#FF0000',
  'short-form': '#8B5CF6',
  'ads-creative': '#F59E0B',
  production: '#3B82F6',
};

const BRANCH_LABELS = {
  youtube: 'YouTube',
  'short-form': 'Short Form',
  'ads-creative': 'Ads/Creative',
  production: 'Production',
};

const PRIORITY_COLORS = {
  urgent: '#EF4444',
  high: '#F59E0B',
  medium: '#3B82F6',
  low: '#6B7280',
};

const SUBTASK_COLORS = {
  youtube: {
    1: '#6B7280', 2: '#F59E0B', 3: '#F59E0B', 4: '#F59E0B',
    5: '#F59E0B', 6: '#F59E0B', 7: '#3B82F6', 8: '#3B82F6',
    9: '#EC4899', 10: '#EC4899', 11: '#8B5CF6', 12: '#EC4899',
    13: '#F97316', 14: '#F97316', 15: '#10B981', 16: '#37CA37',
  },
  'short-form': {
    1: '#F59E0B', 2: '#3B82F6', 3: '#3B82F6', 4: '#8B5CF6',
    5: '#8B5CF6', 6: '#EC4899', 7: '#10B981', 8: '#10B981',
    9: '#10B981', 10: '#37CA37', 11: '#37CA37',
  },
  'ads-creative': {
    1: '#F59E0B', 2: '#F59E0B', 3: '#3B82F6', 4: '#8B5CF6',
    5: '#EC4899', 6: '#EC4899', 7: '#10B981', 8: '#37CA37', 9: '#6B7280',
  },
  production: {
    1: '#F59E0B', 2: '#3B82F6', 3: '#8B5CF6', 4: '#EC4899',
    5: '#10B981', 6: '#6B7280',
  },
};

function parseLocal(s) { const [y,m,d] = s.split('-'); return new Date(y, m-1, d); }

function dueLabel(due) {
  if (!due) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = parseLocal(due); d.setHours(0,0,0,0);
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, color: '#EF4444' };
  if (diff === 0) return { text: 'Due today', color: '#F59E0B' };
  if (diff === 1) return { text: 'Due tomorrow', color: '#F59E0B' };
  if (diff <= 7) return { text: `Due in ${diff}d`, color: '#3B82F6' };
  return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: '#6B7280' };
}

export default function MyTasks() {
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [editorTasks, setEditorTasks] = useState([]);
  const [assignedSubtasks, setAssignedSubtasks] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [viewFilter, setViewFilter] = useState('all'); // all, tasks, subtasks, editor
  const [branchFilter, setBranchFilter] = useState('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { init(); }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // Get user profile
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    if (profile) setUserName(profile.full_name || '');

    // Load statuses
    const { data: sts } = await supabase.from('pipeline_statuses').select('*').order('sort_order');
    if (sts) setStatuses(sts);

    await Promise.all([
      loadAssignedTasks(user.id),
      loadEditorTasks(user.id),
      loadAssignedSubtasks(user.id),
    ]);
    setLoading(false);
  }

  async function loadAssignedTasks(uid) {
    const { data } = await supabase
      .from('pipeline_tasks')
      .select('*, status:pipeline_statuses(name, branch_slug, sort_order)')
      .eq('assignee_id', uid)
      .order('due_date', { ascending: true, nullsFirst: false });
    if (data) setAssignedTasks(data);
  }

  async function loadEditorTasks(uid) {
    const { data } = await supabase
      .from('pipeline_tasks')
      .select('*, status:pipeline_statuses(name, branch_slug, sort_order)')
      .eq('editor_assigned_id', uid)
      .order('due_date', { ascending: true, nullsFirst: false });
    if (data) setEditorTasks(data);
  }

  async function loadAssignedSubtasks(uid) {
    const { data } = await supabase
      .from('pipeline_subtasks')
      .select('*, task:pipeline_tasks(id, title, branch_slug, due_date, status:pipeline_statuses(name))')
      .eq('assignee_id', uid)
      .order('sort_order');
    if (data) setAssignedSubtasks(data);
  }

  async function toggleSubtask(st) {
    const done = !st.completed;
    await supabase.from('pipeline_subtasks').update({
      completed: done,
      completed_at: done ? new Date().toISOString() : null,
    }).eq('id', st.id);
    // Refresh
    if (userId) loadAssignedSubtasks(userId);
  }

  // Derived stats
  const stats = useMemo(() => {
    const allTasks = [...assignedTasks, ...editorTasks];
    const uniqueTasks = [...new Map(allTasks.map(t => [t.id, t])).values()];
    const overdue = uniqueTasks.filter(t => {
      if (!t.due_date) return false;
      const d = parseLocal(t.due_date); d.setHours(0,0,0,0);
      const today = new Date(); today.setHours(0,0,0,0);
      return d < today;
    }).length;
    const dueToday = uniqueTasks.filter(t => {
      if (!t.due_date) return false;
      const d = parseLocal(t.due_date); d.setHours(0,0,0,0);
      const today = new Date(); today.setHours(0,0,0,0);
      return d.getTime() === today.getTime();
    }).length;
    const openSubtasks = assignedSubtasks.filter(s => !s.completed).length;
    const totalSubtasks = assignedSubtasks.length;

    return { totalTasks: uniqueTasks.length, overdue, dueToday, openSubtasks, totalSubtasks };
  }, [assignedTasks, editorTasks, assignedSubtasks]);

  // Filtered + grouped data
  const filteredTasks = useMemo(() => {
    let items = [];
    if (viewFilter === 'all' || viewFilter === 'tasks') items = [...items, ...assignedTasks.map(t => ({ ...t, _type: 'assigned' }))];
    if (viewFilter === 'all' || viewFilter === 'editor') items = [...items, ...editorTasks.map(t => ({ ...t, _type: 'editor' }))];

    // Deduplicate
    items = [...new Map(items.map(t => [t.id + t._type, t])).values()];

    if (branchFilter !== 'all') items = items.filter(t => t.branch_slug === branchFilter);

    // Sort: overdue first, then by due date
    items.sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    });

    return items;
  }, [assignedTasks, editorTasks, viewFilter, branchFilter]);

  const filteredSubtasks = useMemo(() => {
    let items = assignedSubtasks;
    if (!showCompleted) items = items.filter(s => !s.completed);
    if (branchFilter !== 'all') items = items.filter(s => s.task?.branch_slug === branchFilter);
    return items;
  }, [assignedSubtasks, showCompleted, branchFilter]);

  // Group tasks by branch
  const tasksByBranch = useMemo(() => {
    const groups = {};
    filteredTasks.forEach(t => {
      const branch = t.branch_slug || 'unknown';
      if (!groups[branch]) groups[branch] = [];
      groups[branch].push(t);
    });
    return groups;
  }, [filteredTasks]);

  // Group subtasks by parent task
  const subtasksByTask = useMemo(() => {
    const groups = {};
    filteredSubtasks.forEach(s => {
      const taskId = s.task_id;
      if (!groups[taskId]) groups[taskId] = { task: s.task, subtasks: [] };
      groups[taskId].subtasks.push(s);
    });
    return Object.values(groups);
  }, [filteredSubtasks]);

  function getStatusName(statusId) {
    const s = statuses.find(st => st.id === statusId);
    return s ? s.name : 'Unknown';
  }

  if (loading) {
    return (
      <div style={{ padding: '60px 32px', textAlign: 'center', color: '#6B7280' }}>
        Loading your tasks...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto', fontFamily: 'Outfit, Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: WHITE, margin: '0 0 4px' }}>
          My Tasks
        </h1>
        <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
          {userName ? `Everything assigned to ${userName.split(' ')[0]}` : 'Everything assigned to you'}
        </p>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="Total Tasks" value={stats.totalTasks} color={WHITE} />
        <StatCard label="Overdue" value={stats.overdue} color={stats.overdue > 0 ? '#EF4444' : '#6B7280'} />
        <StatCard label="Due Today" value={stats.dueToday} color={stats.dueToday > 0 ? '#F59E0B' : '#6B7280'} />
        <StatCard label="Open Subtasks" value={stats.openSubtasks} color={stats.openSubtasks > 0 ? '#3B82F6' : '#6B7280'} />
        <StatCard label="Subtasks Done" value={`${stats.totalSubtasks - stats.openSubtasks}/${stats.totalSubtasks}`} color={GREEN} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* View filter */}
        <div style={styles.toggleGroup}>
          {[
            { key: 'all', label: 'All' },
            { key: 'tasks', label: 'Tasks' },
            { key: 'subtasks', label: 'Subtasks' },
            { key: 'editor', label: 'Editor' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setViewFilter(f.key)}
              style={{ ...styles.toggleBtn, ...(viewFilter === f.key ? styles.toggleActive : {}) }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Branch filter */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setBranchFilter('all')} style={{ ...styles.filterBtn, ...(branchFilter === 'all' ? { background: '#374151', color: WHITE } : {}) }}>All</button>
          {Object.entries(BRANCH_LABELS).map(([slug, label]) => (
            <button
              key={slug}
              onClick={() => setBranchFilter(slug)}
              style={{
                ...styles.filterBtn,
                ...(branchFilter === slug ? { background: BRANCH_COLORS[slug] + '33', color: BRANCH_COLORS[slug], borderColor: BRANCH_COLORS[slug] } : {}),
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Show completed subtasks toggle */}
        {(viewFilter === 'all' || viewFilter === 'subtasks') && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginLeft: 'auto' }}>
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={e => setShowCompleted(e.target.checked)}
              style={{ accentColor: GREEN }}
            />
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>Show completed subtasks</span>
          </label>
        )}
      </div>

      {/* Tasks section */}
      {(viewFilter === 'all' || viewFilter === 'tasks' || viewFilter === 'editor') && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={styles.sectionHeader}>
            {viewFilter === 'editor' ? '🎬 Editor Assignments' : '📋 Assigned Tasks'}
            <span style={styles.count}>{filteredTasks.length}</span>
          </h2>

          {filteredTasks.length === 0 && (
            <div style={styles.emptyState}>
              {viewFilter === 'editor' ? 'No editor assignments' : 'No tasks assigned to you'}
            </div>
          )}

          {Object.entries(tasksByBranch).map(([branch, tasks]) => (
            <div key={branch} style={{ marginBottom: 16 }}>
              {/* Branch header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: BRANCH_COLORS[branch] || '#6B7280' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: BRANCH_COLORS[branch] || '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {BRANCH_LABELS[branch] || branch}
                </span>
                <span style={{ fontSize: 11, color: '#6B7280' }}>({tasks.length})</span>
              </div>

              {/* Task cards */}
              {tasks.map(task => {
                const due = dueLabel(task.due_date);
                return (
                  <div key={task.id + (task._type || '')} style={styles.taskCard}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
                      {/* Priority dot */}
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                        background: PRIORITY_COLORS[task.priority] || '#374151',
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: WHITE }}>{task.title}</span>
                          {task._type === 'editor' && (
                            <span style={styles.editorBadge}>Editor</span>
                          )}
                          {task.is_sob && (
                            <span style={styles.sobBadge}>SOB</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, color: '#6B7280' }}>
                            {task.status?.name || getStatusName(task.status_id)}
                          </span>
                          {task.priority && (
                            <span style={{ fontSize: 11, color: PRIORITY_COLORS[task.priority], fontWeight: 500 }}>
                              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                            </span>
                          )}
                          {task.content_pillar && (
                            <span style={{ fontSize: 11, color: '#6B7280' }}>
                              {task.content_pillar}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Right side -- due date + publish date */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      {due && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: due.color }}>
                          {due.text}
                        </span>
                      )}
                      {task.publish_date && (
                        <span style={{ fontSize: 10, color: '#6B7280' }}>
                          Publish: {parseLocal(task.publish_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      {/* Links */}
                      <div style={{ display: 'flex', gap: 4 }}>
                        {task.script_link && <a href={task.script_link} target="_blank" rel="noopener" style={styles.linkPill}>Script</a>}
                        {task.drive_folder_link && <a href={task.drive_folder_link} target="_blank" rel="noopener" style={styles.linkPill}>Drive</a>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Subtasks section */}
      {(viewFilter === 'all' || viewFilter === 'subtasks') && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={styles.sectionHeader}>
            ☑️ Assigned Subtasks
            <span style={styles.count}>{filteredSubtasks.length}</span>
          </h2>

          {filteredSubtasks.length === 0 && (
            <div style={styles.emptyState}>
              {showCompleted ? 'No subtasks assigned to you' : 'All subtasks complete -- nice work'}
            </div>
          )}

          {subtasksByTask.map(({ task, subtasks }) => {
            const branchSlug = task?.branch_slug || 'youtube';
            return (
              <div key={task?.id || 'unknown'} style={{ marginBottom: 16 }}>
                {/* Parent task header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
                  padding: '6px 12px', background: CARD_LIGHT, borderRadius: 6,
                  borderLeft: `3px solid ${BRANCH_COLORS[branchSlug] || '#6B7280'}`,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: WHITE }}>
                    {task?.title || 'Unknown Task'}
                  </span>
                  <span style={{ fontSize: 10, color: '#6B7280' }}>
                    {task?.status?.name || ''}
                  </span>
                  {task?.due_date && (() => {
                    const d = dueLabel(task.due_date);
                    return d ? <span style={{ fontSize: 10, fontWeight: 600, color: d.color, marginLeft: 'auto' }}>{d.text}</span> : null;
                  })()}
                </div>

                {/* Subtask rows */}
                {subtasks.map(st => {
                  const stColor = (st.color && st.color !== '#6B7280')
                    ? st.color
                    : SUBTASK_COLORS[branchSlug]?.[st.sort_order] || '#6B7280';
                  return (
                    <div key={st.id} style={styles.subtaskRow}>
                      <div style={{ ...styles.subtaskDot, background: stColor, opacity: st.completed ? 0.4 : 1 }} />
                      <input
                        type="checkbox"
                        checked={st.completed}
                        onChange={() => toggleSubtask(st)}
                        style={{ accentColor: GREEN, cursor: 'pointer' }}
                      />
                      <span style={{
                        flex: 1, fontSize: 13,
                        color: st.completed ? '#6B7280' : WHITE,
                        textDecoration: st.completed ? 'line-through' : 'none',
                      }}>
                        {st.title}
                      </span>
                      {st.completed && st.completed_at && (
                        <span style={{ fontSize: 10, color: '#6B7280' }}>
                          {new Date(st.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* Stat card component */
function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10,
      padding: '12px 18px', minWidth: 100, flex: 1,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <span style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

const styles = {
  toggleGroup: { display: 'flex', background: CARD_LIGHT, borderRadius: 6, border: `1px solid ${BORDER}`, overflow: 'hidden' },
  toggleBtn: { background: 'transparent', border: 'none', color: '#9CA3AF', padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 500 },
  toggleActive: { background: GREEN + '22', color: GREEN },
  filterBtn: { background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 6, color: '#9CA3AF', padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 500 },
  sectionHeader: {
    fontSize: 15, fontWeight: 700, color: WHITE, margin: '0 0 12px',
    display: 'flex', alignItems: 'center', gap: 8,
    paddingBottom: 8, borderBottom: `1px solid ${BORDER}`,
  },
  count: {
    fontSize: 12, fontWeight: 600, color: GREEN,
    background: GREEN + '15', borderRadius: 10, padding: '2px 8px',
  },
  emptyState: {
    padding: 32, textAlign: 'center', color: '#6B7280', fontSize: 13,
    background: CARD, borderRadius: 10, border: `1px solid ${BORDER}`,
  },
  taskCard: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', background: CARD, border: `1px solid ${BORDER}`,
    borderRadius: 8, marginBottom: 6, gap: 16,
    transition: 'border-color 0.15s', cursor: 'default',
  },
  editorBadge: {
    fontSize: 9, fontWeight: 700, color: '#F59E0B',
    background: '#F59E0B22', border: '1px solid #F59E0B44',
    borderRadius: 4, padding: '2px 6px', textTransform: 'uppercase',
  },
  sobBadge: {
    fontSize: 9, fontWeight: 700, color: PEACH,
    background: PEACH + '22', border: `1px solid ${PEACH}44`,
    borderRadius: 4, padding: '2px 6px',
  },
  linkPill: {
    fontSize: 10, fontWeight: 600, color: GREEN,
    background: GREEN + '12', borderRadius: 3, padding: '2px 6px',
    textDecoration: 'none',
  },
  subtaskRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 12px 6px 24px',
    borderBottom: `1px solid ${BORDER}11`,
  },
  subtaskDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
};
