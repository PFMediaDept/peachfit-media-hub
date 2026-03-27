import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

const GREEN = '#37CA37';
const NEON = '#07FB89';
const PEACH = '#F4AB9C';
const BG = 'var(--dark)';
const CARD = 'var(--dark-card)';
const CARD_LIGHT = 'var(--dark-light)';
const BORDER = 'var(--dark-border)';
const WHITE = 'var(--white)';

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
  return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: 'var(--text-muted)' };
}

function dueColor(due) {
  if (!due) return '#6B7280';
  const today = new Date(); today.setHours(0,0,0,0);
  const d = parseLocal(due); d.setHours(0,0,0,0);
  const diff = (d - today) / 86400000;
  if (diff < 0) return '#EF4444';
  if (diff <= 2) return '#F59E0B';
  return '#6B7280';
}

/* ══════════════════════════════════════════════════════════
   TASK DETAIL MODAL
   ══════════════════════════════════════════════════════════ */
function TaskDetailModal({ task, onClose, members, statuses, onUpdate }) {
  const [subtasks, setSubtasks] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [localTask, setLocalTask] = useState(task);
  const branchSlug = task.branch_slug;

  useEffect(() => {
    setLocalTask(task);
    loadSubtasks();
    loadComments();
  }, [task.id]);

  async function loadSubtasks() {
    const { data } = await supabase
      .from('pipeline_subtasks')
      .select('*, assignee:profiles!pipeline_subtasks_assignee_id_fkey(id, full_name)')
      .eq('task_id', task.id)
      .order('sort_order');
    if (data) setSubtasks(data);
  }

  async function loadComments() {
    const { data } = await supabase
      .from('pipeline_comments')
      .select('*, author:profiles!pipeline_comments_user_id_fkey(full_name)')
      .eq('task_id', task.id)
      .order('created_at', { ascending: false });
    if (data) setComments(data);
  }

  async function updateField(field, value) {
    const updated = { ...localTask, [field]: value };
    setLocalTask(updated);
    await supabase.from('pipeline_tasks').update({ [field]: value }).eq('id', task.id);
    if (onUpdate) onUpdate(updated);
  }

  async function toggleSubtask(st) {
    const done = !st.completed;
    await supabase.from('pipeline_subtasks').update({
      completed: done,
      completed_at: done ? new Date().toISOString() : null,
    }).eq('id', st.id);
    loadSubtasks();
  }

  async function updateSubtaskAssignee(stId, userId) {
    await supabase.from('pipeline_subtasks').update({
      assignee_id: userId || null,
    }).eq('id', stId);
    loadSubtasks();
  }

  async function addComment() {
    if (!newComment.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('pipeline_comments').insert({
      task_id: task.id,
      user_id: user.id,
      content: newComment.trim(),
    });
    setNewComment('');
    loadComments();
  }

  const completed = subtasks.filter(s => s.completed).length;
  const total = subtasks.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div style={modal.overlay} onClick={onClose}>
      <div style={modal.content} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={modal.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: BRANCH_COLORS[branchSlug] || GREEN, flexShrink: 0,
            }} />
            <h2 style={modal.title}>{localTask.title}</h2>
          </div>
          <button onClick={onClose} style={modal.closeBtn}>&times;</button>
        </div>

        {/* Top bar */}
        <div style={modal.topBar}>
          <div style={modal.topBarItem}>
            <span style={modal.topBarLabel}>Status</span>
            <select value={localTask.status_id || ''} onChange={e => updateField('status_id', e.target.value)} style={modal.topBarSelect}>
              {statuses.filter(s => s.branch_slug === branchSlug).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div style={modal.topBarItem}>
            <span style={modal.topBarLabel}>Assignee</span>
            <select value={localTask.assignee_id || ''} onChange={e => updateField('assignee_id', e.target.value || null)} style={modal.topBarSelect}>
              <option value="">Unassigned</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>
          <div style={modal.topBarItem}>
            <span style={modal.topBarLabel}>Priority</span>
            <select value={localTask.priority || ''} onChange={e => updateField('priority', e.target.value || null)} style={{ ...modal.topBarSelect, color: PRIORITY_COLORS[localTask.priority] || WHITE }}>
              <option value="">None</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div style={modal.topBarItem}>
            <span style={modal.topBarLabel}>Due Date</span>
            <input type="date" value={localTask.due_date || ''} onChange={e => updateField('due_date', e.target.value || null)} style={{ ...modal.topBarSelect, color: dueColor(localTask.due_date) }} />
          </div>
          <div style={modal.topBarItem}>
            <span style={modal.topBarLabel}>Publish</span>
            <input type="date" value={localTask.publish_date || ''} onChange={e => updateField('publish_date', e.target.value || null)} style={modal.topBarSelect} />
          </div>
        </div>

        {/* Body */}
        <div style={modal.body}>
          {/* Left */}
          <div style={modal.left}>
            <div style={modal.section}>
              <h3 style={modal.sectionTitle}>Description</h3>
              <textarea
                value={localTask.description || ''}
                onChange={e => setLocalTask({ ...localTask, description: e.target.value })}
                onBlur={e => updateField('description', e.target.value)}
                placeholder="Add a description..."
                style={modal.textarea}
                rows={3}
              />
            </div>

            {/* Subtasks */}
            <div style={modal.section}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h3 style={modal.sectionTitle}>Subtasks</h3>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{completed}/{total} ({pct}%)</span>
              </div>
              <div style={{ height: 4, background: BORDER, borderRadius: 2, marginBottom: 12 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: GREEN, borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
              {subtasks.map(st => {
                const stColor = (st.color && st.color !== '#6B7280') ? st.color : SUBTASK_COLORS[branchSlug]?.[st.sort_order] || '#6B7280';
                return (
                  <div key={st.id} style={modal.subtaskRow}>
                    <div style={{ ...modal.subtaskDot, background: stColor, opacity: st.completed ? 0.4 : 1 }} />
                    <input type="checkbox" checked={st.completed} onChange={() => toggleSubtask(st)} style={{ accentColor: GREEN, cursor: 'pointer' }} />
                    <span style={{ flex: 1, fontSize: 13, color: st.completed ? '#6B7280' : WHITE, textDecoration: st.completed ? 'line-through' : 'none' }}>
                      {st.title}
                    </span>
                    <select
                      value={st.assignee_id || st.assignee?.id || ''}
                      onChange={e => updateSubtaskAssignee(st.id, e.target.value)}
                      style={modal.subtaskAssignee}
                    >
                      <option value="">--</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>

            {/* Comments */}
            <div style={modal.section}>
              <h3 style={modal.sectionTitle}>Activity</h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addComment()}
                  placeholder="Add a comment..."
                  style={modal.commentInput}
                />
                <button onClick={addComment} style={modal.commentBtn}>Post</button>
              </div>
              {comments.map(c => (
                <div key={c.id} style={modal.commentItem}>
                  <span style={{ fontWeight: 600, color: GREEN, fontSize: 12 }}>{c.author?.full_name || 'Unknown'}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{new Date(c.created_at).toLocaleString()}</span>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-light, #D1D5DB)' }}>{c.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right sidebar */}
          <div style={modal.right}>
            <div style={modal.section}>
              <h3 style={modal.sectionTitle}>{BRANCH_LABELS[branchSlug]} Fields</h3>
              <FieldRow label="Content Pillar">
                <select value={localTask.content_pillar || ''} onChange={e => updateField('content_pillar', e.target.value || null)} style={modal.fieldSelect}>
                  <option value="">None</option>
                  <option value="transformation">Transformation</option>
                  <option value="education">Education</option>
                  <option value="grocery">Grocery Haul</option>
                  <option value="challenge">Challenge</option>
                  <option value="experiment">Experiment</option>
                </select>
              </FieldRow>
              {(branchSlug === 'youtube' || branchSlug === 'short-form') && (
                <FieldRow label="Talent">
                  <input value={(localTask.talent || []).join(', ')} onChange={e => updateField('talent', e.target.value ? e.target.value.split(',').map(t => t.trim()) : [])} placeholder="Jacob, Ryan Snow" style={modal.fieldInput} />
                </FieldRow>
              )}
              <FieldRow label="Editor Assigned">
                <input value={localTask.editor_assigned || ''} onChange={e => updateField('editor_assigned', e.target.value || null)} placeholder="Editor name" style={modal.fieldInput} />
              </FieldRow>
              {branchSlug === 'youtube' && (
                <>
                  <FieldRow label="Content Tier">
                    <select value={localTask.content_tier || ''} onChange={e => updateField('content_tier', e.target.value || null)} style={modal.fieldSelect}>
                      <option value="">None</option>
                      <option value="flagship">Flagship</option>
                      <option value="standard">Standard</option>
                      <option value="quick-turn">Quick Turn</option>
                    </select>
                  </FieldRow>
                  <FieldRow label="Thumbnail Status">
                    <select value={localTask.thumbnail_status || ''} onChange={e => updateField('thumbnail_status', e.target.value || null)} style={modal.fieldSelect}>
                      <option value="">None</option>
                      <option value="not-started">Not Started</option>
                      <option value="in-progress">In Progress</option>
                      <option value="ready">Ready</option>
                      <option value="approved">Approved</option>
                    </select>
                  </FieldRow>
                  <FieldRow label="QC Score">
                    <input type="number" min={0} max={100} value={localTask.qc_score || ''} onChange={e => updateField('qc_score', e.target.value ? parseInt(e.target.value) : null)} placeholder="0-100" style={modal.fieldInput} />
                  </FieldRow>
                </>
              )}
              {branchSlug === 'short-form' && (
                <>
                  <FieldRow label="Platform">
                    <input value={(localTask.platform || []).join(', ')} onChange={e => updateField('platform', e.target.value ? e.target.value.split(',').map(t => t.trim()) : [])} placeholder="IG, TikTok, YT Shorts" style={modal.fieldInput} />
                  </FieldRow>
                  <FieldRow label="SOB">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input type="checkbox" checked={localTask.is_sob || false} onChange={e => updateField('is_sob', e.target.checked)} style={{ accentColor: PEACH }} />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>School of Bots</span>
                    </label>
                  </FieldRow>
                </>
              )}
              {branchSlug === 'ads-creative' && (
                <FieldRow label="First Pass">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={localTask.first_pass || false} onChange={e => updateField('first_pass', e.target.checked)} style={{ accentColor: GREEN }} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>First pass complete</span>
                  </label>
                </FieldRow>
              )}
            </div>
            <div style={modal.section}>
              <h3 style={modal.sectionTitle}>Links</h3>
              <FieldRow label="Script">
                <input value={localTask.script_link || ''} onChange={e => updateField('script_link', e.target.value || null)} placeholder="Google Doc URL" style={modal.fieldInput} />
              </FieldRow>
              <FieldRow label="Drive Folder">
                <input value={localTask.drive_folder_link || ''} onChange={e => updateField('drive_folder_link', e.target.value || null)} placeholder="Drive folder URL" style={modal.fieldInput} />
              </FieldRow>
              <FieldRow label="Video Link">
                <input value={localTask.video_link || ''} onChange={e => updateField('video_link', e.target.value || null)} placeholder="YouTube URL" style={modal.fieldInput} />
              </FieldRow>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {localTask.script_link && <a href={localTask.script_link} target="_blank" rel="noopener" style={modal.linkPill}>Script ↗</a>}
                {localTask.drive_folder_link && <a href={localTask.drive_folder_link} target="_blank" rel="noopener" style={modal.linkPill}>Drive ↗</a>}
                {localTask.video_link && <a href={localTask.video_link} target="_blank" rel="noopener" style={modal.linkPill}>Video ↗</a>}
              </div>
            </div>
            <div style={modal.section}>
              <FieldRow label="Backlog Week">
                <input type="number" min={1} value={localTask.backlog_week || ''} onChange={e => updateField('backlog_week', e.target.value ? parseInt(e.target.value) : null)} placeholder="Week #" style={modal.fieldInput} />
              </FieldRow>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 100 }}>{label}</span>
      <div style={{ flex: 1, maxWidth: 180 }}>{children}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MY TASKS PAGE
   ══════════════════════════════════════════════════════════ */
export default function MyTasks() {
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [editorTasks, setEditorTasks] = useState([]);
  const [assignedSubtasks, setAssignedSubtasks] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [members, setMembers] = useState([]);
  const [viewFilter, setViewFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => { init(); }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    if (profile) setUserName(profile.full_name || '');
    const [sRes, mRes] = await Promise.all([
      supabase.from('pipeline_statuses').select('*').order('sort_order'),
      supabase.from('profiles').select('id, full_name'),
    ]);
    if (sRes.data) setStatuses(sRes.data);
    if (mRes.data) setMembers(mRes.data);
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
    if (userId) loadAssignedSubtasks(userId);
  }

  function handleTaskUpdate(updated) {
    setAssignedTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
    setEditorTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
    setSelectedTask(prev => prev && prev.id === updated.id ? { ...prev, ...updated } : prev);
  }

  async function openTaskById(taskId) {
    const { data } = await supabase
      .from('pipeline_tasks')
      .select('*, status:pipeline_statuses(name, branch_slug, sort_order)')
      .eq('id', taskId)
      .single();
    if (data) setSelectedTask(data);
  }

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

  const filteredTasks = useMemo(() => {
    let items = [];
    if (viewFilter === 'all' || viewFilter === 'tasks') items = [...items, ...assignedTasks.map(t => ({ ...t, _type: 'assigned' }))];
    if (viewFilter === 'all' || viewFilter === 'editor') items = [...items, ...editorTasks.map(t => ({ ...t, _type: 'editor' }))];
    items = [...new Map(items.map(t => [t.id + t._type, t])).values()];
    if (branchFilter !== 'all') items = items.filter(t => t.branch_slug === branchFilter);
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

  const tasksByBranch = useMemo(() => {
    const groups = {};
    filteredTasks.forEach(t => {
      const branch = t.branch_slug || 'unknown';
      if (!groups[branch]) groups[branch] = [];
      groups[branch].push(t);
    });
    return groups;
  }, [filteredTasks]);

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
    return <div style={{ padding: '60px 32px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading your tasks...</div>;
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto', fontFamily: 'Outfit, Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: WHITE, margin: '0 0 4px' }}>My Tasks</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
          {userName ? `Everything assigned to ${userName.split(' ')[0]}` : 'Everything assigned to you'}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="Total Tasks" value={stats.totalTasks} color={WHITE} />
        <StatCard label="Overdue" value={stats.overdue} color={stats.overdue > 0 ? '#EF4444' : '#6B7280'} />
        <StatCard label="Due Today" value={stats.dueToday} color={stats.dueToday > 0 ? '#F59E0B' : '#6B7280'} />
        <StatCard label="Open Subtasks" value={stats.openSubtasks} color={stats.openSubtasks > 0 ? '#3B82F6' : '#6B7280'} />
        <StatCard label="Subtasks Done" value={`${stats.totalSubtasks - stats.openSubtasks}/${stats.totalSubtasks}`} color={GREEN} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={styles.toggleGroup}>
          {[{ key: 'all', label: 'All' }, { key: 'tasks', label: 'Tasks' }, { key: 'subtasks', label: 'Subtasks' }, { key: 'editor', label: 'Editor' }].map(f => (
            <button key={f.key} onClick={() => setViewFilter(f.key)} style={{ ...styles.toggleBtn, ...(viewFilter === f.key ? styles.toggleActive : {}) }}>{f.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setBranchFilter('all')} style={{ ...styles.filterBtn, ...(branchFilter === 'all' ? { background: '#374151', color: WHITE } : {}) }}>All</button>
          {Object.entries(BRANCH_LABELS).map(([slug, label]) => (
            <button key={slug} onClick={() => setBranchFilter(slug)} style={{ ...styles.filterBtn, ...(branchFilter === slug ? { background: BRANCH_COLORS[slug] + '33', color: BRANCH_COLORS[slug], borderColor: BRANCH_COLORS[slug] } : {}) }}>{label}</button>
          ))}
        </div>
        {(viewFilter === 'all' || viewFilter === 'subtasks') && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginLeft: 'auto' }}>
            <input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} style={{ accentColor: GREEN }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Show completed subtasks</span>
          </label>
        )}
      </div>

      {/* Tasks */}
      {(viewFilter === 'all' || viewFilter === 'tasks' || viewFilter === 'editor') && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={styles.sectionHeader}>
            {viewFilter === 'editor' ? '🎬 Editor Assignments' : '📋 Assigned Tasks'}
            <span style={styles.count}>{filteredTasks.length}</span>
          </h2>
          {filteredTasks.length === 0 && (
            <div style={styles.emptyState}>{viewFilter === 'editor' ? 'No editor assignments' : 'No tasks assigned to you'}</div>
          )}
          {Object.entries(tasksByBranch).map(([branch, tasks]) => (
            <div key={branch} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: BRANCH_COLORS[branch] || '#6B7280' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: BRANCH_COLORS[branch] || '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{BRANCH_LABELS[branch] || branch}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({tasks.length})</span>
              </div>
              {tasks.map(task => {
                const due = dueLabel(task.due_date);
                return (
                  <div
                    key={task.id + (task._type || '')}
                    onClick={() => setSelectedTask(task)}
                    style={styles.taskCard}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = BRANCH_COLORS[task.branch_slug] || GREEN; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0, background: PRIORITY_COLORS[task.priority] || '#374151' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: WHITE }}>{task.title}</span>
                          {task._type === 'editor' && <span style={styles.editorBadge}>Editor</span>}
                          {task.is_sob && <span style={styles.sobBadge}>SOB</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{task.status?.name || getStatusName(task.status_id)}</span>
                          {task.priority && <span style={{ fontSize: 11, color: PRIORITY_COLORS[task.priority], fontWeight: 500 }}>{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>}
                          {task.content_pillar && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{task.content_pillar}</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      {due && <span style={{ fontSize: 11, fontWeight: 600, color: due.color }}>{due.text}</span>}
                      {task.publish_date && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Publish: {parseLocal(task.publish_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                      <div style={{ display: 'flex', gap: 4 }}>
                        {task.script_link && <a href={task.script_link} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} style={styles.linkPill}>Script</a>}
                        {task.drive_folder_link && <a href={task.drive_folder_link} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} style={styles.linkPill}>Drive</a>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Subtasks */}
      {(viewFilter === 'all' || viewFilter === 'subtasks') && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={styles.sectionHeader}>
            ☑️ Assigned Subtasks
            <span style={styles.count}>{filteredSubtasks.length}</span>
          </h2>
          {filteredSubtasks.length === 0 && (
            <div style={styles.emptyState}>{showCompleted ? 'No subtasks assigned to you' : 'All subtasks complete -- nice work'}</div>
          )}
          {subtasksByTask.map(({ task, subtasks }) => {
            const branchSlug = task?.branch_slug || 'youtube';
            return (
              <div key={task?.id || 'unknown'} style={{ marginBottom: 16 }}>
                <div
                  onClick={() => task?.id && openTaskById(task.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
                    padding: '6px 12px', background: CARD_LIGHT, borderRadius: 6,
                    borderLeft: `3px solid ${BRANCH_COLORS[branchSlug] || '#6B7280'}`,
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = BORDER; }}
                  onMouseLeave={e => { e.currentTarget.style.background = CARD_LIGHT; }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: WHITE }}>{task?.title || 'Unknown Task'}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{task?.status?.name || ''}</span>
                  {task?.due_date && (() => { const d = dueLabel(task.due_date); return d ? <span style={{ fontSize: 10, fontWeight: 600, color: d.color, marginLeft: 'auto' }}>{d.text}</span> : null; })()}
                </div>
                {subtasks.map(st => {
                  const stColor = (st.color && st.color !== '#6B7280') ? st.color : SUBTASK_COLORS[branchSlug]?.[st.sort_order] || '#6B7280';
                  return (
                    <div key={st.id} style={styles.subtaskRow}>
                      <div style={{ ...styles.subtaskDot, background: stColor, opacity: st.completed ? 0.4 : 1 }} />
                      <input type="checkbox" checked={st.completed} onChange={() => toggleSubtask(st)} style={{ accentColor: GREEN, cursor: 'pointer' }} />
                      <span style={{ flex: 1, fontSize: 13, color: st.completed ? '#6B7280' : WHITE, textDecoration: st.completed ? 'line-through' : 'none' }}>{st.title}</span>
                      {st.completed && st.completed_at && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(st.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          members={members}
          statuses={statuses}
          onUpdate={handleTaskUpdate}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 18px', minWidth: 100, flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

/* ── modal styles ── */
const modal = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 40, overflowY: 'auto' },
  content: { background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, width: '90%', maxWidth: 960, maxHeight: 'calc(100vh - 80px)', overflowY: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${BORDER}` },
  title: { fontSize: 18, fontWeight: 700, color: WHITE, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  closeBtn: { background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: 24, cursor: 'pointer', padding: '4px 8px', lineHeight: 1 },
  topBar: { display: 'flex', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${BORDER}`, flexWrap: 'wrap', background: CARD },
  topBarItem: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 120 },
  topBarLabel: { fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  topBarSelect: { background: CARD_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 4, color: WHITE, padding: '4px 8px', fontSize: 12, outline: 'none' },
  body: { display: 'flex', gap: 0, minHeight: 400 },
  left: { flex: 1, padding: 20, borderRight: `1px solid ${BORDER}`, overflowY: 'auto', maxHeight: 'calc(100vh - 240px)' },
  right: { width: 300, padding: 20, overflowY: 'auto', maxHeight: 'calc(100vh - 240px)' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  textarea: { width: '100%', background: CARD_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 6, color: WHITE, padding: 10, fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'Outfit, Arial, sans-serif' },
  subtaskRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: `1px solid ${BORDER}22` },
  subtaskDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  subtaskAssignee: { width: 'auto', minWidth: '100px', padding: '2px 4px', background: CARD_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 4, color: 'var(--text-secondary)', fontSize: 11, outline: 'none', cursor: 'pointer', flexShrink: 0 },
  commentInput: { flex: 1, background: CARD_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 6, color: WHITE, padding: '8px 10px', fontSize: 13, outline: 'none', fontFamily: 'Outfit, Arial, sans-serif' },
  commentBtn: { background: GREEN, border: 'none', borderRadius: 6, color: '#000', padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  commentItem: { padding: '8px 0', borderBottom: `1px solid ${BORDER}22` },
  fieldSelect: { width: '100%', background: CARD_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 4, color: WHITE, padding: '4px 6px', fontSize: 12, outline: 'none' },
  fieldInput: { width: '100%', background: CARD_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 4, color: WHITE, padding: '4px 6px', fontSize: 12, outline: 'none', fontFamily: 'Outfit, Arial, sans-serif' },
  linkPill: { display: 'inline-block', background: GREEN + '15', color: GREEN, border: `1px solid ${GREEN}33`, borderRadius: 4, padding: '3px 8px', fontSize: 11, fontWeight: 600, textDecoration: 'none', cursor: 'pointer' },
};

/* ── page styles ── */
const styles = {
  toggleGroup: { display: 'flex', background: CARD_LIGHT, borderRadius: 6, border: `1px solid ${BORDER}`, overflow: 'hidden' },
  toggleBtn: { background: 'transparent', border: 'none', color: 'var(--text-secondary)', padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 500 },
  toggleActive: { background: GREEN + '22', color: GREEN },
  filterBtn: { background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 6, color: 'var(--text-secondary)', padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 500 },
  sectionHeader: { fontSize: 15, fontWeight: 700, color: WHITE, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottom: `1px solid ${BORDER}` },
  count: { fontSize: 12, fontWeight: 600, color: GREEN, background: GREEN + '15', borderRadius: 10, padding: '2px 8px' },
  emptyState: { padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, background: CARD, borderRadius: 10, border: `1px solid ${BORDER}` },
  taskCard: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', background: CARD, border: `1px solid ${BORDER}`,
    borderRadius: 8, marginBottom: 6, gap: 16,
    transition: 'border-color 0.15s', cursor: 'pointer',
  },
  editorBadge: { fontSize: 9, fontWeight: 700, color: '#F59E0B', background: '#F59E0B22', border: '1px solid #F59E0B44', borderRadius: 4, padding: '2px 6px', textTransform: 'uppercase' },
  sobBadge: { fontSize: 9, fontWeight: 700, color: PEACH, background: PEACH + '22', border: `1px solid ${PEACH}44`, borderRadius: 4, padding: '2px 6px' },
  linkPill: { fontSize: 10, fontWeight: 600, color: GREEN, background: GREEN + '12', borderRadius: 3, padding: '2px 6px', textDecoration: 'none' },
  subtaskRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 24px', borderBottom: `1px solid ${BORDER}11` },
  subtaskDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
};
